/* 보고서 탭: 인쇄용 한 장. 전역 App.views.report.
 * 화면 위쪽 설정 막대는 인쇄에서 빠지고(no-print) 아래 본문만 종이에 나옵니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var w = App.w;
  var fmt = App.fmt;
  var sim = App.sim;
  var S = sim.shocks;
  var st = App.state;
  var act = App.actions;
  var V = App.views;

  var SCN_COLORS = ['scenario', 'line2', 'line3'];

  function rname(r) {
    return r === sim.TOTAL ? '전체 지역' : sim.geo.regionShort(r);
  }

  /** 우리 디스플레이: 지역별 앞으로 1년 디스플레이 수요와 우리 몫 */
  function displayTable(scns, results, base) {
    var name = st.display.companyName;
    var bd = sim.display.compute(st.ds, sim.display.sumVehicles(st.ds, base.brandUnits, 0, 12), st.display);
    var sd = results.map(function (res) { return sim.display.compute(st.ds, sim.display.sumVehicles(st.ds, res.brandUnits, 0, 12), st.display); });
    var cols = ['지역', { label: '디스플레이 수요 (기본 전망, 장)', num: true }, { label: name + ' 몫 (기본 전망)', num: true }, { label: name + ' 점유율', num: true }];
    scns.forEach(function (s) { cols.push({ label: name + ' 몫 · ' + s.name, num: true }); });
    var rows = st.ds.regions.concat([sim.TOTAL]).map(function (r) {
      var row = [rname(r), fmt.units(bd[r].tam), fmt.units(bd[r].ours), fmt.pct(bd[r].share)];
      sd.forEach(function (d) { row.push(fmt.units(d[r].ours) + ' (' + fmt.signedUnits(d[r].ours - bd[r].ours) + ')'); });
      return row;
    });
    return w.table(cols, rows);
  }

  function chosen() {
    var ids = st.report.compare.filter(function (id) { return st.scenarios.some(function (s) { return s.id === id; }); });
    if (!ids.length) ids = [st.activeId];
    return ids.map(function (id) { return act.scenario(id); }).slice(0, 3);
  }

  function settingsBar() {
    var title = h('input', { class: 'input input--sm input--wide', value: st.report.title, 'aria-label': '보고서 제목' });
    title.addEventListener('change', function () { st.report.title = title.value; act.persist(); App.render(); });
    var picks = h('div', { class: 'row row--tight' }, st.scenarios.map(function (s) {
      var cb = h('input', { type: 'checkbox' });
      cb.checked = chosen().some(function (x) { return x.id === s.id; });
      cb.addEventListener('change', function () {
        var cur = chosen().map(function (x) { return x.id; }).filter(function (id) { return id !== s.id; });
        if (cb.checked) cur.push(s.id);
        if (cur.length > 3) { App.ui.toast('시나리오는 세 개까지 비교합니다.', 'warn'); cb.checked = false; return; }
        st.report.compare = cur;
        act.persist();
        App.render();
      });
      return h('label', { class: 'check' }, [cb, s.name]);
    }));
    var all = h('input', { type: 'checkbox' });
    all.checked = !!st.report.allBrands;
    all.addEventListener('change', function () { st.report.allBrands = all.checked; act.persist(); App.render(); });
    return h('section', { class: 'panel panel--bar no-print' }, [
      h('div', { class: 'row' }, [
        w.field('제목', title),
        w.field('중심 브랜드', w.select(st.ds.brands, st.report.focus, function (v) { st.report.focus = v; act.persist(); App.render(); })),
        w.field('비교 시나리오 (최대 3)', picks),
        w.field('부록', h('label', { class: 'check' }, [all, '지역별 전 브랜드 표'])),
        h('div', { class: 'app__spacer' }),
        h('button', { class: 'btn btn--sm', type: 'button', text: '결과 CSV 내려받기', onclick: function () {
          var name = App.io.exportResults(chosen());
          App.ui.toast(name + ' 로 내려받았습니다.', 'ok');
        } }),
        h('button', { class: 'btn btn--sm btn--primary', type: 'button', text: '인쇄 / PDF', onclick: function () { window.print(); } }),
      ]),
      h('p', { class: 'panel__hint', text: '인쇄 창에서 "PDF 로 저장" 을 고르면 파일이 됩니다. 가능 범위 띠는 결과 탭에서 계산한 시나리오에만 나옵니다.' }),
    ]);
  }

  function regionChart(mount, r, focus, scns, results, base, hist) {
    var n = hist.months.length;
    var x = hist.months.concat(st.bl.months);
    function fut(vals) {
      var a = [];
      for (var i = 0; i < n - 1; i++) a.push(null);
      a.push(hist.brandUnits[r][focus][n - 1]);
      return a.concat(vals);
    }
    var series = [
      { name: '실적', values: hist.brandUnits[r][focus].concat(st.bl.months.map(function () { return null; })), kind: 'actual' },
      { name: '기본 전망', values: fut(base.brandUnits[r][focus]), kind: 'baseline' },
    ];
    scns.forEach(function (s, i) {
      series.push({ name: s.name, values: fut(results[i].brandUnits[r][focus]), kind: SCN_COLORS[i] });
    });
    var spec = { title: rname(r), x: x, splitAt: n, series: series, height: 150 };
    var mc = scns.length === 1 ? act.mcResult(scns[0]) : null;
    if (mc) {
      var pad = hist.months.map(function () { return null; });
      spec.band = { name: '가능 범위 (10~90%)', lo: pad.concat(mc.brandUnits[r][focus].p10), hi: pad.concat(mc.brandUnits[r][focus].p90) };
    }
    App.fcChart(mount, spec);
  }

  function summaryTable(focus, scns, results, base, hist) {
    var H = st.bl.months.length;
    var hEnd = H - 1;
    var cols = ['지역', { label: '최근 1년 실적', num: true }, { label: '앞으로 1년 기본 전망', num: true }];
    scns.forEach(function (s) { cols.push({ label: s.name, num: true }); });
    cols.push({ label: st.bl.months[hEnd] + ' 점유율 기본 전망', num: true });
    scns.forEach(function (s) { cols.push({ label: s.name, num: true }); });
    var rows = st.ds.regions.concat([sim.TOTAL]).map(function (r) {
      var last12 = V.sumRange(hist.brandUnits[r][focus], hist.months.length - 12, hist.months.length);
      var b12 = V.sumRange(base.brandUnits[r][focus], 0, 12);
      var row = [rname(r), fmt.units(last12), fmt.units(b12)];
      results.forEach(function (res) {
        var s12 = V.sumRange(res.brandUnits[r][focus], 0, 12);
        row.push(fmt.units(s12) + ' (' + fmt.signedPct(b12 ? s12 / b12 - 1 : 0) + ')');
      });
      row.push(fmt.pct(base.share[r][focus][hEnd], 2));
      results.forEach(function (res) {
        row.push(fmt.pct(res.share[r][focus][hEnd], 2) + ' (' + fmt.signedPp(res.share[r][focus][hEnd] - base.share[r][focus][hEnd]) + ')');
      });
      return row;
    });
    return w.table(cols, rows);
  }

  function cardsTable(scn) {
    if (!scn.cards.length) return h('p', { class: 'empty', text: '카드 없음 (기본 전망과 같음)' });
    return w.table(['', '카드', '내용', '근거'], scn.cards.map(function (c) {
      return [c.enabled ? '사용' : '끔', c.name, S.describe(c), c.note || ''];
    }));
  }

  function contributionMatrix(scn, focus) {
    var cr = sim.engine.contributions(st.ds, st.bl, scn.cards);
    if (!cr.items.length) return null;
    var H = st.bl.months.length;
    var keys = st.ds.regions.concat([sim.TOTAL]);
    var cols = ['카드'].concat(keys.map(function (k) { return { label: rname(k), num: true }; }));
    var rows = cr.items.map(function (it) {
      return [it.name].concat(keys.map(function (k) { return fmt.signedUnits(V.sumRange(it.delta[k][focus], 0, H)); }));
    });
    rows.push(['카드끼리 겹치는 효과'].concat(keys.map(function (k) { return fmt.signedUnits(V.sumRange(cr.interaction[k][focus], 0, H)); })));
    return h('div', { class: 'report__block' }, [
      h('h3', { class: 'report__h3', text: scn.name + ': 카드별 ' + focus + ' 판매 영향 (전망 ' + H + '개월 합계, 대)' }),
      w.table(cols, rows),
    ]);
  }

  function allBrandTables(scns, results, base, hist) {
    var res = results[0];
    return st.ds.regions.concat([sim.TOTAL]).map(function (r) {
      var rows = st.ds.brands.map(function (b) {
        var last12 = V.sumRange(hist.brandUnits[r][b], hist.months.length - 12, hist.months.length);
        var b12 = V.sumRange(base.brandUnits[r][b], 0, 12);
        var s12 = V.sumRange(res.brandUnits[r][b], 0, 12);
        return [b, fmt.units(last12), fmt.units(b12), fmt.units(s12), fmt.signedPct(b12 ? s12 / b12 - 1 : 0)];
      });
      return h('div', { class: 'report__block report__block--avoid' }, [
        h('h3', { class: 'report__h3', text: rname(r) + ' 브랜드별 (' + scns[0].name + ')' }),
        w.table(['브랜드', { label: '최근 1년', num: true }, { label: '앞으로 1년 기본 전망', num: true }, { label: '시나리오', num: true }, { label: '차이', num: true }], rows),
      ]);
    });
  }

  function render(root) {
    if (!st.ds) {
      root.appendChild(h('section', { class: 'panel' }, h('p', { class: 'empty', text: '먼저 데이터 탭에서 데이터를 불러오세요.' })));
      return;
    }
    var scns = chosen();
    var base = act.baseResult();
    var results = scns.map(function (s) { return act.result(s); });
    var hist = V.history(st.ds);
    var focus = st.report.focus;
    var ds = st.ds;
    var o = st.bl.options;
    var today = new Date();
    var examples = scns.some(function (s) { return s.cards.some(function (c) { return c.enabled && /^\(예시\)/.test(c.name); }); });

    root.appendChild(settingsBar());
    var paper = h('article', { class: 'report' });
    paper.appendChild(h('header', { class: 'report__head' }, [
      h('h1', { class: 'report__title', text: st.report.title }),
      h('div', { class: 'report__meta', text: '작성 ' + today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0') +
        ' · 실적 ' + ds.months[0] + ' ~ ' + ds.months[ds.months.length - 1] + ' · 예측 ' + st.bl.months[0] + ' ~ ' + st.bl.months[st.bl.months.length - 1] +
        ' · 중심 브랜드 ' + focus + (st.source === 'sample' ? ' · 예시 데이터' : '') }),
    ]));
    if (examples) paper.appendChild(w.notes([{ level: 'warn', message: '"(예시)" 카드가 들어 있습니다. 값이 자리표시라 그대로 보고하면 안 됩니다.' }]));

    paper.appendChild(h('h2', { class: 'report__h2', text: '1. 요약: ' + focus }));
    paper.appendChild(summaryTable(focus, scns, results, base, hist));

    if (act.hasDisplay()) {
      paper.appendChild(h('h2', { class: 'report__h2', text: '1-1. ' + st.display.companyName + ' 디스플레이 (앞으로 1년)' }));
      paper.appendChild(displayTable(scns, results, base));
      paper.appendChild(h('p', { class: 'report__note', text: '디스플레이 수요 = 차량 판매 x 브랜드별 대당 디스플레이 수, ' + st.display.companyName + ' 몫 = 디스플레이 수요 x 브랜드별 공급 비중 (데이터 탭 5번 가정).' }));
    }

    var grid = h('div', { class: 'report__charts' });
    ds.regions.concat([sim.TOTAL]).forEach(function (r) {
      var cell = h('div', { class: 'report__chart' });
      var any = hist.brandUnits[r][focus].concat(base.brandUnits[r][focus]).some(function (v) { return v > 0; });
      if (!any) {
        cell.appendChild(h('div', { class: 'fc__title', text: rname(r) }));
        cell.appendChild(h('p', { class: 'empty', text: focus + ' 판매가 없는 지역입니다.' }));
        grid.appendChild(cell);
        return;
      }
      regionChart(cell, r, focus, scns, results, base, hist);
      grid.appendChild(cell);
    });
    paper.appendChild(h('h2', { class: 'report__h2', text: '2. 지역별 월 판매: ' + focus }));
    paper.appendChild(grid);

    paper.appendChild(h('h2', { class: 'report__h2', text: '3. 시나리오 가정' }));
    scns.forEach(function (s) {
      paper.appendChild(h('div', { class: 'report__block' }, [
        h('h3', { class: 'report__h3', text: s.name }),
        s.notes ? h('p', { class: 'report__p', text: s.notes }) : null,
        cardsTable(s),
      ]));
    });

    paper.appendChild(h('h2', { class: 'report__h2', text: '4. 카드별 영향' }));
    scns.forEach(function (s) {
      var m = contributionMatrix(s, focus);
      if (m) paper.appendChild(m);
    });

    if (st.report.allBrands) {
      paper.appendChild(h('h2', { class: 'report__h2', text: '부록. 지역별 전 브랜드' }));
      allBrandTables(scns, results, base, hist).forEach(function (el) { paper.appendChild(el); });
    }

    paper.appendChild(h('footer', { class: 'report__foot' }, [
      h('p', { text: '계산 방법: 브랜드 판매 = 지역 시장 전체 판매 x 동력원(전기차, 하이브리드 등) 비중 x 그 동력원 안 브랜드 점유율.' }),
      h('p', { text: '기본 전망: 시장 전체 판매는 최근 1년 수준에 연간 성장률(' +
        ds.regions.map(function (r) { return rname(r) + ' ' + fmt.signedPct(st.bl.growthUsed[r]); }).join(', ') + ')과 계절 차이를 반영했고, 점유율은 최근 ' + o.trendWindow + '개월 흐름을 점점 약하게 이어 갔습니다.' }),
      h('p', { text: '변수 카드는 점유율이 0~100% 를 벗어나지 않고 합이 100% 가 되도록 반영했습니다. 브랜드 카드로 늘어난 몫은 같은 차종의 경쟁 브랜드에서 옵니다. 가능 범위는 카드별 가능성과 영향 범위를 무작위로 뽑아 계산한 결과의 가운데 80% 입니다.' }),
      h('p', { text: '지켜볼 브랜드 ' + (ds.brands.length - 1) + '개 외는 "기타" 로 합쳤습니다. 월별 동력원 판매는 분기 자료를 나눈 추정치입니다.' }),
    ]));
    root.appendChild(paper);
  }

  App.views = App.views || {};
  App.views.report = render;
})(window);
