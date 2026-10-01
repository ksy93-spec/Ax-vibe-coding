/* 상세 분석 탭: 지역 x OEM 의 월별 M/S trend, 연도별 판매, 외생변수별 영향. 전역 App.views.result. */
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
  var KIND = { Trend: 'baseline', Worst: 'worst', Base: 'base', Best: 'best' };

  function rname(r) {
    return r === sim.TOTAL ? '글로벌' : sim.geo.regionShort(r);
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

  /** 최근 24개월 실적 (TOTAL 포함): brandUnits, tiv */
  function history(ds, actual) {
    var T = ds.months.length;
    var from = Math.max(0, T - HISTORY_SHOWN);
    var tiv = {};
    var bu = {};
    ds.regions.concat([sim.TOTAL]).forEach(function (r) {
      bu[r] = {};
      tiv[r] = sim.util.zeros(T - from);
      ds.brands.forEach(function (b) {
        bu[r][b] = actual[r][b].slice(from);
        bu[r][b].forEach(function (v, i) { tiv[r][i] += v; });
      });
    });
    return { months: ds.months.slice(from), brandUnits: bu, tiv: tiv };
  }

  /** 실적 + 시나리오 4개를 한 축에. 실적 마지막 달을 전망선 앞에 붙여 선이 끊기지 않게 합니다. */
  function lineChart(mount, title, hist, series, format) {
    var n = hist.length;
    var spec = {
      title: title,
      x: series.x,
      splitAt: n,
      format: format,
      series: [{ name: '실적', values: hist.concat(nulls(series.H)), kind: 'actual' }],
    };
    ['Trend', 'Worst', 'Base', 'Best'].forEach(function (name) {
      spec.series.push({ name: name, values: nulls(n - 1).concat([hist[n - 1]]).concat(series[name]), kind: KIND[name] });
    });
    App.fcChart(mount, spec);
  }

  function controls() {
    var regions = [{ value: sim.TOTAL, label: '글로벌' }].concat(st.ds.regions.map(function (r) { return { value: r, label: sim.geo.regionLabel(r) }; }));
    return h('section', { class: 'panel panel--bar no-print' }, h('div', { class: 'row row--end' }, [
      w.field('지역', w.select(regions, st.view.region, function (v) { st.view.region = v; App.render(); })),
      w.field('OEM', w.select(st.ds.brands, st.view.brand, function (v) { st.view.brand = v; App.render(); })),
      h('div', { class: 'app__spacer' }),
      h('span', { class: 'muted', text: '실적은 검은 선, Trend 는 외생변수 미반영(점선), Worst · Base · Best 는 외생변수 반영' }),
    ]));
  }

  function kpis(set, r, b) {
    var yrs = set.years;
    var last = yrs.length - 1;
    var first = 0;
    var base = set.annual.Base;
    var u0 = base.brandUnits[r][b][first];
    var u1 = base.brandUnits[r][b][last];
    var c = sim.annual.cagr(u0, u1, last - first);
    var ms0 = base.share[r][b][first];
    var ms1 = base.share[r][b][last];
    var wv = set.annual.Worst.brandUnits[r][b][last];
    var bv = set.annual.Best.brandUnits[r][b][last];
    return h('div', { class: 'kpis' }, [
      w.kpi(yrs[first].label + ' 판매', fmt.compact(u0) + '대', 'M/S ' + fmt.pct(ms0, 1)),
      w.kpi(yrs[last].label + ' 판매 (Base)', fmt.compact(u1) + '대', 'CAGR ' + (isFinite(c) ? fmt.signedPct(c) : '-'), w.tone(u1 - u0)),
      w.kpi(yrs[last].label + ' M/S (Base)', fmt.pct(ms1, 1), fmt.signedPp(ms1 - ms0, 1) + ' vs ' + yrs[first].label, w.tone(ms1 - ms0)),
      w.kpi(yrs[last].label + ' Worst / Best', fmt.compact(wv) + ' / ' + fmt.compact(bv) + '대', 'Base 대비 ' + fmt.signedPct(u1 ? wv / u1 - 1 : 0) + ' / ' + fmt.signedPct(u1 ? bv / u1 - 1 : 0) + ' (자사 기준 시나리오라 OEM 에 따라 Worst 가 더 클 수 있음)'),
    ]);
  }

  function annualTable(set, r, b) {
    var yrs = set.years;
    var cols = ['', ''].concat(yrs.map(function (y) { return { label: y.label, num: true }; })).concat([{ label: 'CAGR', num: true }]);
    var rows = [];
    ['Worst', 'Base', 'Best', 'Trend'].forEach(function (n) {
      var u = set.annual[n].brandUnits[r][b];
      rows.push(['판매 (대)', n].concat(u.map(fmt.units)).concat([fmt.signedPct(sim.annual.cagr(u[0], u[u.length - 1], u.length - 1))]));
    });
    ['Worst', 'Base', 'Best'].forEach(function (n) {
      var s = set.annual[n].share[r][b];
      rows.push(['M/S', n].concat(s.map(function (v) { return fmt.pct(v, 1); })).concat([fmt.signedPp(s[s.length - 1] - s[0], 1)]));
    });
    var t = set.annual.Base.tiv[r];
    rows.push([rname(r) + ' TAM', 'Base'].concat(t.map(fmt.units)).concat([fmt.signedPct(sim.annual.cagr(t[0], t[t.length - 1], t.length - 1))]));
    return h('section', { class: 'panel' }, [w.head(b + ' 연도별 · ' + rname(r), 'A 실적 · E 실적+전망 · F 전망. M/S 의 마지막 열은 첫해 대비 %p 변화.'), w.table(cols, rows)]);
  }

  function brandTable(set, r) {
    var yrs = set.years;
    var last = yrs.length - 1;
    var base = set.annual.Base;
    var cols = ['OEM'].concat(yrs.map(function (y) { return { label: y.label + ' (Base)', num: true }; }))
      .concat([{ label: 'M/S ' + yrs[0].label + ' → ' + yrs[last].label, num: true }, { label: yrs[last].label + ' Worst / Best', num: true }]);
    var rows = st.ds.brands.map(function (b) {
      return [b].concat(base.brandUnits[r][b].map(fmt.compact))
        .concat([fmt.pct(base.share[r][b][0], 1) + ' → ' + fmt.pct(base.share[r][b][last], 1),
          fmt.compact(set.annual.Worst.brandUnits[r][b][last]) + ' / ' + fmt.compact(set.annual.Best.brandUnits[r][b][last])]);
    });
    rows.push(['TAM'].concat(base.tiv[r].map(fmt.compact)).concat(['', fmt.compact(set.annual.Worst.tiv[r][last]) + ' / ' + fmt.compact(set.annual.Best.tiv[r][last])]));
    return h('section', { class: 'panel' }, [
      w.head(rname(r) + ' OEM 별 판매 (대)', '줄을 누르면 위 차트가 그 OEM 으로 바뀝니다. Worst / Best 는 자사 기준이라, 경쟁 OEM 은 Worst 가 Best 보다 클 수 있습니다.'),
      w.table(cols, rows, {
        onRowClick: function (i) { if (i < st.ds.brands.length) { st.view.brand = st.ds.brands[i]; App.render(); } },
        selected: function (i) { return st.ds.brands[i] === st.view.brand; },
      }),
    ]);
  }

  function contributionTable(set, r, b) {
    var cards = set.build.cards.Base;
    if (!cards.length) return null;
    var cr = sim.engine.contributions(st.ds, st.bl, cards);
    var yrs = set.years.filter(function (y) { return y.kind !== 'A'; });
    var zerosA = st.ds.months.map(function () { return 0; });
    function byYear(arr) {
      return sim.annual.sumYears(yrs, zerosA, arr);
    }
    var rows = cr.items.map(function (it) { return { name: it.name, v: byYear(it.delta[r][b]) }; });
    rows.push({ name: '카드 간 중첩 효과', v: byYear(cr.interaction[r][b]) });
    var maxAbs = 0;
    rows.forEach(function (x) { x.t = x.v.reduce(function (a, c) { return a + c; }, 0); maxAbs = Math.max(maxAbs, Math.abs(x.t)); });
    var out = rows.map(function (x) {
      var pct = maxAbs ? Math.abs(x.t) / maxAbs : 0;
      var bar = h('div', { class: 'dbar' }, [
        h('span', { class: 'dbar__neg' }, x.t < 0 ? h('span', { class: 'dbar__fill dbar__fill--neg', style: { width: pct * 100 + '%' } }) : null),
        h('span', { class: 'dbar__pos' }, x.t > 0 ? h('span', { class: 'dbar__fill dbar__fill--pos', style: { width: pct * 100 + '%' } }) : null),
      ]);
      return [x.name].concat(x.v.map(fmt.signedUnits)).concat([fmt.signedUnits(x.t), bar]);
    });
    var cols = ['외생변수 (Base 값)'].concat(yrs.map(function (y) { return { label: y.label, num: true }; })).concat([{ label: '합계', num: true }, '']);
    return h('section', { class: 'panel' }, [
      w.head('외생변수별 영향 · ' + rname(r) + ' ' + b + ' 판매 (대)', '카드 한 장만 Base 값으로 켰을 때 Trend 대비 차이입니다. 2026E 는 전망 개월만 들어갑니다.'),
      w.table(cols, out),
    ]);
  }

  function ptTable(set, r) {
    var pts = st.ds.powertrains;
    if (pts.length === 1) return null;
    var res = set.results.Base;
    var T = st.ds.months.length;
    var H = res.months.length;
    var regs = r === sim.TOTAL ? st.ds.regions : [r];
    var idx12 = Math.min(H, 12) - 1;
    var rows = pts.map(function (p) {
      var last = 0;
      var tot = 0;
      regs.forEach(function (rg) {
        st.ds.brands.forEach(function (b) {
          pts.forEach(function (pp) {
            var v = st.ds.units[rg][b][pp][T - 1];
            tot += v;
            if (pp === p) last += v;
          });
        });
      });
      return [p, fmt.pct(tot ? last / tot : 0), fmt.pct(set.results.Worst.ptMix[r][p][idx12]) + ' / ' + fmt.pct(res.ptMix[r][p][idx12]) + ' / ' + fmt.pct(set.results.Best.ptMix[r][p][idx12]),
        fmt.pct(set.results.Worst.ptMix[r][p][H - 1]) + ' / ' + fmt.pct(res.ptMix[r][p][H - 1]) + ' / ' + fmt.pct(set.results.Best.ptMix[r][p][H - 1])];
    });
    return h('section', { class: 'panel' }, [
      w.head('Powertrain 비중 · ' + rname(r)),
      w.table(['Powertrain', { label: st.ds.months[T - 1] + ' 실적', num: true }, { label: res.months[idx12] + ' Worst / Base / Best', num: true }, { label: res.months[H - 1] + ' Worst / Base / Best', num: true }], rows),
    ]);
  }

  function render(root) {
    if (!st.ds) {
      root.appendChild(h('section', { class: 'panel' }, h('p', { class: 'empty', text: '먼저 데이터 탭에서 데이터를 불러오세요.' })));
      return;
    }
    var set = act.scenarioSet();
    var r = st.view.region;
    var b = st.view.brand;
    var hist = history(st.ds, set.actual);
    var x = hist.months.concat(st.bl.months);
    var H = st.bl.months.length;

    root.appendChild(controls());
    root.appendChild(kpis(set, r, b));

    var ms = { x: x, H: H };
    var units = { x: x, H: H };
    ['Trend', 'Worst', 'Base', 'Best'].forEach(function (n) {
      ms[n] = set.results[n].share[r][b];
      units[n] = set.results[n].brandUnits[r][b];
    });
    var histMs = hist.brandUnits[r][b].map(function (v, i) { return hist.tiv[r][i] ? v / hist.tiv[r][i] : 0; });
    var c1 = h('section', { class: 'panel' });
    lineChart(c1, b + ' M/S trend · ' + rname(r) + ' (월)', histMs, ms, 'percent');
    var c2 = h('section', { class: 'panel' });
    lineChart(c2, b + ' 판매 · ' + rname(r) + ' (월)', hist.brandUnits[r][b], units, 'units');
    root.appendChild(h('div', { class: 'grid-2' }, [c1, c2]));
    root.appendChild(annualTable(set, r, b));
    var ct = contributionTable(set, r, b);
    if (ct) root.appendChild(ct);
    root.appendChild(brandTable(set, r));
    var pt = ptTable(set, r);
    if (pt) root.appendChild(pt);
  }

  App.views = App.views || {};
  App.views.result = render;
})(window);
