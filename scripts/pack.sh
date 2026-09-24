#!/usr/bin/env bash
# 킷 하나를 반입용 압축 파일로 만듭니다.
# 사용법: scripts/pack.sh <킷이름>
set -euo pipefail

KIT="${1:?사용법: scripts/pack.sh <킷이름>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/kits/$KIT"
OUT="$ROOT/dist"

[ -d "$SRC" ] || { echo "킷을 찾을 수 없습니다: $SRC" >&2; exit 1; }

echo "== 원격 URL 검사 =="
if grep -rnI --exclude-dir=vendor --exclude-dir=node_modules -E 'https?://(cdn|unpkg|fonts\.googleapis|cdnjs)' "$SRC"; then
  echo "위 항목은 사내에서 로드되지 않습니다. 제거 후 다시 실행하세요." >&2
  exit 1
fi

echo "== 범위 버전 검사 =="
if [ -f "$SRC/package.json" ] && grep -nE '"[^"]+": *"[\^~]' "$SRC/package.json"; then
  echo "범위 버전이 있습니다. 정확한 버전으로 고정하세요." >&2
  exit 1
fi
if [ -f "$SRC/requirements.txt" ] && grep -nE '^[A-Za-z0-9._-]+ *([><~!]=|[<>])' "$SRC/requirements.txt"; then
  echo "범위 버전이 있습니다. == 로 고정하세요." >&2
  exit 1
fi

echo "== 의존성 동봉 검사 =="
if [ -f "$SRC/requirements.txt" ] && [ -z "$(ls "$SRC/vendor"/*.whl 2>/dev/null)" ]; then
  echo "requirements.txt 는 있는데 vendor/ 에 휠이 없습니다. pip download 를 먼저 하세요." >&2
  exit 1
fi

mkdir -p "$OUT"
STAMP="$(date +%Y%m%d)"
ARCHIVE="$OUT/${KIT}_${STAMP}.zip"
rm -f "$ARCHIVE"
# 작업 중 생긴 폴더는 빼고 압축합니다.
( cd "$ROOT/kits" && zip -qr "$ARCHIVE" "$KIT" \
    -x "$KIT/.venv/*" "$KIT/input/*" "$KIT/output/*" \
       '*/__pycache__/*' '*/node_modules/.cache/*' '*/.DS_Store' )

echo
echo "생성: $ARCHIVE"
du -h "$ARCHIVE" | cut -f1 | sed 's/^/크기: /'
echo "SHA256: $(sha256sum "$ARCHIVE" | cut -d' ' -f1)"
echo
echo "반입 전 docs/intake-checklist.md 를 확인하세요."
