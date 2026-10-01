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

  /** 축 눈금용. 1234567 -> '123만', 12345 -> '1.2만' */
  function compact(v) {
    if (v === null || v === undefined || !isFinite(v)) return '';
    var a = Math.abs(v);
    if (a >= 1e8) return trim(v / 1e8) + '억';
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
