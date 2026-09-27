// 한국 공휴일과 영업일. 대체공휴일과 선거일을 포함합니다.
//
// 원본 패키지(@hyunbinseo/holidays-kr)의 기본 함수는 Promise 를 돌려줍니다.
// if (isHoliday(d)) 처럼 쓰면 Promise 가 항상 참이라 모든 날이 공휴일이 됩니다.
// 여기서는 전 연도 데이터를 미리 읽어 두고 true/false 를 바로 돌려줍니다.
//
// 수록 연도 밖의 날짜는 조용히 틀리지 않도록 오류를 냅니다.
// 수록 범위는 HOLIDAY_YEARS 로 확인하세요.

import * as all from '@hyunbinseo/holidays-kr/all';

const TABLE = {};
const YEARS = [];
for (const [key, days] of Object.entries(all)) {
  const m = /^y(\d{4})$/.exec(key);
  if (!m) continue;
  YEARS.push(Number(m[1]));
  Object.assign(TABLE, days);
}
YEARS.sort((a, b) => a - b);

/** 공휴일 데이터가 있는 연도 범위 */
export const HOLIDAY_YEARS = { from: YEARS[0], to: YEARS[YEARS.length - 1] };

/** 'YYYY-MM-DD' 문자열 또는 Date 를 'YYYY-MM-DD' 로. Date 는 로컬 날짜 기준입니다. */
export function toYmd(input) {
  if (typeof input === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) throw new TypeError('날짜는 YYYY-MM-DD 형식이어야 합니다: ' + input);
    return input;
  }
  if (!(input instanceof Date) || Number.isNaN(input.getTime())) throw new TypeError('올바른 날짜가 아닙니다.');
  const p = (n) => String(n).padStart(2, '0');
  return input.getFullYear() + '-' + p(input.getMonth() + 1) + '-' + p(input.getDate());
}

function checkYear(ymd) {
  const y = Number(ymd.slice(0, 4));
  if (y < HOLIDAY_YEARS.from || y > HOLIDAY_YEARS.to) {
    throw new RangeError(y + '년 공휴일 데이터가 없습니다 (수록 ' + HOLIDAY_YEARS.from + '~' + HOLIDAY_YEARS.to + '년).');
  }
}

/** 공휴일이면 이름 배열, 아니면 null. 주말은 공휴일이 아닙니다. */
export function holidayNames(date) {
  const ymd = toYmd(date);
  checkYear(ymd);
  return TABLE[ymd] ? [...TABLE[ymd]] : null;
}

/** 공휴일 여부 (true/false). */
export function isHoliday(date) {
  return holidayNames(date) !== null;
}

function weekday(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** 영업일 여부. 토, 일, 공휴일이 아니면 영업일입니다. */
export function isBusinessDay(date) {
  const ymd = toYmd(date);
  const w = weekday(ymd);
  return w !== 0 && w !== 6 && !isHoliday(ymd);
}

/** start 부터 end 까지(양끝 포함) 영업일 수. */
export function businessDaysBetween(start, end) {
  let a = toYmd(start);
  const b = toYmd(end);
  if (a > b) throw new RangeError('시작일이 종료일보다 늦습니다.');
  let n = 0;
  const [y, m, d] = a.split('-').map(Number);
  const cur = new Date(Date.UTC(y, m - 1, d));
  for (;;) {
    a = cur.toISOString().slice(0, 10);
    if (a > b) break;
    if (isBusinessDay(a)) n += 1;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return n;
}

/** 해당 월의 영업일 수. month 는 1~12. 월별 생산능력 계산에 씁니다. */
export function businessDaysInMonth(year, month) {
  const p = (x) => String(x).padStart(2, '0');
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return businessDaysBetween(year + '-' + p(month) + '-01', year + '-' + p(month) + '-' + p(last));
}
