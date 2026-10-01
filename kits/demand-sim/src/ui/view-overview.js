/* 대시보드 탭: 글로벌 TAM, 세계 지도, 지역 OEM M/S 도넛, OEM 별 디스플레이 TAM 과 자사 물량. 전역 App.views.overview. */
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
  var TIER_LABEL = { strategic: '전략', maintain: '유지' };

  function rname(r) {
    return r === sim.TOTAL ? '글로벌' : geo.regionShort(r);
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

  function controls(years) {
    var ov = st.overview;
    return h('section', { class: 'panel panel--bar' }, h('div', { class: 'row' }, [
      h('span', { class: 'bar-label', text: '연도' }),
      w.segmented(years.map(function (y, i) { return { value: i, label: y.label, title: y.kind === 'A' ? '실적' : y.kind === 'E' ? '실적 + 전망' : '전망' }; }), ov.year, function (v) { ov.year = Number(v); App.render(); }, '연도'),
      h('span', { class: 'bar-label bar-label--gap', text: '시나리오' }),
      w.segmented(act.SCN.map(function (n) { return { value: n, label: n }; }), ov.scenario, function (v) { ov.scenario = v; App.render(); }, '시나리오'),
      h('div', { class: 'app__spacer' }),
      h('span', { class: 'muted', text: years[ov.year].kind === 'A' ? '실적 연도는 시나리오와 관계없이 같습니다' : 'A 실적 · E 실적+전망 · F 전망' }),
    ]));
  }

  function kpiStrip(disp, prev, regions) {
    var T = disp[sim.TOTAL];
    var majors = regions.filter(function (r) { return r !== sim.OTHER_REGION; });
    var majTam = 0;
    majors.forEach(function (r) { majTam += disp[r].tam; });
    var items = [
      w.kpi('글로벌 차량 TAM', fmt.compact(T.vehicles) + '대', prev ? 'YoY ' + fmt.signedPct(prev[sim.TOTAL].vehicles ? T.vehicles / prev[sim.TOTAL].vehicles - 1 : 0) : '', prev ? w.tone(T.vehicles - prev[sim.TOTAL].vehicles) : ''),
    ];
    if (act.hasDisplay()) {
      items.push(w.kpi('글로벌 디스플레이 TAM', fmt.compact(T.tam) + ' EA', '평균 대당 ' + (T.vehicles ? (T.tam / T.vehicles).toFixed(2) : '-') + ' EA'));
      items.push(w.kpi('주요 ' + majors.length + '개 지역', fmt.compact(majTam) + ' EA', '디스플레이 TAM 의 ' + fmt.pct(T.tam ? majTam / T.tam : 0)));
      items.push(w.kpi(st.display.companyName + ' M/S', fmt.pct(T.share), fmt.compact(T.ours) + ' EA' + (prev ? ' · YoY ' + fmt.signedPct(prev[sim.TOTAL].ours ? T.ours / prev[sim.TOTAL].ours - 1 : 0) : ''), prev ? w.tone(T.ours - prev[sim.TOTAL].ours) : ''));
    }
    return h('div', { class: 'kpis' }, items);
  }

  function mapPanel(disp, regions) {
    var ds = st.ds;
    var maxV = 0;
    regions.forEach(function (r) { maxV = Math.max(maxV, disp[r].vehicles); });
    var mount = h('div');
    var info = App.worldMap(mount, {
      regions: regions.map(function (r) {
        return {
          key: r,
          label: geo.regionShort(r),
          value: fmt.compact(act.hasDisplay() ? disp[r].tam : disp[r].vehicles) + (act.hasDisplay() ? ' EA' : '대'),
          size: maxV ? disp[r].vehicles / maxV : 0,
          iso2: geo.regionCountries(r, ds.countries[r]),
          weights: regionWeights(r),
          muted: r === sim.OTHER_REGION,
          anchor: r === sim.OTHER_REGION ? 'max' : null,
        };
      }),
      selected: st.overview.region,
      onSelect: function (r) { st.overview.region = r; App.render(); },
    });
    var chips = h('div', { class: 'row map__chips' }, [h('button', {
      class: 'chip chip--sm' + (st.overview.region === sim.TOTAL ? ' is-on' : ''), type: 'button', text: '글로벌',
      onclick: function () { st.overview.region = sim.TOTAL; App.render(); },
    })].concat(regions.map(function (r) {
      return h('button', {
        class: 'chip chip--sm' + (st.overview.region === r ? ' is-on' : ''), type: 'button',
        text: geo.regionShort(r) + (info.unmapped.indexOf(r) >= 0 ? ' (지도에 없음)' : ''),
        onclick: function () { st.overview.region = r; App.render(); },
      });
    })));
    return h('section', { class: 'panel panel--map' }, [
      w.head('지역별 ' + (act.hasDisplay() ? '디스플레이 TAM' : '차량 TAM'), '점 크기는 차량 판매량. 지역이나 점을 누르면 오른쪽에 그 지역 OEM M/S 가 나옵니다. 옅은 색은 ' + sim.OTHER_REGION + '.'),
      mount,
      chips,
    ]);
  }

  function regionPanel(r, disp) {
    var ds = st.ds;
    var d = disp[r];
    var brands = ds.brands.slice().sort(function (a, b) { return d.brands[b].vehicles - d.brands[a].vehicles; });
    var top = brands.filter(function (b) { return b !== sim.OTHER && d.brands[b].vehicles > 0; }).slice(0, DONUT_SLICES);
    var rest = d.vehicles;
    var items = top.map(function (b) {
      rest -= d.brands[b].vehicles;
      return { label: b + (TIER_LABEL[d.brands[b].tier] ? ' · ' + TIER_LABEL[d.brands[b].tier] : ''), value: d.brands[b].vehicles, color: w.brandColor(ds, b) };
    });
    if (rest > 0.5) items.push({ label: '그 외 OEM', value: rest, color: 'var(--c-border-strong)' });
    var mount = h('div');
    App.donut(mount, {
      items: items,
      centerTitle: rname(r) + ' 차량 TAM',
      centerValue: fmt.compact(d.vehicles) + '대',
      format: function (v) { return fmt.units(v) + ' 대'; },
    });
    var kpis = [w.kpi('차량 TAM', fmt.compact(d.vehicles) + '대', '')];
    if (act.hasDisplay()) {
      kpis.push(w.kpi('디스플레이 TAM', fmt.compact(d.tam) + ' EA', ''));
      kpis.push(w.kpi(st.display.companyName + ' M/S', fmt.pct(d.share), fmt.compact(d.ours) + ' EA'));
    }
    return h('section', { class: 'panel' }, [
      w.head((r === sim.TOTAL ? '글로벌' : geo.regionLabel(r)) + ' OEM M/S', '차량 판매 기준 상위 ' + DONUT_SLICES + '개 OEM. 전체 목록은 아래에 있습니다.'),
      h('div', { class: 'kpis kpis--compact' }, kpis),
      mount,
    ]);
  }

  function displayPanel(r, disp) {
    var ds = st.ds;
    var name = st.display.companyName;
    if (!act.hasDisplay()) {
      return h('section', { class: 'panel' }, [
        w.head('OEM 별 디스플레이 TAM 과 ' + name + ' 물량'),
        h('div', { class: 'empty-cta' }, [
          h('p', { text: 'OEM 별 대당 디스플레이와 브랜드 내 자사 M/S 를 넣으면 디스플레이 TAM 과 ' + name + ' M/S 가 나옵니다.' }),
          h('button', { class: 'btn btn--primary btn--sm', type: 'button', text: '디스플레이 가정 넣기', onclick: function () { st.tab = 'data'; App.render(); setTimeout(function () { var el = document.getElementById('display-panel'); if (el) el.scrollIntoView(); }, 0); } }),
        ]),
      ]);
    }
    var d = disp[r];
    var rows = ds.brands.filter(function (b) { return d.brands[b].tam > 0; }).sort(function (a, b) { return d.brands[b].tam - d.brands[a].tam; });
    var max = 0;
    rows.forEach(function (b) { max = Math.max(max, d.brands[b].tam); });
    var list = h('div', { class: 'sbar-list', role: 'table', 'aria-label': 'OEM 별 디스플레이 TAM 과 자사 물량' }, [
      h('div', { class: 'sbar sbar--head', role: 'row' }, [
        h('span', { role: 'columnheader', text: 'OEM' }),
        h('span', { role: 'columnheader', text: '디스플레이 TAM (진한 부분이 ' + name + ')' }),
        h('span', { class: 'num', role: 'columnheader', text: 'TAM (EA)' }),
        h('span', { class: 'num', role: 'columnheader', text: name + ' (EA)' }),
        h('span', { class: 'num', role: 'columnheader', text: '자사 M/S' }),
      ]),
    ].concat(rows.map(function (b) {
      var x = d.brands[b];
      return h('div', { class: 'sbar', role: 'row', title: b + ': 대당 ' + x.panels + ' EA, 브랜드 내 자사 M/S ' + fmt.pct(x.share) + (x.source === 'default' ? ' (기본값)' : x.source === 'region' ? ' (지역 예외)' : '') }, [
        h('span', { class: 'sbar__name', role: 'cell' }, [
          h('span', { class: 'swatch', style: { background: w.brandColor(ds, b) } }), b,
          TIER_LABEL[x.tier] ? h('span', { class: 'tier tier--' + x.tier, text: TIER_LABEL[x.tier] }) : null,
        ]),
        h('span', { class: 'sbar__track', role: 'cell' }, h('span', { class: 'sbar__total', style: { width: (max ? (x.tam / max) * 100 : 0) + '%' } }, h('span', { class: 'sbar__ours', style: { width: (x.share * 100) + '%' } }))),
        h('span', { class: 'num', role: 'cell', text: fmt.compact(x.tam) }),
        h('span', { class: 'num', role: 'cell', text: fmt.compact(x.ours) }),
        h('span', { class: 'num', role: 'cell', text: fmt.pct(x.share) + (x.source === 'default' ? '*' : '') }),
      ]);
    })));
    var tiers = sim.display.TIERS.map(function (t) {
      var x = d.tiers[t.key];
      return t.label + ' ' + fmt.pct(d.ours ? x.ours / d.ours : 0);
    }).join(' · ');
    return h('section', { class: 'panel' }, [
      w.head((r === sim.TOTAL ? '글로벌' : geo.regionLabel(r)) + ' OEM 별 디스플레이 TAM 과 ' + name + ' 물량',
        '디스플레이 TAM ' + fmt.compact(d.tam) + ' EA 중 ' + name + ' ' + fmt.compact(d.ours) + ' EA (M/S ' + fmt.pct(d.share) + '). ' + name + ' 물량 구성: ' + tiers),
      list,
      rows.some(function (b) { return d.brands[b].source === 'default'; }) ? h('p', { class: 'field__hint', text: '* 가정이 없어 기본값(대당 ' + st.display.defaultPanels + ' EA, 자사 M/S ' + fmt.pct(st.display.defaultShare) + ')을 쓴 OEM' }) : null,
    ]);
  }

  function regionTable(regions, disp, prev) {
    var showDisp = act.hasDisplay();
    var cols = ['지역', { label: '차량 TAM', num: true }];
    if (prev) cols.push({ label: 'YoY', num: true });
    if (showDisp) cols = cols.concat([{ label: '디스플레이 TAM (EA)', num: true }, { label: st.display.companyName + ' 물량 (EA)', num: true }, { label: st.display.companyName + ' M/S', num: true }]);
    var majors = regions.filter(function (r) { return r !== sim.OTHER_REGION; });
    function sumOf(list, key, src) {
      var s = 0;
      list.forEach(function (r) { s += src[r][key]; });
      return s;
    }
    function row(label, veh, pveh, tam, ours) {
      var out = [label, fmt.units(veh)];
      if (prev) out.push(fmt.signedPct(pveh ? veh / pveh - 1 : 0));
      if (showDisp) out = out.concat([fmt.units(tam), fmt.units(ours), fmt.pct(tam ? ours / tam : 0)]);
      return out;
    }
    var keys = regions.slice();
    var rows = keys.map(function (r) {
      return row(geo.regionLabel(r), disp[r].vehicles, prev && prev[r].vehicles, disp[r].tam, disp[r].ours);
    });
    rows.push(row('주요 ' + majors.length + '개 지역 합계', sumOf(majors, 'vehicles', disp), prev && sumOf(majors, 'vehicles', prev), sumOf(majors, 'tam', disp), sumOf(majors, 'ours', disp)));
    rows.push(row('글로벌', disp[sim.TOTAL].vehicles, prev && prev[sim.TOTAL].vehicles, disp[sim.TOTAL].tam, disp[sim.TOTAL].ours));
    return h('section', { class: 'panel' }, [
      w.head('지역 비교', '줄을 누르면 그 지역을 봅니다.'),
      w.table(cols, rows, {
        onRowClick: function (i) { if (i < keys.length) { st.overview.region = keys[i]; App.render(); } else if (i === keys.length + 1) { st.overview.region = sim.TOTAL; App.render(); } },
        selected: function (i) { return keys[i] === st.overview.region || (i === keys.length + 1 && st.overview.region === sim.TOTAL); },
      }),
    ]);
  }

  function render(root) {
    if (!st.ds) {
      root.appendChild(h('section', { class: 'panel' }, h('p', { class: 'empty', text: '먼저 데이터 탭에서 데이터를 불러오세요.' })));
      return;
    }
    var set = act.scenarioSet();
    var years = set.years;
    var ov = st.overview;
    if (!(ov.year >= 0 && ov.year < years.length)) ov.year = act.defaultYear(years);
    var disp = act.displayFor(ov.scenario, ov.year);
    var prev = ov.year > 0 ? act.displayFor(ov.scenario, ov.year - 1) : null;
    var regions = st.ds.regions.slice();
    if (ov.region !== sim.TOTAL && regions.indexOf(ov.region) < 0) ov.region = regions[0];

    root.appendChild(controls(years));
    root.appendChild(kpiStrip(disp, prev, regions));
    root.appendChild(h('div', { class: 'grid-main' }, [mapPanel(disp, regions), regionPanel(ov.region, disp)]));
    root.appendChild(displayPanel(ov.region, disp));
    root.appendChild(regionTable(regions, disp, prev));
  }

  App.views = App.views || {};
  App.views.overview = render;
})(window);
