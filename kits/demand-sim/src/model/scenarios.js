/* Worst / Base / Best 시나리오. 전역 App.sim.scenarios.
 *
 * 외생변수 카드마다 영향 크기를 범위 최소(magnitude.min) / 예상(mode) / 범위 최대(max) 로 받습니다.
 * 시나리오는 사람이 따로 만들지 않고 카드에서 자동으로 나옵니다.
 *   Base  : 모든 카드를 예상값으로
 *   Worst : 카드마다 범위 안에서 자사에 가장 불리한 값 (부정 요인은 크게, 긍정 요인은 작게)
 *   Best  : 카드마다 범위 안에서 자사에 가장 유리한 값 (긍정 요인은 크게, 부정 요인은 작게)
 * "자사에 유리하다" 는 전망 기간 자사 디스플레이 물량(차량 x 대당 디스플레이 x 브랜드 내 자사 M/S)으로 잽니다.
 * 디스플레이 가정이 없으면 관측 브랜드 차량 판매 합계로 잽니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var sim = (App.sim = App.sim || {});

  var NAMES = ['Worst', 'Base', 'Best'];

  function withValue(card, v) {
    var c = JSON.parse(JSON.stringify(card));
    c.magnitude = { min: v, mode: v, max: v };
    c.probability = 1;
    return c;
  }

  /** 결과 -> 자사 기준 숫자 하나 */
  function metricFor(ds, display) {
    var useDisplay = display && display.rows && display.rows.length;
    if (useDisplay) {
      var cache = {};
      return function (res) {
        var s = 0;
        ds.regions.forEach(function (r) {
          ds.brands.forEach(function (b) {
            var k = r + '|' + b;
            var a = cache[k] || (cache[k] = sim.display.lookup(display, b, r));
            var w = a.panels * a.share;
            if (!w) return;
            var arr = res.brandUnits[r][b];
            for (var h = 0; h < arr.length; h++) s += arr[h] * w;
          });
        });
        return s;
      };
    }
    return function (res) {
      var s = 0;
      ds.brands.forEach(function (b) {
        if (b === sim.OTHER) return;
        res.brandUnits[sim.TOTAL][b].forEach(function (v) { s += v; });
      });
      return s;
    };
  }

  /**
   * @returns {{items: Array<{card, values: {Worst, Base, Best}, effect: {Worst, Base, Best}, direction: 'positive'|'negative'|'neutral'}>,
   *           cards: {Worst: ShockCard[], Base: ShockCard[], Best: ShockCard[]}, metric: 'display'|'vehicles', skipped: string[]}}
   */
  function build(ds, bl, cards, display) {
    var metric = metricFor(ds, display);
    var base = sim.engine.simulate(ds, bl, []);
    var m0 = metric(base);
    var items = [];
    var skipped = [];
    (cards || []).forEach(function (card) {
      if (!card.enabled) return;
      var errs = sim.shocks.validate(card, ds, bl).filter(function (n) { return n.level === 'error'; });
      if (errs.length) {
        skipped.push((card.name || card.id) + ': ' + errs[0].message);
        return;
      }
      var mg = card.magnitude;
      var vals = [mg.min, mg.mode, mg.max];
      var eff = vals.map(function (v) { return metric(sim.engine.simulate(ds, bl, [withValue(card, v)])) - m0; });
      var tol = Math.max(1e-6, Math.abs(m0) * 1e-9);
      var hi = 1;
      var lo = 1;
      [0, 2].forEach(function (i) {
        if (eff[i] > eff[hi] + tol) hi = i;
        if (eff[i] < eff[lo] - tol) lo = i;
      });
      var dir = eff[1] > tol ? 'positive' : eff[1] < -tol ? 'negative' : 'neutral';
      items.push({
        card: card,
        values: { Worst: vals[lo], Base: vals[1], Best: vals[hi] },
        effect: { Worst: eff[lo], Base: eff[1], Best: eff[hi] },
        direction: dir,
      });
    });
    var sets = {};
    NAMES.forEach(function (n) {
      sets[n] = items.map(function (it) { return withValue(it.card, it.values[n]); });
    });
    return { items: items, cards: sets, metric: display && display.rows && display.rows.length ? 'display' : 'vehicles', skipped: skipped };
  }

  sim.scenarios = { NAMES: NAMES, build: build, metricFor: metricFor, withValue: withValue };
})(typeof window !== 'undefined' ? window : globalThis);
