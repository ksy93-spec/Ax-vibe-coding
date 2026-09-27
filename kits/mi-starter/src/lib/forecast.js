// 시계열 예측. 월별 판매, 생산, 수요처럼 규칙적인 간격의 숫자 배열을 다룹니다.
// 외부 예측 패키지를 쓰지 않습니다. 추세선 계산에만 simple-statistics 를 씁니다.
//
// 쓰는 법
//   import { autoForecast } from './lib/forecast.js';
//   const r = autoForecast(monthlySales, 6, { season: 12 });
//   r.forecast   앞으로 6개월 값
//   r.model      고른 방법 이름 ('holtWinters' 등)
//   r.error      검증 구간의 sMAPE(%)
//   r.candidates 후보별 오차
//
// 여기 있는 방법은 과거 패턴을 연장할 뿐입니다. 신차 출시, 단종, 정책 변화처럼
// 과거에 없던 일은 반영하지 못합니다.

import { linearRegression, linearRegressionLine } from 'simple-statistics';

function assertSeries(history, min, label) {
  if (!Array.isArray(history)) throw new TypeError(label + ': 숫자 배열이 필요합니다.');
  for (let i = 0; i < history.length; i++) {
    const v = history[i];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new TypeError(label + ': ' + i + '번째 값이 숫자가 아닙니다 (' + v + '). 빈 달은 0 이나 보간값으로 채우세요.');
    }
  }
  if (history.length < min) {
    throw new RangeError(label + ': 값이 ' + min + '개 이상 필요합니다 (지금 ' + history.length + '개).');
  }
}

function assertHorizon(h) {
  if (!Number.isInteger(h) || h < 1) throw new RangeError('예측 기간은 1 이상의 정수여야 합니다.');
}

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

/** 이동평균. 앞쪽 window-1 칸은 null 입니다. */
export function movingAverage(series, window) {
  assertSeries(series, 1, 'movingAverage');
  if (!Number.isInteger(window) || window < 1) throw new RangeError('window 는 1 이상의 정수여야 합니다.');
  const out = new Array(series.length).fill(null);
  let sum = 0;
  for (let i = 0; i < series.length; i++) {
    sum += series[i];
    if (i >= window) sum -= series[i - window];
    if (i >= window - 1) out[i] = sum / window;
  }
  return out;
}

/** 지난 시즌을 그대로 반복. 계절성이 강하고 추세가 없을 때의 기준선입니다. */
export function seasonalNaive(history, horizon, { season }) {
  assertSeries(history, season, 'seasonalNaive');
  assertHorizon(horizon);
  const n = history.length;
  return Array.from({ length: horizon }, (_, h) => history[n - season + (h % season)]);
}

/** 단순 지수평활. 추세와 계절성이 없는 수준값. */
export function simpleExpSmoothing(history, horizon, { alpha = 0.3 } = {}) {
  assertSeries(history, 2, 'simpleExpSmoothing');
  assertHorizon(horizon);
  let level = history[0];
  for (let t = 1; t < history.length; t++) level = alpha * history[t] + (1 - alpha) * level;
  return new Array(horizon).fill(level);
}

function holtRun(history, alpha, beta) {
  let level = history[0];
  let trend = history[1] - history[0];
  let sse = 0;
  for (let t = 1; t < history.length; t++) {
    const pred = level + trend;
    sse += (history[t] - pred) ** 2;
    const prev = level;
    level = alpha * history[t] + (1 - alpha) * (level + trend);
    trend = beta * (level - prev) + (1 - beta) * trend;
  }
  return { level, trend, sse };
}

/** Holt 선형. 추세는 있고 계절성은 없을 때. */
export function holtLinear(history, horizon, { alpha = 0.5, beta = 0.3 } = {}) {
  assertSeries(history, 3, 'holtLinear');
  assertHorizon(horizon);
  const { level, trend } = holtRun(history, alpha, beta);
  return Array.from({ length: horizon }, (_, h) => level + (h + 1) * trend);
}

function hwRun(history, m, alpha, beta, gamma) {
  const first = history.slice(0, m);
  const second = history.slice(m, 2 * m);
  const mid = (m - 1) / 2;
  let trend = (mean(second) - mean(first)) / m;
  // 첫 시즌 평균은 시즌 한가운데 시점의 수준입니다. 계절 지수를 잡을 때 그 안의
  // 추세분을 빼지 않으면 추세가 계절 지수에 섞여 예측이 한쪽으로 기웁니다.
  const seasonal = first.map((v, i) => v - (mean(first) + trend * (i - mid)));
  // 재귀를 t=0 부터 돌리려면 t=-1 시점의 수준에서 출발해야 합니다.
  let level = mean(first) - trend * (mid + 1);
  let sse = 0;
  for (let t = 0; t < history.length; t++) {
    const s = seasonal[t % m];
    if (t >= m) sse += (history[t] - (level + trend + s)) ** 2;
    const prev = level;
    level = alpha * (history[t] - s) + (1 - alpha) * (level + trend);
    trend = beta * (level - prev) + (1 - beta) * trend;
    seasonal[t % m] = gamma * (history[t] - level) + (1 - gamma) * s;
  }
  return { level, trend, seasonal, sse };
}

/** Holt-Winters 가법 모형. 추세와 계절성이 모두 있을 때. 최소 두 시즌 필요. */
export function holtWinters(history, horizon, { season, alpha = 0.3, beta = 0.1, gamma = 0.3 }) {
  if (!Number.isInteger(season) || season < 2) throw new RangeError('season 은 2 이상의 정수여야 합니다 (월별이면 12).');
  assertSeries(history, season * 2, 'holtWinters');
  assertHorizon(horizon);
  const n = history.length;
  const { level, trend, seasonal } = hwRun(history, season, alpha, beta, gamma);
  return Array.from({ length: horizon }, (_, h) => level + (h + 1) * trend + seasonal[(n + h) % season]);
}

/** 최소제곱 직선 추세. */
export function linearTrend(history, horizon) {
  assertSeries(history, 2, 'linearTrend');
  assertHorizon(horizon);
  const line = linearRegressionLine(linearRegression(history.map((y, t) => [t, y])));
  return Array.from({ length: horizon }, (_, h) => line(history.length + h));
}

/** 평균 절대 백분율 오차(%). 실제값이 0 인 칸은 뺍니다. */
export function mape(actual, predicted) {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] === 0) continue;
    sum += Math.abs((actual[i] - predicted[i]) / actual[i]);
    n += 1;
  }
  return n ? (sum / n) * 100 : NaN;
}

/** 대칭 평균 절대 백분율 오차(%). 0 근처 값에 덜 민감해서 모형 비교에 씁니다. */
export function smape(actual, predicted) {
  let sum = 0;
  for (let i = 0; i < actual.length; i++) {
    const d = Math.abs(actual[i]) + Math.abs(predicted[i]);
    sum += d === 0 ? 0 : (2 * Math.abs(actual[i] - predicted[i])) / d;
  }
  return (sum / actual.length) * 100;
}

const GRID = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

function fitHolt(history) {
  let best = null;
  for (const alpha of GRID) for (const beta of GRID) {
    const { sse } = holtRun(history, alpha, beta);
    if (!best || sse < best.sse) best = { alpha, beta, sse };
  }
  return { alpha: best.alpha, beta: best.beta };
}

function fitSes(history) {
  let best = null;
  for (const alpha of GRID) {
    let level = history[0];
    let sse = 0;
    for (let t = 1; t < history.length; t++) {
      sse += (history[t] - level) ** 2;
      level = alpha * history[t] + (1 - alpha) * level;
    }
    if (!best || sse < best.sse) best = { alpha, sse };
  }
  return { alpha: best.alpha };
}

function fitHoltWinters(history, season) {
  let best = null;
  for (const alpha of GRID) for (const beta of [0.05, 0.1, 0.2, 0.3]) for (const gamma of GRID) {
    const { sse } = hwRun(history, season, alpha, beta, gamma);
    if (!best || sse < best.sse) best = { alpha, beta, gamma, sse };
  }
  return { season, alpha: best.alpha, beta: best.beta, gamma: best.gamma };
}

const MODELS = {
  seasonalNaive: { min: (m) => (m ? m : Infinity), fit: (h, m) => ({ season: m }), run: seasonalNaive },
  simpleExpSmoothing: { min: () => 2, fit: (h) => fitSes(h), run: simpleExpSmoothing },
  holtLinear: { min: () => 3, fit: (h) => fitHolt(h), run: holtLinear },
  holtWinters: { min: (m) => (m ? m * 2 : Infinity), fit: (h, m) => fitHoltWinters(h, m), run: holtWinters },
  linearTrend: { min: () => 2, fit: () => ({}), run: (h, H) => linearTrend(h, H) },
};

/** 카드처럼 좁은 자리에 쓰는 짧은 이름 */
export const MODEL_SHORT = {
  seasonalNaive: '전년 반복',
  simpleExpSmoothing: '지수평활',
  holtLinear: 'Holt',
  holtWinters: 'Holt-Winters',
  linearTrend: '직선 추세',
};

export const MODEL_LABELS = {
  seasonalNaive: '전년 동월 반복',
  simpleExpSmoothing: '지수평활',
  holtLinear: '추세 지수평활 (Holt)',
  holtWinters: '추세 + 계절 (Holt-Winters)',
  linearTrend: '직선 추세',
};

/**
 * 여러 방법을 마지막 구간으로 검증해 오차가 가장 작은 것으로 예측합니다.
 * @param {number[]} history 과거 값 (오래된 것부터)
 * @param {number} horizon 예측할 칸 수
 * @param {{ season?: number, holdout?: number }} [opts] season 은 월별이면 12, 분기별이면 4
 */
export function autoForecast(history, horizon, opts = {}) {
  assertSeries(history, 4, 'autoForecast');
  assertHorizon(horizon);
  const m = opts.season || 0;
  const holdout = opts.holdout || Math.max(1, Math.min(horizon, m || 3, Math.floor(history.length / 4)));
  const train = history.slice(0, history.length - holdout);
  const test = history.slice(history.length - holdout);

  const candidates = [];
  for (const [name, spec] of Object.entries(MODELS)) {
    if (train.length < spec.min(m)) continue;
    const params = spec.fit(train, m);
    const pred = spec.run(train, holdout, params);
    candidates.push({ model: name, label: MODEL_LABELS[name], error: smape(test, pred), params });
  }
  if (!candidates.length) throw new RangeError('autoForecast: 검증할 수 있는 방법이 없습니다. 데이터를 늘리세요.');
  candidates.sort((a, b) => a.error - b.error);

  const winner = candidates[0];
  const spec = MODELS[winner.model];
  const params = spec.fit(history, m);
  return {
    model: winner.model,
    label: winner.label,
    params,
    error: winner.error,
    holdout,
    forecast: spec.run(history, horizon, params),
    candidates,
  };
}
