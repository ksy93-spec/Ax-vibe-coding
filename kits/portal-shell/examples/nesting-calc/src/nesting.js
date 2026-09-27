// 직사각 블랭크를 판에 격자로 배치했을 때의 개수와 수율.
// 예시 계산입니다. 실제 사내 계산기의 규칙(피치, 방향성, 스크랩 기준)을 대신하지 않습니다.

function fit(length, piece, gap) {
  if (piece <= 0 || length < piece) return 0;
  return Math.floor((length + gap) / (piece + gap));
}

export function nest({ sheetW, sheetL, blankW, blankL, edge, gap }) {
  const usableW = sheetW - edge * 2;
  const usableL = sheetL - edge * 2;
  const normal = {
    across: fit(usableW, blankW, gap),
    along: fit(usableL, blankL, gap),
    rotated: false,
  };
  const rotated = {
    across: fit(usableW, blankL, gap),
    along: fit(usableL, blankW, gap),
    rotated: true,
  };
  normal.count = normal.across * normal.along;
  rotated.count = rotated.across * rotated.along;
  const best = rotated.count > normal.count ? rotated : normal;
  const sheetArea = sheetW * sheetL;
  const yieldPct = sheetArea > 0 ? (best.count * blankW * blankL) / sheetArea * 100 : 0;
  return { normal, rotated, best, yieldPct };
}
