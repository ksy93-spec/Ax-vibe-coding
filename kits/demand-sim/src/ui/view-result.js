/* 결과 탭: 지역 x 브랜드 단위 예측, 불확실성 구간, 카드별 기여도. 전역 App.views.result. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var w = App.w;
  var fmt = App.fmt;
  var sim = App.sim;
  var st = App.state;
  var act = App.actions;

  var HISTORY_SHOWN = 24;

  /** 실적 월별 브랜드 판매와 지역 총수요 (TOTAL 포함) */
  function history(ds) {
    var T = ds.months.length;
    var from = Math.max(0, T - HISTORY_SHOWN);
    var brandUnits = {};
    var tiv = {};
    ds.regions.concat([sim.TOTAL]).forEach(function (r) {
      brandUnits[r] = {};
      ds.brands.forEach(function (b) { brandUnits[r][b] = sim.util.zeros(T - from); });
      tiv[r] = sim.util.zeros(T - from);
    });
    ds.regions.forEach(function (r) {
      ds.brands.forEach(function (b) {
        ds.powertrains.forEach(function (p) {
          var a = ds.units[r][b][p];
          for (var t = from; t < T; t++) {
            brandUnits[r][b][t - from] += a[t];
            brandUnits[sim.TOTAL][b][t - from] += a[t];
            tiv[r][t - from] += a[t];
            tiv[sim.TOTAL][t - from] += a[t];
          }
        });
      });
    });
    return { months: ds.months.slice(from), brandUnits: brandUnits, tiv: tiv };
  }

  function sumRange(arr, a, b) {
    var s = 0;
    for (var i = a; i < Math.min(b, arr.length); i++) s += arr[i];
    return s;
  }

  function nulls(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(null);
    return a;
  }

  /** 실적 + 예측을 한 축에. 실적 마지막 달을 예측선 앞에 이어 붙여 선이 끊기지 않게 합니다. */
  function joinSeries(hist, fut) {
    var n = hist.length;
    return {
      actual: hist.concat(nulls(fut.length)),
      future: function (vals) { return nulls(n - 1).concat([hist[n - 1]]).concat(vals); },
    };
  }

  function unitsChart(mount, title, hist, histMonths, base, scen, band, format) {
    var j = joinSeries(hist, base);
    var x = histMonths.concat(st.bl.months);
    var spec = {
      title: title,
      x: x,
      splitAt: hist.length,
      format: format || 'units',
      series: [
        { name: '실적', values: j.actual, kind: 'actual' },
        { name: '기준선', values: j.future(base), kind: 'baseline' },
        { name: '시나리오', values: j.future(scen), kind: 'scenario' },
      ],
    };
    if (band) spec.band = { name: 'P10~P90', lo: nulls(hist.length).concat(band.p10), hi: nulls(hist.length).concat(band.p90) };
    App.fcChart(mount, spec);
  }

  function controls(scn) {
    var regions = [{ value: sim.TOTAL, label: '전체 (TAM)' }].concat(st.ds.regions);
    var mc = act.mcResult(scn);
    var btn = h('button', { class: 'btn btn--sm btn--primary', type: 'button', text: mc ? '구간 다시 계산' : '불확실성 구간 계산' });
    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.textContent = '계산 중...';
      setTimeout(function () {
        var t0 = Date.now();
        act.runMc(scn);
        App.ui.toast(st.view.mcDraws + '회 표본 계산 (' + ((Date.now() - t0) / 1000).toFixed(1) + '초)', 'ok');
        App.render();
      }, 30);
    });
    return h('section', { class: 'panel panel--bar no-print' }, h('div', { class: 'row' }, [
      w.field('시나리오', w.select(st.scenarios.map(function (s) { return { value: s.id, label: s.name }; }), scn.id, function (v) { st.activeId = v; act.persist(); App.render(); })),
      w.field('지역', w.select(regions, st.view.region, function (v) { st.view.region = v; App.render(); })),
      w.field('브랜드', w.select(st.ds.brands, st.view.brand, function (v) { st.view.brand = v; App.render(); })),
      h('div', { class: 'app__spacer' }),
      w.field('표본 수', w.select([200, 500, 1000, 2000], st.view.mcDraws, function (v) { st.view.mcDraws = Number(v); App.render(); })),
      h('div', { class: 'field' }, [h('span', { class: 'field__label', text: mc ? '구간 계산됨 (시드 42)' : '구간 미계산' }), btn]),
    ]));
  }

  function kpis(scn, base, res, hist) {
    var r = st.view.region;
    var b = st.view.brand;
    var H = res.months.length;
    var b12 = sumRange(base.brandUnits[r][b], 0, 12);
    var s12 = sumRange(res.brandUnits[r][b], 0, 12);
    var b24 = sumRange(base.brandUnits[r][b], 12, 24);
    var s24 = sumRange(res.brandUnits[r][b], 12, 24);
    var last12 = sumRange(hist.brandUnits[r][b], hist.months.length - 12, hist.months.length);
    var hEnd = Math.min(H, 12) - 1;
    var t12 = sumRange(base.tiv[r], 0, 12);
    var ts12 = sumRange(res.tiv[r], 0, 12);
    var items = [
      w.kpi('향후 12개월 판매 (시나리오)', fmt.units(s12) + ' 대', '기준선 대비 ' + fmt.signedUnits(s12 - b12) + ' (' + fmt.signedPct(b12 ? s12 / b12 - 1 : 0) + ')', w.tone(s12 - b12)),
      w.kpi('최근 12개월 실적', fmt.units(last12) + ' 대', '시나리오 연간 변화 ' + fmt.signedPct(last12 ? s12 / last12 - 1 : 0), w.tone(s12 - last12)),
    ];
    if (H >= 24) items.push(w.kpi('13~24개월 판매 (시나리오)', fmt.units(s24) + ' 대', '기준선 대비 ' + fmt.signedUnits(s24 - b24) + ' (' + fmt.signedPct(b24 ? s24 / b24 - 1 : 0) + ')', w.tone(s24 - b24)));
    items.push(w.kpi(res.months[hEnd] + ' 점유율', fmt.pct(res.share[r][b][hEnd], 2), '기준선 ' + fmt.pct(base.share[r][b][hEnd], 2) + ', ' + fmt.signedPp(res.share[r][b][hEnd] - base.share[r][b][hEnd]), w.tone(res.share[r][b][hEnd] - base.share[r][b][hEnd])));
    items.push(w.kpi((r === sim.TOTAL ? '전체' : r) + ' 총수요 향후 12개월', fmt.units(ts12) + ' 대', '기준선 대비 ' + fmt.signedPct(t12 ? ts12 / t12 - 1 : 0), w.tone(ts12 - t12)));
    return h('div', { class: 'kpis' }, items);
  }

  function brandTable(base, res, hist) {
    var r = st.view.region;
    var H = res.months.length;
    var hA = Math.min(H, 12) - 1;
    var hB = H - 1;
    var rows = st.ds.brands.map(function (b) {
      var last12 = sumRange(hist.brandUnits[r][b], hist.months.length - 12, hist.months.length);
      var b12 = sumRange(base.brandUnits[r][b], 0, 12);
      var s12 = sumRange(res.brandUnits[r][b], 0, 12);
      return [
        b,
        fmt.units(last12),
        fmt.units(b12),
        fmt.units(s12),
        fmt.signedUnits(s12 - b12),
        fmt.pct(base.share[r][b][hA], 2) + ' → ' + fmt.pct(res.share[r][b][hA], 2),
        fmt.pct(base.share[r][b][hB], 2) + ' → ' + fmt.pct(res.share[r][b][hB], 2),
      ];
    });
    var totals = ['합계 (TAM)',
      fmt.units(sumRange(hist.tiv[r], hist.months.length - 12, hist.months.length)),
      fmt.units(sumRange(base.tiv[r], 0, 12)), fmt.units(sumRange(res.tiv[r], 0, 12)),
      fmt.signedUnits(sumRange(res.tiv[r], 0, 12) - sumRange(base.tiv[r], 0, 12)), '', ''];
    rows.push(totals);
    var cols = ['브랜드', { label: '최근 12개월 실적', num: true }, { label: '향후 12개월 기준선', num: true }, { label: '시나리오', num: true }, { label: '차이', num: true },
      { label: res.months[hA] + ' 점유율 기준선 → 시나리오', num: true }, { label: res.months[hB] + ' 점유율', num: true }];
    return w.table(cols, rows, {
      onRowClick: function (i) { if (i < st.ds.brands.length) { st.view.brand = st.ds.brands[i]; App.render(); } },
      selected: function (i) { return st.ds.brands[i] === st.view.brand; },
    });
  }

  function contributionTable(scn) {
    var r = st.view.region;
    var b = st.view.brand;
    var cr = sim.engine.contributions(st.ds, st.bl, scn.cards);
    var H = st.bl.months.length;
    var rows = cr.items.map(function (it) {
      return { name: it.name, a: sumRange(it.delta[r][b], 0, 12), b: sumRange(it.delta[r][b], 12, 24), t: sumRange(it.delta[r][b], 0, H) };
    });
    rows.push({ name: '카드 간 상호작용', a: sumRange(cr.interaction[r][b], 0, 12), b: sumRange(cr.interaction[r][b], 12, 24), t: sumRange(cr.interaction[r][b], 0, H), muted: true });
    var maxAbs = 0;
    rows.forEach(function (x) { maxAbs = Math.max(maxAbs, Math.abs(x.t)); });
    var out = rows.map(function (x) {
      var pct = maxAbs ? Math.abs(x.t) / maxAbs : 0;
      var bar = h('div', { class: 'dbar' }, [
        h('span', { class: 'dbar__neg' }, x.t < 0 ? h('span', { class: 'dbar__fill dbar__fill--neg', style: { width: pct * 100 + '%' } }) : null),
        h('span', { class: 'dbar__pos' }, x.t > 0 ? h('span', { class: 'dbar__fill dbar__fill--pos', style: { width: pct * 100 + '%' } }) : null),
      ]);
      return [x.name, fmt.signedUnits(x.a), H > 12 ? fmt.signedUnits(x.b) : '', fmt.signedUnits(x.t), bar];
    });
    var cols = ['카드', { label: '1~12개월', num: true }, { label: '13~24개월', num: true }, { label: '전체 기간', num: true }, '크기'];
    return h('div', null, [
      h('h2', { class: 'panel__title', text: '카드별 영향 (' + (r === sim.TOTAL ? '전체' : r) + ' · ' + b + ', 판매 대수)' }),
      h('p', { class: 'panel__hint', text: '카드 한 장만 켰을 때 기준선과의 차이입니다. 카드끼리 같은 시장을 건드리면 합이 정확히 맞지 않아 그 차이를 상호작용으로 따로 적었습니다.' }),
      cr.items.length ? w.table(cols, out) : h('p', { class: 'empty', text: '켜진 카드가 없습니다.' }),
    ]);
  }

  function ptTable(base, res) {
    var r = st.view.region;
    var pts = st.ds.powertrains;
    if (pts.length === 1) return null;
    var T = st.ds.months.length;
    var H = res.months.length;
    var hA = Math.min(H, 12) - 1;
    var rows = pts.map(function (p) {
      var last = 0;
      var tot = 0;
      var regs = r === sim.TOTAL ? st.ds.regions : [r];
      regs.forEach(function (rg) {
        st.ds.brands.forEach(function (b) {
          st.ds.powertrains.forEach(function (pp) {
            var v = st.ds.units[rg][b][pp][T - 1];
            tot += v;
            if (pp === p) last += v;
          });
        });
      });
      return [p, fmt.pct(tot ? last / tot : 0), fmt.pct(base.ptMix[r][p][hA]) + ' → ' + fmt.pct(res.ptMix[r][p][hA]), fmt.pct(base.ptMix[r][p][H - 1]) + ' → ' + fmt.pct(res.ptMix[r][p][H - 1])];
    });
    return h('div', null, [
      h('h2', { class: 'panel__title', text: '파워트레인 비중 (' + (r === sim.TOTAL ? '전체' : r) + ')' }),
      w.table(['파워트레인', { label: st.ds.months[T - 1] + ' 실적', num: true }, { label: res.months[hA] + ' 기준선 → 시나리오', num: true }, { label: res.months[H - 1], num: true }], rows),
    ]);
  }

  function render(root) {
    if (!st.ds) {
      root.appendChild(h('section', { class: 'panel' }, h('p', { class: 'empty', text: '먼저 데이터 탭에서 데이터를 불러오세요.' })));
      return;
    }
    var scn = act.scenario();
    var base = act.baseResult();
    var res = act.result(scn);
    var mc = act.mcResult(scn);
    var hist = history(st.ds);
    var r = st.view.region;
    var b = st.view.brand;

    root.appendChild(controls(scn));
    if (res.warnings.length) root.appendChild(h('section', { class: 'panel' }, w.notes(res.warnings)));
    root.appendChild(kpis(scn, base, res, hist));

    var charts = h('div', { class: 'grid-2' });
    var c1 = h('section', { class: 'panel' });
    unitsChart(c1, b + ' 판매 (' + (r === sim.TOTAL ? '전체' : r) + ', 월)', hist.brandUnits[r][b], hist.months, base.brandUnits[r][b], res.brandUnits[r][b], mc && mc.brandUnits[r][b]);
    var c2 = h('section', { class: 'panel' });
    var histShare = hist.brandUnits[r][b].map(function (v, i) { return hist.tiv[r][i] ? v / hist.tiv[r][i] : 0; });
    unitsChart(c2, b + ' 점유율 (' + (r === sim.TOTAL ? '전체' : r) + ')', histShare, hist.months, base.share[r][b], res.share[r][b], mc && mc.share[r][b], 'percent');
    charts.appendChild(c1);
    charts.appendChild(c2);
    root.appendChild(charts);

    var c3 = h('section', { class: 'panel' });
    unitsChart(c3, (r === sim.TOTAL ? '전체' : r) + ' 총수요 (월)', hist.tiv[r], hist.months, base.tiv[r], res.tiv[r], mc && mc.tiv[r]);
    var pt = ptTable(base, res);
    var row2 = h('div', { class: 'grid-2' }, [c3, pt ? h('section', { class: 'panel' }, pt) : null]);
    root.appendChild(row2);

    root.appendChild(h('section', { class: 'panel' }, [
      h('h2', { class: 'panel__title', text: (r === sim.TOTAL ? '전체' : r) + ' 브랜드별 요약' }),
      h('p', { class: 'panel__hint', text: '행을 누르면 위 차트의 브랜드가 바뀝니다.' }),
      brandTable(base, res, hist),
    ]));
    root.appendChild(h('section', { class: 'panel' }, contributionTable(scn)));
  }

  App.views = App.views || {};
  App.views.result = render;
  App.views.history = history;
  App.views.unitsChart = unitsChart;
  App.views.sumRange = sumRange;
})(window);
