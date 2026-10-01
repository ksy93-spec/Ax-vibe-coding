/* 한눈에 보기 탭: 세계 지도, 지역별 브랜드 점유율 도넛, 브랜드별 디스플레이 수요와 우리 몫. 전역 App.views.overview. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var w = App.w;
  var fmt = App.fmt;
  var sim = App.sim;
  var geo = sim.geo;
  var st = App.state;
  var act = App.actions;

  var DONUT_SLICES = 5; // + "그 외" = 6조각

  /** 고른 기간의 지역 -> 브랜드 -> 차량 대수 */
  function vehiclesFor(period) {
    var ds = st.ds;
    if (period === 'actual') {
      var T = ds.months.length;
      return sim.display.sumVehicles(ds, act.actualSeries(), T - 12, T);
    }
    var res = period === 'scenario' ? act.result(act.scenario()) : act.baseResult();
    return sim.display.sumVehicles(ds, res.brandUnits, 0, 12);
  }

  function periodLabel(period) {
    var ds = st.ds;
    if (period === 'actual') return '최근 1년 실적 (' + sim.util.addMonths(ds.months[ds.months.length - 1], -11) + ' ~ ' + ds.months[ds.months.length - 1] + ')';
    var m = st.bl.months;
    var span = m[0] + ' ~ ' + m[Math.min(11, m.length - 1)];
    return period === 'scenario' ? '앞으로 1년, ' + act.scenario().name + ' (' + span + ')' : '앞으로 1년 기본 전망 (' + span + ')';
  }

  function regionWeights(r) {
    var ds = st.ds;
    var T = ds.months.length;
    var wts = {};
    Object.keys(ds.countryUnits[r] || {}).forEach(function (c) {
      var list = geo.regionCountries(c, [c]);
      if (list.length !== 1) return;
      var v = 0;
      ds.brands.forEach(function (b) {
        var a = ds.countryUnits[r][c][b];
        for (var t = Math.max(0, T - 12); t < T; t++) v += a[t];
      });
      wts[list[0]] = (wts[list[0]] || 0) + v;
    });
    return Object.keys(wts).length ? wts : null;
  }

  function controls() {
    var opts = [
      { value: 'actual', label: '최근 1년 실적' },
      { value: 'base', label: '앞으로 1년 · 기본 전망', title: '변수 카드 없이 지금 흐름이 이어질 때' },
      { value: 'scenario', label: '앞으로 1년 · ' + act.scenario().name, title: '시나리오 탭에서 고른 시나리오' },
    ];
    return h('section', { class: 'panel panel--bar' }, h('div', { class: 'row' }, [
      h('span', { class: 'bar-label', text: '기간' }),
      w.segmented(opts, st.overview.period, function (v) { st.overview.period = v; App.render(); }, '기간'),
      h('div', { class: 'app__spacer' }),
      h('span', { class: 'muted', text: periodLabel(st.overview.period) }),
    ]));
  }

  function mapPanel(veh, disp, regions) {
    var ds = st.ds;
    var maxV = 0;
    regions.forEach(function (r) { maxV = Math.max(maxV, disp[r].vehicles); });
    var mount = h('div');
    var info = App.worldMap(mount, {
      regions: regions.map(function (r) {
        return {
          key: r,
          label: geo.regionShort(r),
          value: fmt.compact(disp[r].vehicles) + '대',
          size: maxV ? disp[r].vehicles / maxV : 0,
          iso2: geo.regionCountries(r, ds.countries[r]),
          weights: regionWeights(r),
        };
      }),
      selected: st.overview.region,
      onSelect: function (r) { st.overview.region = r; App.render(); },
    });
    var chips = h('div', { class: 'row map__chips' }, regions.map(function (r) {
      return h('button', {
        class: 'chip chip--sm' + (st.overview.region === r ? ' is-on' : ''), type: 'button',
        text: geo.regionShort(r) + (info.unmapped.indexOf(r) >= 0 ? ' (지도에 없음)' : ''),
        onclick: function () { st.overview.region = r; App.render(); },
      });
    }));
    return h('section', { class: 'panel panel--map' }, [
      w.head('주요 지역', '점 크기는 차량 판매량입니다. 지역이나 점을 누르면 오른쪽에 그 지역의 브랜드 구성이 나옵니다.'),
      mount,
      chips,
    ]);
  }

  function regionPanel(r, veh, disp) {
    var ds = st.ds;
    var d = disp[r];
    var brands = ds.brands.slice().sort(function (a, b) { return d.brands[b].vehicles - d.brands[a].vehicles; });
    var top = brands.filter(function (b) { return b !== sim.OTHER && d.brands[b].vehicles > 0; }).slice(0, DONUT_SLICES);
    var rest = d.vehicles;
    var items = top.map(function (b) {
      rest -= d.brands[b].vehicles;
      return { label: b, value: d.brands[b].vehicles, color: w.brandColor(ds, b) };
    });
    if (rest > 0.5) items.push({ label: '그 외 (기타 포함)', value: rest, color: 'var(--c-border-strong)' });
    var mount = h('div');
    App.donut(mount, {
      items: items,
      centerTitle: geo.regionShort(r) + ' 판매',
      centerValue: fmt.compact(d.vehicles) + '대',
      format: function (v) { return fmt.units(v) + ' 대'; },
    });
    var kpis = [w.kpi('차량 판매', fmt.compact(d.vehicles) + '대', '1년 합계')];
    if (act.hasDisplay()) {
      kpis.push(w.kpi('디스플레이 수요', fmt.compact(d.tam) + '장', '차량 x 대당 디스플레이 수'));
      kpis.push(w.kpi(st.display.companyName + ' 점유율', fmt.pct(d.share), fmt.compact(d.ours) + '장', ''));
    }
    return h('section', { class: 'panel' }, [
      w.head(geo.regionLabel(r) + ' 브랜드 구성', '판매 상위 ' + DONUT_SLICES + '개 브랜드와 나머지. 전체 목록은 아래 표에 있습니다.'),
      h('div', { class: 'kpis kpis--compact' }, kpis),
      mount,
    ]);
  }

  /** 브랜드별 디스플레이 수요 막대: 전체 길이 = 수요, 진한 부분 = 우리 몫 */
  function displayPanel(r, disp) {
    var ds = st.ds;
    if (!act.hasDisplay()) {
      return h('section', { class: 'panel' }, [
        w.head('브랜드별 디스플레이 수요와 ' + st.display.companyName + ' 몫'),
        h('div', { class: 'empty-cta' }, [
          h('p', { text: '브랜드별 대당 디스플레이 수와 우리 공급 비중을 넣으면 이 지역 디스플레이 시장에서 우리가 차지하는 몫이 나옵니다.' }),
          h('button', { class: 'btn btn--primary btn--sm', type: 'button', text: '디스플레이 가정 넣으러 가기', onclick: function () { st.tab = 'data'; App.render(); setTimeout(function () { var el = document.getElementById('display-panel'); if (el) el.scrollIntoView(); }, 0); } }),
        ]),
      ]);
    }
    var d = disp[r];
    var rows = ds.brands.filter(function (b) { return d.brands[b].tam > 0; }).sort(function (a, b) { return d.brands[b].tam - d.brands[a].tam; });
    var max = 0;
    rows.forEach(function (b) { max = Math.max(max, d.brands[b].tam); });
    var list = h('div', { class: 'sbar-list', role: 'table', 'aria-label': '브랜드별 디스플레이 수요와 우리 몫' }, [
      h('div', { class: 'sbar sbar--head', role: 'row' }, [
        h('span', { role: 'columnheader', text: '브랜드' }),
        h('span', { role: 'columnheader', text: '디스플레이 수요 (진한 부분이 ' + st.display.companyName + ')' }),
        h('span', { class: 'num', role: 'columnheader', text: '수요' }),
        h('span', { class: 'num', role: 'columnheader', text: st.display.companyName + ' 몫' }),
        h('span', { class: 'num', role: 'columnheader', text: st.display.companyName + ' 비중' }),
      ]),
    ].concat(rows.map(function (b) {
      var x = d.brands[b];
      var widthPct = max ? (x.tam / max) * 100 : 0;
      return h('div', { class: 'sbar', role: 'row', title: b + ': 대당 ' + x.panels + '장, 공급 비중 ' + fmt.pct(x.share) + (x.source === 'default' ? ' (기본값)' : x.source === 'region' ? ' (이 지역 값)' : '') }, [
        h('span', { class: 'sbar__name', role: 'cell' }, [h('span', { class: 'swatch', style: { background: w.brandColor(ds, b) } }), b]),
        h('span', { class: 'sbar__track', role: 'cell' }, h('span', { class: 'sbar__total', style: { width: widthPct + '%' } }, h('span', { class: 'sbar__ours', style: { width: (x.share * 100) + '%' } }))),
        h('span', { class: 'num', role: 'cell', text: fmt.compact(x.tam) }),
        h('span', { class: 'num', role: 'cell', text: fmt.compact(x.ours) }),
        h('span', { class: 'num', role: 'cell', text: fmt.pct(x.share) + (x.source === 'default' ? '*' : '') }),
      ]);
    })));
    var hasDefault = rows.some(function (b) { return d.brands[b].source === 'default'; });
    return h('section', { class: 'panel' }, [
      w.head(geo.regionLabel(r) + ' 디스플레이 수요와 ' + st.display.companyName + ' 몫',
        '디스플레이 수요 ' + fmt.compact(d.tam) + '장 중 ' + st.display.companyName + ' ' + fmt.compact(d.ours) + '장 (' + fmt.pct(d.share) + ')'),
      list,
      hasDefault ? h('p', { class: 'field__hint', text: '* 가정을 넣지 않아 기본값(대당 ' + st.display.defaultPanels + '장, 비중 ' + fmt.pct(st.display.defaultShare) + ')을 쓴 브랜드' }) : null,
    ]);
  }

  function regionTable(regions, disp, dispActual) {
    var showDisp = act.hasDisplay();
    var cmp = st.overview.period !== 'actual';
    var cols = ['지역', { label: '차량 판매', num: true }];
    if (cmp) cols.push({ label: '최근 1년 대비', num: true });
    if (showDisp) cols = cols.concat([{ label: '디스플레이 수요', num: true }, { label: st.display.companyName + ' 몫', num: true }, { label: st.display.companyName + ' 점유율', num: true }]);
    var keys = regions.concat([sim.TOTAL]);
    var rows = keys.map(function (r) {
      var d = disp[r];
      var row = [r === sim.TOTAL ? '전체' : geo.regionLabel(r), fmt.units(d.vehicles)];
      if (cmp) row.push(fmt.signedPct(dispActual[r].vehicles ? d.vehicles / dispActual[r].vehicles - 1 : 0));
      if (showDisp) row = row.concat([fmt.units(d.tam), fmt.units(d.ours), fmt.pct(d.share)]);
      return row;
    });
    return h('section', { class: 'panel' }, [
      w.head('지역 비교', '행을 누르면 그 지역을 봅니다.'),
      w.table(cols, rows, {
        onRowClick: function (i) { if (keys[i] !== sim.TOTAL) { st.overview.region = keys[i]; App.render(); } },
        selected: function (i) { return keys[i] === st.overview.region; },
      }),
    ]);
  }

  function render(root) {
    if (!st.ds) {
      root.appendChild(h('section', { class: 'panel' }, h('p', { class: 'empty', text: '먼저 데이터 탭에서 데이터를 불러오세요.' })));
      return;
    }
    var period = st.overview.period;
    var veh = vehiclesFor(period);
    var disp = sim.display.compute(st.ds, veh, st.display);
    var dispActual = period === 'actual' ? disp : sim.display.compute(st.ds, vehiclesFor('actual'), st.display);
    var regions = st.ds.regions.slice().sort(function (a, b) { return disp[b].vehicles - disp[a].vehicles; });
    if (regions.indexOf(st.overview.region) < 0) st.overview.region = regions[0];
    var r = st.overview.region;

    root.appendChild(controls());
    root.appendChild(h('div', { class: 'grid-main' }, [mapPanel(veh, disp, regions), regionPanel(r, veh, disp)]));
    root.appendChild(displayPanel(r, disp));
    root.appendChild(regionTable(regions, disp, dispActual));
  }

  App.views = App.views || {};
  App.views.overview = render;
})(window);
