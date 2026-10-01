/* 계산 엔진 공용 도구. 전역 App.sim.util.
 * DOM 을 쓰지 않습니다. 브라우저와 Node(테스트) 양쪽에서 읽힙니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var sim = (App.sim = App.sim || {});

  var EPS = 1e-6;

  /** '2026-09' -> 24320 (연*12 + 월-1). 월 계산을 정수로 하기 위한 번호입니다. */
  function monthIndex(ym) {
    var m = /^(\d{4})-(\d{2})$/.exec(ym);
    if (!m) throw new Error('월 형식이 아닙니다: ' + ym);
    return Number(m[1]) * 12 + Number(m[2]) - 1;
  }

  function monthLabel(idx) {
    var y = Math.floor(idx / 12);
    var mo = idx - y * 12 + 1;
    return y + '-' + (mo < 10 ? '0' : '') + mo;
  }

  function addMonths(ym, n) {
    return monthLabel(monthIndex(ym) + n);
  }

  /** 연속된 월 목록. from, to 포함. */
  function monthRange(from, to) {
    var out = [];
    for (var i = monthIndex(from); i <= monthIndex(to); i++) out.push(monthLabel(i));
    return out;
  }

  /** 여러 표기를 'YYYY-MM' 으로. 못 읽으면 null. 2026-09, 2026/9, 202609, 2026.09, 2026-09-01 */
  function parseMonth(v) {
    var s = String(v == null ? '' : v).trim();
    var m = /^(\d{4})[-./ ]?(\d{1,2})(?:[-./ ]\d{1,2})?(?:[ T].*)?$/.exec(s);
    if (!m) return null;
    var mo = Number(m[2]);
    if (mo < 1 || mo > 12) return null;
    return m[1] + '-' + (mo < 10 ? '0' : '') + mo;
  }

  /** '2026-Q3', '2026Q3', '2026 Q3', '2026-3Q', '3Q2026', '3Q26' -> '2026-Q3'. 월이면 그 월의 분기. */
  function parseQuarter(v) {
    var s = String(v == null ? '' : v).trim().toUpperCase();
    var m = /^(\d{4})[-. ]?Q([1-4])$/.exec(s) || /^(\d{4})[-. ]?([1-4])Q$/.exec(s);
    if (m) return m[1] + '-Q' + m[2];
    m = /^([1-4])Q[-. ]?(\d{2}|\d{4})$/.exec(s);
    if (m) return (m[2].length === 2 ? '20' + m[2] : m[2]) + '-Q' + m[1];
    var ym = parseMonth(s);
    if (ym) return quarterOf(ym);
    return null;
  }

  function quarterOf(ym) {
    var idx = monthIndex(ym);
    var y = Math.floor(idx / 12);
    var q = Math.floor((idx - y * 12) / 3) + 1;
    return y + '-Q' + q;
  }

  /** 분기의 세 달. '2026-Q3' -> ['2026-07','2026-08','2026-09'] */
  function quarterMonths(q) {
    var m = /^(\d{4})-Q([1-4])$/.exec(q);
    var first = Number(m[1]) * 12 + (Number(m[2]) - 1) * 3;
    return [monthLabel(first), monthLabel(first + 1), monthLabel(first + 2)];
  }

  /** '1,234' '1234.5' ' 12 ' -> 숫자. 빈 값과 '-' 는 0. 못 읽으면 NaN. */
  function parseNumber(v) {
    if (typeof v === 'number') return v;
    var s = String(v == null ? '' : v).replace(/[,\s]/g, '');
    if (s === '' || s === '-') return 0;
    return Number(s);
  }

  function clamp(x, lo, hi) {
    return x < lo ? lo : x > hi ? hi : x;
  }

  function logit(p) {
    var q = clamp(p, EPS, 1 - EPS);
    return Math.log(q / (1 - q));
  }

  /** 합이 1 인 점유율로. 활성(active[i] 참)인 항목만 나눠 갖고 나머지는 0. */
  function softmax(u, active) {
    var n = u.length;
    var max = -Infinity;
    var i;
    for (i = 0; i < n; i++) if (active[i] && u[i] > max) max = u[i];
    var out = new Array(n);
    var sum = 0;
    for (i = 0; i < n; i++) {
      out[i] = active[i] ? Math.exp(u[i] - max) : 0;
      sum += out[i];
    }
    for (i = 0; i < n; i++) out[i] = sum > 0 ? out[i] / sum : 0;
    return out;
  }

  function sum(arr) {
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += arr[i];
    return s;
  }

  function zeros(n) {
    var a = new Array(n);
    for (var i = 0; i < n; i++) a[i] = 0;
    return a;
  }

  /** 정렬된 배열의 분위수. 선형 보간. */
  function quantileSorted(sorted, q) {
    if (!sorted.length) return NaN;
    var pos = (sorted.length - 1) * q;
    var lo = Math.floor(pos);
    var hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  /** 시드 고정 난수 (mulberry32). Math.random 은 결과가 매번 달라져서 쓰지 않습니다. */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** 삼각분포 표본. min=mode=max 면 그 값. */
  function triangular(r, min, mode, max) {
    if (max <= min) return mode;
    var u = r();
    var c = (mode - min) / (max - min);
    if (u < c) return min + Math.sqrt(u * (max - min) * (mode - min));
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }

  sim.util = {
    EPS: EPS,
    monthIndex: monthIndex,
    monthLabel: monthLabel,
    addMonths: addMonths,
    monthRange: monthRange,
    parseMonth: parseMonth,
    parseQuarter: parseQuarter,
    quarterOf: quarterOf,
    quarterMonths: quarterMonths,
    parseNumber: parseNumber,
    clamp: clamp,
    logit: logit,
    softmax: softmax,
    sum: sum,
    zeros: zeros,
    quantileSorted: quantileSorted,
    rng: rng,
    triangular: triangular,
  };
})(typeof window !== 'undefined' ? window : globalThis);
