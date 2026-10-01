/* 연 단위 집계. 전역 App.sim.annual.
 * 실적 월과 전망 월을 이어 붙여 달력 연도로 합칩니다.
 * 표기: 실적만 있는 해는 A(2025A), 실적과 전망이 섞인 해는 E(2026E), 전망만 있는 해는 F(2027F).
 * 열두 달이 다 없는 해는 뺍니다 (실적 첫해가 9월부터면 그해는 나오지 않음).
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var sim = (App.sim = App.sim || {});
  var U = sim.util;

  /** [{ year, kind: 'A'|'E'|'F', label, idx: [{src: 'a'|'f', i}] }] */
  function years(ds, bl) {
    var lastA = ds.months[ds.months.length - 1];
    var lastF = bl.months[bl.months.length - 1];
    var aPos = {};
    var fPos = {};
    ds.months.forEach(function (m, i) { aPos[m] = i; });
    bl.months.forEach(function (m, i) { fPos[m] = i; });
    var out = [];
    for (var y = Number(lastA.slice(0, 4)) - 1; y <= Number(lastF.slice(0, 4)); y++) {
      var idx = [];
      var hasA = false;
      var hasF = false;
      for (var mo = 1; mo <= 12; mo++) {
        var m = y + '-' + (mo < 10 ? '0' : '') + mo;
        if (m in aPos) { idx.push({ src: 'a', i: aPos[m] }); hasA = true; }
        else if (m in fPos) { idx.push({ src: 'f', i: fPos[m] }); hasF = true; }
      }
      if (idx.length < 12) continue;
      var kind = hasA && hasF ? 'E' : hasA ? 'A' : 'F';
      out.push({ year: y, kind: kind, label: y + kind, idx: idx });
    }
    return out;
  }

  /** 실적 배열(ds.months 길이)과 전망 배열(bl.months 길이)을 연도별 합으로 */
  function sumYears(yrs, actual, forecast) {
    return yrs.map(function (y) {
      var s = 0;
      y.idx.forEach(function (p) { s += p.src === 'a' ? actual[p.i] : forecast[p.i]; });
      return s;
    });
  }

  /** 실적 월별 브랜드 판매: 지역(TOTAL 포함) -> 브랜드 -> number[] */
  function actualBrandUnits(ds) {
    var T = ds.months.length;
    var out = {};
    var keys = ds.regions.concat([sim.TOTAL]);
    keys.forEach(function (r) {
      out[r] = {};
      ds.brands.forEach(function (b) { out[r][b] = U.zeros(T); });
    });
    ds.regions.forEach(function (r) {
      ds.brands.forEach(function (b) {
        ds.powertrains.forEach(function (p) {
          var a = ds.units[r][b][p];
          for (var t = 0; t < T; t++) {
            out[r][b][t] += a[t];
            out[sim.TOTAL][b][t] += a[t];
          }
        });
      });
    });
    return out;
  }

  /**
   * 한 결과(시나리오)의 연도별 브랜드 판매와 TAM, M/S.
   * @returns {{years, brandUnits: {r: {b: number[]}}, tiv: {r: number[]}, share: {r: {b: number[]}}}}
   */
  function fromResult(ds, bl, res, actual) {
    var yrs = years(ds, bl);
    var act = actual || actualBrandUnits(ds);
    var keys = ds.regions.concat([sim.TOTAL]);
    var bu = {};
    var tiv = {};
    var share = {};
    keys.forEach(function (r) {
      bu[r] = {};
      tiv[r] = yrs.map(function () { return 0; });
      ds.brands.forEach(function (b) {
        bu[r][b] = sumYears(yrs, act[r][b], res.brandUnits[r][b]);
        bu[r][b].forEach(function (v, i) { tiv[r][i] += v; });
      });
      share[r] = {};
      ds.brands.forEach(function (b) {
        share[r][b] = bu[r][b].map(function (v, i) { return tiv[r][i] > 0 ? v / tiv[r][i] : 0; });
      });
    });
    return { years: yrs, brandUnits: bu, tiv: tiv, share: share };
  }

  /** 연평균 성장률. 첫 값이 0 이하면 NaN */
  function cagr(first, last, n) {
    if (!(first > 0) || n <= 0) return NaN;
    return Math.pow(last / first, 1 / n) - 1;
  }

  sim.annual = { years: years, sumYears: sumYears, actualBrandUnits: actualBrandUnits, fromResult: fromResult, cagr: cagr };
})(typeof window !== 'undefined' ? window : globalThis);
