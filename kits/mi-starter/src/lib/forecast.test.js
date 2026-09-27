import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  movingAverage, seasonalNaive, simpleExpSmoothing, holtLinear, holtWinters,
  linearTrend, mape, smape, autoForecast,
} from './forecast.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ` ${a} vs ${b}`);

// 추세 + 12개월 계절성 + 약간의 흔들림이 있는 월별 판매 (3년)
const PATTERN = [-80, -60, 10, 40, 60, 30, -10, -40, 20, 50, 40, -60];
const seasonal = Array.from({ length: 36 }, (_, t) => 1000 + 5 * t + PATTERN[t % 12] + ((t * 7) % 5) - 2);

test('이동평균은 앞쪽을 null 로 둔다', () => {
  assert.deepEqual(movingAverage([1, 2, 3, 4], 2), [null, 1.5, 2.5, 3.5]);
});

test('전년 동월 반복', () => {
  assert.deepEqual(seasonalNaive([1, 2, 3, 4, 5, 6], 4, { season: 3 }), [4, 5, 6, 4]);
});

test('직선 추세는 완전한 직선을 그대로 잇는다', () => {
  const line = Array.from({ length: 10 }, (_, t) => 2 * t + 1);
  linearTrend(line, 3).forEach((v, i) => close(v, 2 * (10 + i) + 1, 1e-9));
});

test('Holt 는 직선을 거의 그대로 잇는다', () => {
  const line = Array.from({ length: 20 }, (_, t) => 100 + 3 * t);
  holtLinear(line, 3, { alpha: 0.9, beta: 0.9 }).forEach((v, i) => close(v, 100 + 3 * (20 + i), 1e-6));
});

test('지수평활은 상수열에서 그 상수를 낸다', () => {
  assert.deepEqual(simpleExpSmoothing([5, 5, 5, 5], 2), [5, 5]);
});

test('Holt-Winters 는 잡음 없는 계절 추세를 그대로 잇는다', () => {
  const clean = Array.from({ length: 48 }, (_, t) => 1000 + 5 * t + PATTERN[t % 12]);
  const train = clean.slice(0, 36);
  const pred = holtWinters(train, 12, { season: 12, alpha: 0.2, beta: 0.1, gamma: 0.2 });
  assert.ok(mape(clean.slice(36), pred) < 1e-6, 'MAPE ' + mape(clean.slice(36), pred));
});

test('mape 는 실제값 0 을 건너뛴다', () => {
  assert.equal(mape([0, 100], [5, 110]), 10);
});

test('smape 는 둘 다 0 이면 오차 0', () => {
  assert.equal(smape([0, 0], [0, 0]), 0);
});

test('autoForecast 는 계절 자료에서 계절 모형을 고르고 기간만큼 낸다', () => {
  const r = autoForecast(seasonal, 6, { season: 12 });
  assert.equal(r.forecast.length, 6);
  assert.ok(['holtWinters', 'seasonalNaive'].includes(r.model), '고른 모형 ' + r.model);
  assert.ok(r.forecast.every(Number.isFinite));
  assert.ok(r.error < 5, '검증 오차 ' + r.error);
  assert.ok(r.candidates.length >= 4);
});

test('autoForecast 는 계절성 없는 직선에서 추세 모형을 고른다', () => {
  const line = Array.from({ length: 24 }, (_, t) => 500 + 12 * t);
  const r = autoForecast(line, 3);
  assert.ok(['linearTrend', 'holtLinear'].includes(r.model), '고른 모형 ' + r.model);
  close(r.forecast[0], 500 + 12 * 24, 1);
});

test('빈 값이 있으면 어느 칸인지 알려 준다', () => {
  assert.throws(() => autoForecast([1, 2, null, 4, 5], 2), /2번째 값이 숫자가 아닙니다/);
});

test('데이터가 모자라면 필요한 개수를 알려 준다', () => {
  assert.throws(() => holtWinters([1, 2, 3], 2, { season: 12 }), /24개 이상 필요/);
});
