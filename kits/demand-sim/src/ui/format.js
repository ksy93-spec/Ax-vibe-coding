/* 숫자 표기. 전역 App.fmt. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});

  function round(v, d) {
    var k = Math.pow(10, d || 0);
    return Math.round(v * k) / k;
  }

  /** 12345 -> '12,345' */
  function units(v) {
    if (v === null || v === undefined || !isFinite(v)) return '';
    return Math.round(v).toLocaleString('ko-KR');
  }

  /** 짧게. 19122226 -> '1,912만', 4414910 -> '441만', 168836 -> '16.9만', 2.3억 */
  function compact(v) {
    if (v === null || v === undefined || !isFinite(v)) return '';
    var a = Math.abs(v);
    if (a >= 1e8) return trim(v / 1e8) + '억';
    if (a >= 1e6) return Math.round(v / 1e4).toLocaleString('ko-KR') + '만';
    if (a >= 1e4) return trim(v / 1e4) + '만';
    return Math.round(v).toLocaleString('ko-KR');
  }

  function trim(n) {
    var s = (Math.round(n * 10) / 10).toFixed(1);
    return s.replace(/\.0$/, '');
  }

  /** 0.1234 -> '12.3%' */
  function pct(v, d) {
    if (v === null || v === undefined || !isFinite(v)) return '';
    return round(v * 100, d === undefined ? 1 : d).toFixed(d === undefined ? 1 : d) + '%';
  }

  /** 부호 붙은 변화. 12345 -> '+12,345' */
  function signedUnits(v) {
    if (!isFinite(v)) return '';
    var r = Math.round(v);
    return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toLocaleString('ko-KR');
  }

  /** 비율 변화. 0.0123 -> '+1.2%' */
  function signedPct(v, d) {
    if (!isFinite(v)) return '';
    var r = round(v * 100, d === undefined ? 1 : d);
    return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(d === undefined ? 1 : d) + '%';
  }

  /** 점유율 차이. 0.0123 -> '+1.23%p' */
  function signedPp(v, d) {
    if (!isFinite(v)) return '';
    var dd = d === undefined ? 2 : d;
    var r = round(v * 100, dd);
    return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(dd) + '%p';
  }

  App.fmt = { units: units, compact: compact, pct: pct, signedUnits: signedUnits, signedPct: signedPct, signedPp: signedPp };
})(window);
