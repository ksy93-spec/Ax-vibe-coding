import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isHoliday, holidayNames, isBusinessDay, businessDaysBetween, businessDaysInMonth, HOLIDAY_YEARS } from './calendar.js';

test('공휴일은 true/false 로 바로 나온다', () => {
  assert.equal(isHoliday('2026-09-25'), true);
  assert.equal(isHoliday('2026-09-28'), false);
  assert.equal(typeof isHoliday('2026-01-01'), 'boolean');
});

test('대체공휴일도 공휴일이다', () => {
  assert.deepEqual(holidayNames('2026-03-02'), ['대체공휴일(3ㆍ1절)']);
});

test('주말은 영업일이 아니다', () => {
  assert.equal(isBusinessDay('2026-09-26'), false);
  assert.equal(isBusinessDay('2026-09-28'), true);
});

test('2026년 9월 영업일은 추석 연휴를 뺀 수', () => {
  // 9월 평일 22일 중 추석 24, 25일이 평일 공휴일
  assert.equal(businessDaysInMonth(2026, 9), 20);
});

test('구간 영업일은 양끝을 포함한다', () => {
  assert.equal(businessDaysBetween('2026-09-21', '2026-09-25'), 3);
});

test('수록 연도 밖이면 오류로 알린다', () => {
  assert.throws(() => isHoliday(String(HOLIDAY_YEARS.to + 1) + '-01-01'), /공휴일 데이터가 없습니다/);
});

test('Date 객체도 받는다 (로컬 날짜 기준)', () => {
  assert.equal(isHoliday(new Date(2026, 0, 1)), true);
});
