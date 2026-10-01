/* 디스플레이 수요(TAM)와 우리 몫. 전역 App.sim.display.
 *
 * 브랜드 디스플레이 수요(장) = 차량 판매(대) x 대당 디스플레이 수(장)
 * 우리 몫(장) = 브랜드 디스플레이 수요 x 그 브랜드 안 우리 공급 비중
 * 가정은 (브랜드, 지역) 행이 있으면 그것을, 없으면 (브랜드, 모든 지역) 행을, 그것도 없으면 기본값을 씁니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var sim = (App.sim = App.sim || {});

  function defaults() {
    return { companyName: '우리', defaultPanels: 2, defaultShare: 0, rows: [] };
  }

  /** 가정 찾기 -> { panels, share, source: 'region' | 'brand' | 'default' } */
  function lookup(settings, brand, region) {
    var rows = settings.rows || [];
    var hit = null;
    var src = 'default';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.brand !== brand) continue;
      if (r.region && r.region === region) { hit = r; src = 'region'; break; }
      if (!r.region && !hit) { hit = r; src = 'brand'; }
    }
    return {
      panels: hit && isFinite(hit.panelsPerVehicle) ? hit.panelsPerVehicle : settings.defaultPanels,
      share: hit && isFinite(hit.ourShare) ? hit.ourShare : settings.defaultShare,
      source: src,
    };
  }

  /**
   * @param {Sim.Dataset} ds
   * @param {Object<string, Object<string, number>>} vehicles 지역 -> 브랜드 -> 차량 대수 (지역 목록만, TOTAL 없이)
   * @param {Sim.DisplaySettings} settings
   * @returns {Sim.DisplayResult} 지역 목록 + TOTAL
   */
  function compute(ds, vehicles, settings) {
    var s = settings || defaults();
    var out = {};
    var total = { vehicles: 0, tam: 0, ours: 0, share: 0, brands: {} };
    ds.brands.forEach(function (b) { total.brands[b] = { vehicles: 0, tam: 0, ours: 0, share: 0, panels: 0 }; });
    ds.regions.forEach(function (r) {
      var reg = { vehicles: 0, tam: 0, ours: 0, share: 0, brands: {} };
      ds.brands.forEach(function (b) {
        var v = (vehicles[r] && vehicles[r][b]) || 0;
        var a = lookup(s, b, r);
        var tam = v * a.panels;
        var ours = tam * a.share;
        reg.brands[b] = { vehicles: v, tam: tam, ours: ours, share: a.share, panels: a.panels, source: a.source };
        reg.vehicles += v;
        reg.tam += tam;
        reg.ours += ours;
        var t = total.brands[b];
        t.vehicles += v;
        t.tam += tam;
        t.ours += ours;
      });
      reg.share = reg.tam > 0 ? reg.ours / reg.tam : 0;
      out[r] = reg;
      total.vehicles += reg.vehicles;
      total.tam += reg.tam;
      total.ours += reg.ours;
    });
    ds.brands.forEach(function (b) {
      var t = total.brands[b];
      t.share = t.tam > 0 ? t.ours / t.tam : 0;
      t.panels = t.vehicles > 0 ? t.tam / t.vehicles : 0;
    });
    total.share = total.tam > 0 ? total.ours / total.tam : 0;
    out[sim.TOTAL] = total;
    return out;
  }

  /** 월별 배열(지역 -> 브랜드 -> number[])의 [from, to) 구간 합을 차량 대수로 */
  function sumVehicles(ds, series, from, to) {
    var out = {};
    ds.regions.forEach(function (r) {
      out[r] = {};
      ds.brands.forEach(function (b) {
        var a = series[r][b];
        var v = 0;
        for (var i = Math.max(0, from); i < Math.min(a.length, to); i++) v += a[i];
        out[r][b] = v;
      });
    });
    return out;
  }

  sim.display = { defaults: defaults, lookup: lookup, compute: compute, sumVehicles: sumVehicles };
})(typeof window !== 'undefined' ? window : globalThis);
