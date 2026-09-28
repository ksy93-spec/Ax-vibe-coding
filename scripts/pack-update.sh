#!/usr/bin/env bash
# 킷에서 바뀐 파일만 담은 업데이트 zip 을 만듭니다. 사내에 이미 킷을 한 번 통째로 옮긴 뒤에 씁니다.
#
# 사용법: scripts/pack-update.sh <킷이름> <이전 커밋> [새 커밋, 기본 HEAD]
#   예) scripts/pack-update.sh mi-portal d46a3c8
#
# 결과
#   updates/<킷>/<킷>_update_<이전 판>_to_<새 판>.zip
#   updates/<킷>/README.md 의 목록에 한 줄 추가
#
# zip 안에는 바뀐 파일(킷 폴더 기준 경로)과 _update/ 폴더가 들어갑니다.
#   _update/UPDATE.md   무엇이 바뀌었는지, 적용 순서
#   _update/finish.bat  지워진 파일 삭제, 판 번호 확인과 갱신
#   _update/VERSION     새 판 번호 (finish.bat 이 확인 후 킷의 VERSION 으로 복사)
#
# 파일 내용은 작업 폴더가 아니라 <새 커밋> 에서 꺼냅니다. 커밋하지 않은 수정은 들어가지 않습니다.
# 판 번호는 킷 폴더의 VERSION 파일에서 읽습니다. 킷 파일을 바꿀 때마다 VERSION 도 올리세요.
set -euo pipefail

KIT="${1:?사용법: scripts/pack-update.sh <킷이름> <이전 커밋> [새 커밋]}"
FROM_REF="${2:?이전 커밋을 주세요. 사내에 마지막으로 옮긴 판의 커밋입니다.}"
TO_REF="${3:-HEAD}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

KP="kits/$KIT"
FROM="$(git rev-parse --short "$FROM_REF^{commit}")"
TO="$(git rev-parse --short "$TO_REF^{commit}")"
git cat-file -e "$TO:$KP" 2>/dev/null || { echo "$TO 에 $KP 가 없습니다." >&2; exit 1; }

read_version() { git show "$1:$KP/VERSION" 2>/dev/null | tr -d '\r\n ' || true; }
FROM_VER="$(read_version "$FROM")"
TO_VER="$(read_version "$TO")"
[ -n "$TO_VER" ] || { echo "$TO 의 $KP/VERSION 이 비어 있습니다. 판 번호를 먼저 적으세요." >&2; exit 1; }
[ "$FROM_VER" != "$TO_VER" ] || { echo "VERSION 이 그대로입니다 ($TO_VER). 올린 뒤 커밋하세요." >&2; exit 1; }
FROM_LABEL="${FROM_VER:-base-$FROM}"

CHANGES="$(git diff --no-renames --name-status "$FROM" "$TO" -- "$KP")"
[ -n "$CHANGES" ] || { echo "$FROM 과 $TO 사이에 $KP 변경이 없습니다." >&2; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# 추가, 수정된 파일을 새 커밋에서 꺼냅니다. git archive 는 .gitattributes 의 줄바꿈 규칙(.bat 은 CRLF)을 적용합니다.
# VERSION 은 finish.bat 이 확인한 뒤에 바꾸도록 _update 쪽에만 넣습니다.
KEEP="$(printf '%s\n' "$CHANGES" | awk -F'\t' -v kp="$KP/VERSION" '$1 != "D" && $2 != kp { print $2 }')"
mkdir -p "$WORK/tree"
if [ -n "$KEEP" ]; then
  printf '%s\n' "$KEEP" | tr '\n' '\0' | xargs -0 git archive --format=tar "$TO" -- | tar -x -C "$WORK/tree"
fi
mkdir -p "$WORK/tree/$KP/_update"

python3 - "$WORK/tree/$KP/_update" "$KIT" "$FROM" "$TO" "$FROM_VER" "$TO_VER" "$KP" <<'PY'
import subprocess, sys, datetime
out, kit, frm, to, from_ver, to_ver, kp = sys.argv[1:]
diff = subprocess.run(["git", "diff", "--no-renames", "--name-status", frm, to, "--", kp],
                      capture_output=True, text=True, check=True).stdout.splitlines()
rel = lambda p: p[len(kp) + 1:]
added = [rel(p) for s, p in (l.split("\t", 1) for l in diff) if s == "A" and rel(p) != "VERSION"]
modified = [rel(p) for s, p in (l.split("\t", 1) for l in diff) if s == "M" and rel(p) != "VERSION"]
deleted = [rel(p) for s, p in (l.split("\t", 1) for l in diff) if s == "D"]
bad = [p for p in added + modified + deleted if not p.isascii() or '"' in p or "%" in p]
if bad:
    sys.exit("경로에 ASCII 가 아닌 문자나 \" % 가 있어 배치 파일로 다룰 수 없습니다: " + ", ".join(bad))
log = subprocess.run(["git", "log", "--reverse", "--format=%h %s", f"{frm}..{to}", "--", kp],
                     capture_output=True, text=True, check=True).stdout.splitlines()
reinstall = any(p in ("package.json", "package-lock.json") for p in added + modified + deleted)
from_label = from_ver or "없음 (VERSION 파일이 없는 처음 판)"

def group(title, items):
    # npm-cache 는 파일 이름이 해시라 목록 대신 개수만 적습니다.
    cache = [p for p in items if p.startswith("npm-cache/")]
    rest = [p for p in items if not p.startswith("npm-cache/")]
    lines = [f"### {title} ({len(items)}개)", ""]
    lines += [f"- `{p}`" for p in rest]
    if cache:
        lines.append(f"- `npm-cache/` 안의 파일 {len(cache)}개")
    if not items:
        lines.append("- 없음")
    return lines + [""]

md = [
    f"# {kit} 업데이트 {to_ver}",
    "",
    "| 항목 | 값 |",
    "| --- | --- |",
    f"| 적용 전 판 | {from_label} |",
    f"| 적용 후 판 | {to_ver} |",
    f"| 커밋 | {frm} → {to} |",
    f"| 만든 날 | {datetime.date.today().isoformat()} |",
    f"| install.bat 다시 실행 | {'필요 (package.json 또는 package-lock.json 이 바뀜)' if reinstall else '필요 없음'} |",
    "",
    "## 적용 순서",
    "",
    f"1. 킷 폴더의 `VERSION` 파일을 메모장으로 열어 `{from_ver}` 인지 확인합니다." if from_ver else
    "1. 킷 폴더에 `VERSION` 파일이 없는지 확인합니다. 있으면 이 업데이트가 아니라 더 뒤의 업데이트를 받아야 합니다.",
    "   다르면 중간 업데이트를 빠뜨린 것입니다. `updates/README.md` 목록에서 빠진 것부터 순서대로 적용하세요.",
    f"2. 이 zip 을 킷 폴더(`{kit}`) 안에 풉니다. 같은 이름의 파일은 덮어씁니다.",
    "3. `_update\\finish.bat` 을 실행합니다. 지워진 파일을 정리하고 `VERSION` 을 새 판으로 바꿉니다.",
    "4. " + ("`install.bat` 을 실행합니다. 패키지가 바뀌었습니다." if reinstall else "`build.bat` 을 실행해 검사와 빌드가 통과하는지 봅니다."),
    "",
    "`_update` 폴더는 적용 후 지워도 됩니다. 다음 업데이트가 같은 자리에 새로 들어옵니다.",
    "",
    "## 이번에 바뀐 내용",
    "",
    *[f"- {l}" for l in log],
    "",
    "## 파일 목록",
    "",
    *group("추가", added),
    *group("수정", modified),
    *group("삭제 (finish.bat 이 지움)", deleted),
]
open(f"{out}/UPDATE.md", "w", encoding="utf-8", newline="\n").write("\n".join(md))
open(f"{out}/VERSION", "w", encoding="utf-8", newline="\n").write(to_ver + "\n")

bat = [
    "@echo off",
    "chcp 65001 >nul",
    f"REM {kit} 업데이트 {to_ver} 마무리. zip 을 킷 폴더에 푼 뒤 실행합니다.",
    'cd /d "%~dp0.."',
    'if not exist "package.json" (',
    "  echo 킷 폴더가 아닙니다. zip 을 킷 폴더 안에 풀었는지 확인하세요.",
    "  pause",
    "  exit /b 1",
    ")",
    'set "CUR="',
    # set /p 는 LF 로 끝나는 파일에서 줄 끝을 잘못 읽을 수 있어 for /f 로 첫 줄을 읽습니다.
    'if exist "VERSION" for /f "usebackq delims=" %%v in ("VERSION") do if not defined CUR set "CUR=%%v"',
]
if from_ver:
    bat += [
        f'if not "%CUR%"=="{from_ver}" (',
        f"  echo 지금 판은 [%CUR%] 인데 이 업데이트는 {from_ver} 에 적용하는 것입니다.",
        "  echo 중간 업데이트를 빠뜨렸습니다. updates\\README.md 목록에서 빠진 것부터 순서대로 풀고 다시 실행하세요.",
        "  pause",
        "  exit /b 1",
        ")",
    ]
else:
    bat += [
        'if defined CUR (',
        "  echo 이미 [%CUR%] 판입니다. 이 업데이트는 VERSION 파일이 없는 처음 판에 적용하는 것입니다.",
        "  pause",
        "  exit /b 1",
        ")",
    ]
bat += [f'if exist "{p.replace("/", chr(92))}" del /f /q "{p.replace("/", chr(92))}"' for p in deleted]
bat += [
    'copy /y "_update\\VERSION" "VERSION" >nul',
    f"echo {len(deleted)}개 파일을 지우고 판을 {to_ver} 로 바꿨습니다.",
    "echo 다음: " + ("install.bat 을 실행하세요. 패키지가 바뀌었습니다." if reinstall else "build.bat 으로 검사와 빌드를 확인하세요."),
    "pause",
]
open(f"{out}/finish.bat", "w", encoding="utf-8", newline="\r\n").write("\n".join(bat) + "\n")
print(f"{len(added)} {len(modified)} {len(deleted)} {'yes' if reinstall else 'no'}")
PY

OUTDIR="$ROOT/updates/$KIT"
mkdir -p "$OUTDIR"
NAME="${KIT}_update_${FROM_LABEL}_to_${TO_VER}.zip"
ARCHIVE="$OUTDIR/$NAME"
rm -f "$ARCHIVE"
( cd "$WORK/tree/$KP" && zip -qrX "$ARCHIVE" . )

SIZE="$(numfmt --to=iec --suffix=B "$(stat -c%s "$ARCHIVE")")"
SHA="$(sha256sum "$ARCHIVE" | cut -d' ' -f1)"
REINSTALL="$(grep -q '다시 실행 | 필요 (' "$WORK/tree/$KP/_update/UPDATE.md" && echo 필요 || echo -)"

INDEX="$OUTDIR/README.md"
if [ ! -f "$INDEX" ]; then
  cat > "$INDEX" <<EOF
# $KIT 업데이트

킷을 한 번 통째로 옮긴 뒤에는 여기 zip 만 받아서 적용합니다. 위에서부터 순서대로 적용합니다.
GitHub 에서 zip 파일을 누르고 오른쪽 위 다운로드 단추(Download raw file)로 받으면 저장소 전체를 받지 않아도 됩니다.

지금 가진 판은 킷 폴더의 \`VERSION\` 파일에 적혀 있습니다. 파일이 없으면 처음 판입니다.
적용 방법은 zip 안의 \`_update/UPDATE.md\` 에 있습니다. 요약하면 킷 폴더 안에 풀고 \`_update\\finish.bat\` 실행입니다.

| 적용 전 판 | 적용 후 판 | 파일 | 크기 | install.bat 다시 | SHA256 |
| --- | --- | --- | --- | --- | --- |
EOF
fi
python3 - "$INDEX" "$NAME" <<'PY'
import sys
p, name = sys.argv[1], sys.argv[2]
lines = open(p, encoding="utf-8").read().splitlines()
lines = [l for l in lines if f"[{name}]" not in l]
open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
PY
echo "| ${FROM_VER:-없음 (처음 판)} | $TO_VER | [$NAME]($NAME) | $SIZE | $REINSTALL | \`${SHA:0:16}\` |" >> "$INDEX"

echo "생성: $ARCHIVE"
echo "크기: $SIZE, SHA256: $SHA"
echo "적용 전 $FROM_LABEL ($FROM) → 적용 후 $TO_VER ($TO)"
echo "목록: $INDEX"
