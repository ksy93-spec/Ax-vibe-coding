#!/usr/bin/env bash
# 킷에서 바뀐 파일만 담은 업데이트 zip 을 만듭니다. 사내에 이미 킷을 한 번 통째로 옮긴 뒤에 씁니다.
#
# 사용법: scripts/pack-update.sh <킷이름> <이전 커밋> [새 커밋, 기본 HEAD]
#   예) scripts/pack-update.sh mi-portal 67024bd
#
# 결과
#   updates/<킷>/<킷>-<새 판>.zip   (이름을 짧게 둡니다. 윈도 경로 260자 제한 때문)
#   updates/<킷>/README.md 의 목록에 한 줄 추가
#
# zip 구조. 사용자는 zip 을 어디에 풀든 apply.bat 만 실행하면 됩니다.
#   apply.bat   킷 폴더를 찾아 판 번호 확인, files 복사, 지워진 파일 정리, VERSION 갱신
#   UPDATE.md   무엇이 바뀌었는지
#   files/      바뀐 파일 (킷 폴더 기준 경로)
#
# 파일 내용은 작업 폴더가 아니라 <새 커밋> 에서 꺼냅니다. 커밋하지 않은 수정은 들어가지 않습니다.
# 판 번호는 킷 폴더의 VERSION 파일에서 읽습니다. 킷 파일을 바꿀 때마다 VERSION 도 올리세요.
# 바뀐 파일이 40MB 를 넘으면 zip 을 만들지 않고 목록에 "통째로 다시 받기" 로 적습니다.
set -euo pipefail

KIT="${1:?사용법: scripts/pack-update.sh <킷이름> <이전 커밋> [새 커밋]}"
FROM_REF="${2:?이전 커밋을 주세요. 사내에 마지막으로 옮긴 판의 커밋입니다.}"
TO_REF="${3:-HEAD}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

KP="kits/$KIT"
[ -f "$KP/MANIFEST.md" ] || { echo "$KP/MANIFEST.md 가 없습니다. apply.bat 이 킷 폴더를 알아보는 표지로 씁니다." >&2; exit 1; }
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
# VERSION 은 apply.bat 이 판을 확인한 뒤에 씁니다.
KEEP="$(printf '%s\n' "$CHANGES" | awk -F'\t' -v kp="$KP/VERSION" '$1 != "D" && $2 != kp { print $2 }')"
mkdir -p "$WORK/tree"
if [ -n "$KEEP" ]; then
  printf '%s\n' "$KEEP" | tr '\n' '\0' | xargs -0 git archive --format=tar "$TO" -- | tar -x -C "$WORK/tree"
fi
BYTES=0
if [ -n "$KEEP" ]; then
  BYTES="$(printf '%s\n' "$KEEP" | while read -r f; do git cat-file -s "$TO:$f"; done | awk '{s+=$1} END {print s+0}')"
fi
OUTDIR="$ROOT/updates/$KIT"
mkdir -p "$OUTDIR"
INDEX="$OUTDIR/README.md"
if [ ! -f "$INDEX" ]; then
  cat > "$INDEX" <<EOF
# $KIT 업데이트

킷을 한 번 통째로 옮긴 뒤에는 여기 zip 만 받아서 적용합니다. 위에서부터 순서대로 적용합니다.
GitHub 에서 zip 파일을 누르고 다운로드 단추(Download raw file)로 받으면 저장소 전체를 받지 않아도 됩니다.

적용 방법: zip 을 아무 곳에나 풀고 안의 \`apply.bat\` 을 실행합니다. 킷 폴더를 찾지 못하면
탐색기에서 킷 폴더를 창으로 끌어다 놓으라고 묻습니다. 판이 맞지 않으면 아무것도 바꾸지 않고 멈춥니다.

지금 가진 판은 킷 폴더의 \`VERSION\` 파일에 적혀 있습니다. 파일이 없으면 처음 판입니다.

| 적용 전 판 | 적용 후 판 | 파일 | 크기 | install.bat 다시 | SHA256 |
| --- | --- | --- | --- | --- | --- |
EOF
fi

# 목록 표의 마지막 줄 바로 뒤에 넣습니다. 표 아래에 안내 문단이 있어도 표가 깨지지 않습니다.
# 둘째 인자가 든 줄은 먼저 지웁니다 (같은 판을 다시 만들 때).
add_row() {
  python3 - "$INDEX" "$1" "$2" <<'PY'
import sys
p, row, key = sys.argv[1:]
lines = [l for l in open(p, encoding="utf-8").read().splitlines() if key not in l]
last = max(i for i, l in enumerate(lines) if l.startswith("|"))
lines.insert(last + 1, row)
open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
PY
}

if [ "$BYTES" -gt 41943040 ]; then
  add_row "| ${FROM_VER:-없음 (처음 판)} | $TO_VER | 통째로 다시 받기 ($((BYTES / 1048576))MB 가 바뀌어 zip 을 만들지 않음) | - | 필요 | - |" "| $TO_VER | 통째로"
  echo "바뀐 파일이 $((BYTES / 1048576))MB 라 zip 을 만들지 않았습니다. 목록에 '통째로 다시 받기' 로 적었습니다."
  exit 0
fi

mkdir -p "$WORK/pkg/files"
if [ -d "$WORK/tree/$KP" ]; then cp -a "$WORK/tree/$KP/." "$WORK/pkg/files/"; fi
TODIRS="$(git ls-tree -r -d --name-only "$TO" -- "$KP")"

python3 - "$WORK/pkg" "$KIT" "$FROM" "$TO" "$FROM_VER" "$TO_VER" "$KP" "$TODIRS" <<'PY'
import subprocess, sys, datetime
out, kit, frm, to, from_ver, to_ver, kp, todirs = sys.argv[1:]
diff = subprocess.run(["git", "diff", "--no-renames", "--name-status", frm, to, "--", kp],
                      capture_output=True, text=True, check=True).stdout.splitlines()
rel = lambda p: p[len(kp) + 1:]
rows = [l.split("\t", 1) for l in diff]
added = [rel(p) for s, p in rows if s == "A" and rel(p) != "VERSION"]
modified = [rel(p) for s, p in rows if s == "M" and rel(p) != "VERSION"]
deleted = [rel(p) for s, p in rows if s == "D"]
bad = [p for p in added + modified + deleted if not p.isascii() or any(c in p for c in '"%^&!')]
if bad:
    sys.exit("경로에 ASCII 가 아닌 문자나 배치 파일 특수문자가 있습니다: " + ", ".join(bad))
long_ = [p for p in added + modified if len(p) > 100]
if long_:
    sys.exit("킷 기준 경로가 100자를 넘는 파일이 있습니다. 윈도에서 풀 때 260자 제한에 걸립니다: " + ", ".join(long_))

# 새 판에 아예 없어진 폴더는 폴더째 지우고, 나머지는 파일 단위로 지웁니다.
live = {rel(d) for d in todirs.splitlines() if d.startswith(kp + "/")}
gone_dirs, del_files = set(), []
for p in deleted:
    parts = p.split("/")[:-1]
    top = next(("/".join(parts[:i]) for i in range(1, len(parts) + 1) if "/".join(parts[:i]) not in live), None)
    if top:
        gone_dirs.add(top)
    else:
        del_files.append(p)
gone_dirs = sorted(d for d in gone_dirs if not any(d.startswith(o + "/") for o in gone_dirs))

log = subprocess.run(["git", "log", "--reverse", "--format=%h %s", f"{frm}..{to}", "--", kp],
                     capture_output=True, text=True, check=True).stdout.splitlines()
reinstall = any(p in ("package.json", "package-lock.json") for p in added + modified + deleted)
from_label = from_ver or "없음 (VERSION 파일이 없는 처음 판)"

def group(title, items):
    # vendor 는 패키지 파일이라 이름만 나열하면 길어져 개수로 적습니다.
    ven = [p for p in items if p.startswith("vendor/")]
    rest = [p for p in items if not p.startswith("vendor/")]
    lines = [f"### {title} ({len(items)}개)", ""] + [f"- `{p}`" for p in rest]
    if ven:
        lines.append(f"- `vendor/` 패키지 {len(ven)}개")
    if not items:
        lines.append("- 없음")
    return lines + [""]

win = lambda p: p.replace("/", "\\")
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
    "## 적용 방법",
    "",
    "1. 이 zip 을 아무 곳에나 풉니다. 바탕화면이나 다운로드 폴더도 됩니다.",
    "2. 풀린 폴더의 `apply.bat` 을 실행합니다.",
    f"   `{kit}` 폴더를 자동으로 찾지 못하면, 탐색기에서 `{kit}` 폴더를 검은 창으로 끌어다 놓고 Enter 를 누릅니다.",
    "3. 판 번호가 맞으면 파일을 복사하고, 지워진 파일을 정리하고, `VERSION` 을 올립니다.",
    "   판이 맞지 않으면 아무것도 바꾸지 않고 멈춥니다. `updates/README.md` 목록에서 빠진 업데이트부터 순서대로 적용하세요.",
    "4. " + ("`install.bat` 을 실행합니다. 패키지가 바뀌었습니다." if reinstall else "`build.bat` 을 실행해 검사와 빌드가 통과하는지 봅니다."),
    "",
    "적용이 끝나면 풀었던 폴더는 지워도 됩니다.",
    "",
    "## 이번에 바뀐 내용",
    "",
    *[f"- {l}" for l in log],
    "",
    "## 파일 목록",
    "",
    *group("추가", added),
    *group("수정", modified),
    *group("삭제", deleted),
]
open(f"{out}/UPDATE.md", "w", encoding="utf-8", newline="\n").write("\n".join(md) + "\n")

check_ver = (
    [f'if not "%CUR%"=="{from_ver}" goto wrongver'] if from_ver else ['if defined CUR goto wrongver']
)
expect = from_ver or "(VERSION 파일 없음)"
bat = [
    "@echo off",
    "chcp 65001 >nul",
    "setlocal",
    f"REM {kit} 업데이트 {to_ver}. zip 을 아무 곳에나 푼 뒤 이 파일을 실행합니다.",
    f"REM 킷 폴더를 끌어다 놓아 실행해도 됩니다: apply.bat <{kit} 폴더>",
    'set "KIT="',
    'if not "%~1"=="" call :try "%~1"',
    'call :try "%~dp0.."',
    'call :try "%~dp0..\\.."',
    f'call :try "%~dp0..\\{kit}"',
    f'call :try "%~dp0..\\..\\{kit}"',
    "if defined KIT goto found",
    f"echo {kit} 폴더를 찾지 못했습니다.",
    f"echo 탐색기에서 {kit} 폴더를 이 창으로 끌어다 놓고 Enter 를 누르세요.",
    'set /p "ASK=폴더: "',
    'if not defined ASK goto notkit',
    'set "ASK=%ASK:"=%"',
    'call :try "%ASK%"',
    "if not defined KIT goto notkit",
    ":found",
    # 끝의 \ 는 robocopy 가 따옴표를 글자로 읽게 만들어 떼어 냅니다.
    'if "%KIT:~-1%"=="\\" set "KIT=%KIT:~0,-1%"',
    f"echo 킷 폴더: %KIT%",
    'set "CUR="',
    # set /p 는 LF 로 끝나는 파일에서 줄 끝을 잘못 읽을 수 있어 for /f 로 첫 줄을 읽습니다.
    'if exist "%KIT%\\VERSION" for /f "usebackq delims=" %%v in ("%KIT%\\VERSION") do if not defined CUR set "CUR=%%v"',
    *check_ver,
    'if exist "%~dp0files" robocopy "%~dp0files" "%KIT%" /e /r:1 /w:1 /njh /njs /ndl /nfl /np >nul',
    "if errorlevel 8 goto copyfail",
    *[f'if exist "%KIT%\\{win(d)}" rd /s /q "%KIT%\\{win(d)}"' for d in gone_dirs],
    *[f'if exist "%KIT%\\{win(p)}" del /f /q "%KIT%\\{win(p)}"' for p in del_files],
    f'>"%KIT%\\VERSION" echo {to_ver}',
    "echo.",
    f"echo 적용했습니다. 판: {to_ver}",
    f"echo 바뀐 파일 {len(added) + len(modified)}개, 지운 파일 {len(deleted)}개",
    "echo 다음: " + ("install.bat 을 실행하세요. 패키지가 바뀌었습니다." if reinstall else "build.bat 으로 검사와 빌드를 확인하세요."),
    "pause",
    "exit /b 0",
    "",
    ":try",
    "if defined KIT goto :eof",
    f'if not exist "%~1\\MANIFEST.md" goto :eof',
    f'findstr /b /c:"# {kit}" "%~1\\MANIFEST.md" >nul 2>nul && set "KIT=%~f1"',
    "goto :eof",
    "",
    ":notkit",
    f"echo {kit} 킷 폴더가 아닙니다. MANIFEST.md 가 있는 {kit} 폴더를 지정하세요.",
    "pause",
    "exit /b 1",
    "",
    ":wrongver",
    f"echo 지금 판은 [%CUR%] 인데 이 업데이트는 {expect} 에 적용하는 것입니다.",
    "echo 아무것도 바꾸지 않았습니다. updates\\README.md 목록에서 빠진 업데이트부터 순서대로 적용하세요.",
    "pause",
    "exit /b 1",
    "",
    ":copyfail",
    "echo 파일 복사에 실패했습니다. 킷 폴더의 파일이 다른 프로그램에서 열려 있지 않은지 확인하세요.",
    "pause",
    "exit /b 1",
]
open(f"{out}/apply.bat", "w", encoding="utf-8", newline="\r\n").write("\n".join(bat) + "\n")
print(f"추가 {len(added)}, 수정 {len(modified)}, 삭제 {len(deleted)} (폴더째 {len(gone_dirs)}), 재설치 {'필요' if reinstall else '불필요'}")
PY

NAME="${KIT}-${TO_VER}.zip"
ARCHIVE="$OUTDIR/$NAME"
rm -f "$ARCHIVE"
( cd "$WORK/pkg" && zip -qrX "$ARCHIVE" . )

SIZE="$(numfmt --to=iec --suffix=B "$(stat -c%s "$ARCHIVE")")"
SHA="$(sha256sum "$ARCHIVE" | cut -d' ' -f1)"
REINSTALL="$(grep -q '다시 실행 | 필요 (' "$WORK/pkg/UPDATE.md" && echo 필요 || echo -)"

add_row "| ${FROM_VER:-없음 (처음 판)} | $TO_VER | [$NAME]($NAME) | $SIZE | $REINSTALL | \`${SHA:0:16}\` |" "[$NAME]"

echo "생성: $ARCHIVE"
echo "크기: $SIZE, SHA256: $SHA"
echo "적용 전 $FROM_LABEL ($FROM) → 적용 후 $TO_VER ($TO)"
echo "목록: $INDEX"
