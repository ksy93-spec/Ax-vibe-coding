// 숫자 표기. 한국 업무 보고서 관행(만/억, 천 단위 쉼표, 부호 붙은 증감)을 따릅니다.

function trim(n, digits) {
  return Number(n.toFixed(digits)).toLocaleString('ko-KR', { maximumFractionDigits: digits });
}

/** 1,234,567 */
export function num(v, digits = 0) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '-';
  return trim(v, digits);
}

/** 1.2억, 3,450만, 12.3만, 9,800 */
export function compact(v, digits = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '-';
  const a = Math.abs(v);
  if (a >= 1e12) return trim(v / 1e12, digits) + '조';
  if (a >= 1e8) return trim(v / 1e8, digits) + '억';
  if (a >= 1e6) return trim(v / 1e4, 0) + '만';      // 100만 이상은 만 단위 정수: 3,450만
  if (a >= 1e4) return trim(v / 1e4, digits) + '만'; // 1만~100만은 소수 한 자리: 1.2만, 12.3만
  return trim(v, 0);
}

/** 12.3% . ratio=true 면 0.123 을 12.3% 로. */
export function pct(v, { digits = 1, ratio = false } = {}) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '-';
  return trim(ratio ? v * 100 : v, digits) + '%';
}

/** +3.2% / -1.0% / 0.0% . 증감률 표시용 */
export function signedPct(v, digits = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '-';
  const s = trim(Math.abs(v), digits) + '%';
  return v > 0 ? '+' + s : v < 0 ? '-' + s : s;
}

/** 증감률(%). 기준이 0 이면 null. */
export function growth(current, base) {
  if (!Number.isFinite(current) || !Number.isFinite(base) || base === 0) return null;
  return ((current - base) / Math.abs(base)) * 100;
}
