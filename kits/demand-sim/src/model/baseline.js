/* 기준선: 충격 카드가 하나도 없을 때의 24개월. 전역 App.sim.baseline.
 *
 * 총수요(TIV) = 최근 12개월 계절 조정 평균 x (1 + 연간 성장률)^(경과 연수) x 계절 지수
 * 점유율 = 최근 trendWindow 개월 로그 점유율의 추세를 phi 로 감쇠시켜 이어 간 효용의 softmax
 * 점유율을 효용(로그 척도)으로 다루는 이유: 카드로 효용을 더하거나 빼도 점유율이 0~1 안에 있고
 * 합이 1 로 유지됩니다. 늘어난 몫은 같은 파워트레인 안 다른 브랜드에서 점유율 비례로 빠집니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var sim = (App.sim = App.sim || {});
  var U = sim.util;

  var FLOOR = 1e-5;

  /** horizon 이 null 이면 실적 마지막 해 + yearsAhead 년 12월까지 (2026-08 실적이면 2028-12, 28개월) */
  function defaults() {
    return { horizon: null, yearsAhead: 2, trendWindow: 12, phi: 0.85, growth: {} };
  }

  function horizonOf(lastMonth, opts) {
    if (opts.horizon) return opts.horizon;
    var y = Number(lastMonth.slice(0, 4)) + (opts.yearsAhead == null ? 2 : opts.yearsAhead);
    return U.monthIndex(y + '-12') - U.monthIndex(lastMonth);
  }

  function seasonalIndex(x, months) {
    var T = x.length;
    var idx = U.zeros(12);
    if (T < 24) return idx.map(function () { return 1; });
    var sums = U.zeros(12);
    var counts = U.zeros(12);
    for (var t = 6; t <= T - 7; t++) {
      var ma = 0.5 * x[t - 6] + 0.5 * x[t + 6];
      for (var k = t - 5; k <= t + 5; k++) ma += x[k];
      ma /= 12;
      if (ma <= 0) continue;
      var cal = U.monthIndex(months[t]) % 12;
      sums[cal] += x[t] / ma;
      counts[cal] += 1;
    }
    for (var c = 0; c < 12; c++) idx[c] = counts[c] ? sums[c] / counts[c] : 1;
    var mean = U.sum(idx) / 12;
    return idx.map(function (v) { return v / mean; });
  }

  /** 최소제곱 기울기. 점이 2개 미만이면 0 */
  function slopeOf(points) {
    var n = points.length;
    if (n < 2) return 0;
    var sx = 0, sy = 0, sxx = 0, sxy = 0;
    points.forEach(function (p) {
      sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1];
    });
    var den = n * sxx - sx * sx;
    return den === 0 ? 0 : (n * sxy - sx * sy) / den;
  }

  /**
   * 점유율 시계열 여러 개를 효용 경로로.
   * @param {number[][]} shares [item][t] 실적 점유율 (분모 0 인 달은 NaN)
   * @returns {{u: number[][], active: boolean[]}}
   */
  function projectShares(shares, T, opts) {
    var W = Math.min(opts.trendWindow, T);
    var H = opts.horizonUsed;
    var cum = [];
    var acc = 0;
    for (var h = 1; h <= H; h++) {
      acc += Math.pow(opts.phi, h);
      cum.push(acc);
    }
    var u = [];
    var active = [];
    shares.forEach(function (s) {
      var pts = [];
      var tot = 0;
      for (var t = T - W; t < T; t++) {
        if (isNaN(s[t])) continue;
        tot += s[t];
        pts.push([t, Math.log(Math.max(s[t], FLOOR))]);
      }
      var isActive = tot > 0;
      active.push(isActive);
      if (!isActive) {
        u.push(U.zeros(H));
        return;
      }
      var recent = [];
      for (var t2 = T - 1; t2 >= 0 && recent.length < 3; t2--) {
        if (!isNaN(s[t2])) recent.push(s[t2]);
      }
      var level = Math.log(Math.max(U.sum(recent) / recent.length, FLOOR));
      var b = slopeOf(pts);
      u.push(cum.map(function (c) { return level + b * c; }));
    });
    return { u: u, active: active };
  }

  /** 효용 [item][h] -> 월별 점유율 [h][item]. 엔진이 매번 다시 계산하지 않도록 미리 둡니다. */
  function sharesOf(u, active, H) {
    var out = [];
    for (var h = 0; h < H; h++) {
      out.push(U.softmax(u.map(function (row) { return row[h]; }), active));
    }
    return out;
  }

  function build(ds, options) {
    var opts = Object.assign(defaults(), options || {});
    opts.growth = Object.assign({}, (options && options.growth) || {});
    var T = ds.months.length;
    var last = ds.months[T - 1];
    var H = horizonOf(last, opts);
    opts.horizonUsed = H;
    var months = [];
    for (var h = 1; h <= H; h++) months.push(U.addMonths(last, h));

    var out = {
      options: opts,
      months: months,
      tiv: {},
      growthAuto: {},
      growthUsed: {},
      seasonal: {},
      ptU: {},
      ptActive: {},
      brandU: {},
      brandActive: {},
      ptShare: {},
      brandShare: {},
    };

    ds.regions.forEach(function (r) {
      // 지역 총수요 실적
      var tivH = U.zeros(T);
      ds.brands.forEach(function (b) {
        ds.powertrains.forEach(function (p) {
          var a = ds.units[r][b][p];
          for (var t = 0; t < T; t++) tivH[t] += a[t];
        });
      });
      var seas = seasonalIndex(tivH, ds.months);
      var d = tivH.map(function (v, t) { return v / seas[U.monthIndex(ds.months[t]) % 12]; });
      var n = Math.min(12, T);
      var lastN = d.slice(T - n);
      var level = U.sum(lastN) / n;
      var gAuto = 0;
      if (T >= 24) {
        var prev = U.sum(d.slice(T - 24, T - 12));
        gAuto = prev > 0 ? U.clamp(U.sum(lastN) / prev - 1, -0.3, 0.3) : 0;
      }
      var ov = opts.growth[r];
      var g = typeof ov === 'number' && isFinite(ov) ? ov : gAuto;
      out.growthAuto[r] = gAuto;
      out.growthUsed[r] = g;
      out.seasonal[r] = seas;
      var center = (n - 1) / 2;
      out.tiv[r] = months.map(function (m, i) {
        return level * Math.pow(1 + g, (i + 1 + center) / 12) * seas[U.monthIndex(m) % 12];
      });

      // 파워트레인 비중
      var ptShares = ds.powertrains.map(function (p) {
        var s = [];
        for (var t = 0; t < T; t++) {
          var v = 0;
          ds.brands.forEach(function (b) { v += ds.units[r][b][p][t]; });
          s.push(tivH[t] > 0 ? v / tivH[t] : NaN);
        }
        return s;
      });
      var ptProj = projectShares(ptShares, T, opts);
      out.ptU[r] = ptProj.u;
      out.ptActive[r] = ptProj.active;
      out.ptShare[r] = sharesOf(ptProj.u, ptProj.active, H);

      // 파워트레인 안 브랜드 점유율
      out.brandU[r] = {};
      out.brandActive[r] = {};
      out.brandShare[r] = {};
      ds.powertrains.forEach(function (p, pi) {
        var nest = U.zeros(T);
        ds.brands.forEach(function (b) {
          var a = ds.units[r][b][p];
          for (var t = 0; t < T; t++) nest[t] += a[t];
        });
        var bShares = ds.brands.map(function (b) {
          var a = ds.units[r][b][p];
          return a.map(function (v, t) { return nest[t] > 0 ? v / nest[t] : NaN; });
        });
        var bProj = projectShares(bShares, T, opts);
        out.brandU[r][p] = bProj.u;
        out.brandActive[r][p] = bProj.active.map(function (a) { return a && ptProj.active[pi]; });
        out.brandShare[r][p] = sharesOf(bProj.u, out.brandActive[r][p], H);
      });
    });
    return out;
  }

  sim.baseline = { defaults: defaults, build: build, horizonOf: horizonOf, seasonalIndex: seasonalIndex, slopeOf: slopeOf };
})(typeof window !== 'undefined' ? window : globalThis);
