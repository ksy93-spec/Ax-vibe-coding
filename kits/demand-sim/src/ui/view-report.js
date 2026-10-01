/* 임원 보고서 탭: 한 장 요약. 전역 App.views.report.
 * 순서: ① 디스플레이 TAM 과 주요 지역 ② 자사 M/S ③ 고객 구분(전략 / 유지) ④ 고객 수요 전망 ⑤ 시나리오 가정
 * 위쪽 설정 막대는 인쇄에서 빠지고(no-print) 아래 본문만 종이에 나옵니다.
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

  var TIER_COLOR = { strategic: 'var(--viz-1)', maintain: 'var(--viz-3)', other: 'var(--c-border-strong)' };

  function rname(r) {
    return r === sim.TOTAL ? '글로벌' : sim.geo.regionShort(r);
  }

  function regionColor(r, i) {
    return r === sim.OTHER_REGION ? 'var(--c-border-strong)' : 'var(--viz-' + ((i % 8) + 1) + ')';
  }

  function settingsBar(years) {
    var title = h('input', { class: 'input input--sm input--wide', value: st.report.title, 'aria-label': '보고서 제목' });
    title.addEventListener('change', function () { st.report.title = title.value; act.persist(); App.render(); });
    return h('section', { class: 'panel panel--bar no-print' }, [
      h('div', { class: 'row row--end' }, [
        w.field('제목', title),
        w.field('기준 연도', w.segmented(years.map(function (y, i) { return { value: i, label: y.label }; }), st.report.year, function (v) { st.report.year = Number(v); App.render(); }, '기준 연도')),
        h('div', { class: 'app__spacer' }),
        h('button', { class: 'btn btn--sm', type: 'button', text: '결과 CSV (연·월)', onclick: function () {
          var n = App.io.exportResults();
          App.ui.toast(n + ' 외 1개 파일을 내려받았습니다.', 'ok');
        } }),
        h('button', { class: 'btn btn--sm btn--primary', type: 'button', text: '인쇄 / PDF', onclick: function () { window.print(); } }),
      ]),
      h('p', { class: 'panel__hint', text: '인쇄 창에서 "PDF 로 저장" 을 고르면 파일이 됩니다. 숫자는 Base 기준이고, 범위는 Worst ~ Best 입니다.' }),
    ]);
  }

  function section(num, title, lead, body) {
    return h('section', { class: 'xsec' }, [
      h('div', { class: 'xsec__head' }, [h('span', { class: 'xsec__num', text: num }), h('h2', { class: 'xsec__title', text: title })]),
      lead ? h('p', { class: 'xsec__lead', html: lead }) : null,
      body,
    ]);
  }

  function b(text) {
    return '<strong>' + String(text).replace(/[<&]/g, function (c) { return c === '<' ? '&lt;' : '&amp;'; }) + '</strong>';
  }

  function render(root) {
    if (!st.ds) {
      root.appendChild(h('section', { class: 'panel' }, h('p', { class: 'empty', text: '먼저 데이터 탭에서 데이터를 불러오세요.' })));
      return;
    }
    var set = act.scenarioSet();
    var years = set.years;
    if (!(st.report.year >= 0 && st.report.year < years.length)) st.report.year = act.defaultYear(years);
    var yi = st.report.year;
    var Y = years[yi].label;
    var lastI = years.length - 1;
    var ds = st.ds;
    var name = st.display.companyName;
    var useDisp = act.hasDisplay();
    var unit = useDisp ? ' EA' : '대';
    var D = act.displayFor('Base', yi);
    var T = D[sim.TOTAL];
    var regions = ds.regions;
    var majors = regions.filter(function (r) { return r !== sim.OTHER_REGION; });
    var majTam = 0;
    var majOurs = 0;
    majors.forEach(function (r) { majTam += useDisp ? D[r].tam : D[r].vehicles; majOurs += D[r].ours; });
    var globalTam = useDisp ? T.tam : T.vehicles;

    root.appendChild(settingsBar(years));
    var paper = h('article', { class: 'report report--exec' });
    var today = new Date();
    paper.appendChild(h('header', { class: 'report__head' }, [
      h('h1', { class: 'report__title', text: st.report.title }),
      h('div', { class: 'report__meta', text: today.getFullYear() + '.' + String(today.getMonth() + 1).padStart(2, '0') + '.' + String(today.getDate()).padStart(2, '0') +
        ' · 기준 ' + Y + ' · 실적 ~' + ds.months[ds.months.length - 1] + ' · 전망 ~' + st.bl.months[st.bl.months.length - 1] + ' · Base (범위 Worst ~ Best)' + (st.source === 'sample' ? ' · 예시 데이터 (수치 가상)' : '') }),
    ]));
    if (!useDisp) paper.appendChild(w.notes([{ level: 'warn', message: '디스플레이 가정이 없어 차량 판매 기준으로 보여 줍니다. 데이터 탭 6번에 넣으면 디스플레이 기준이 됩니다.' }]));

    // ① 디스플레이 TAM
    var s1 = h('div');
    App.bars.stack(s1, {
      label: '지역별 디스플레이 TAM',
      items: regions.map(function (r, i) { return { label: rname(r), value: useDisp ? D[r].tam : D[r].vehicles, color: regionColor(r, i) }; }),
      format: function (v) { return fmt.compact(v) + unit; },
    });
    paper.appendChild(section('1', (useDisp ? '디스플레이 TAM ' : '차량 TAM ') + fmt.compact(globalTam) + unit + ' (' + Y + ')',
      '글로벌 ' + (useDisp ? '디스플레이' : '차량') + ' TAM ' + b(fmt.compact(globalTam) + unit) + ' 중 주요 ' + majors.length + '개 지역(' + majors.map(rname).join(', ') + ')이 ' +
        b(fmt.compact(majTam) + unit + ' (' + fmt.pct(globalTam ? majTam / globalTam : 0, 0) + ')') + ' 입니다.', s1));

    if (useDisp) {
      // ② 자사 M/S
      var s2 = h('div');
      var rows2 = regions.map(function (r) { return { label: rname(r), value: D[r].share, note: fmt.compact(D[r].ours) + ' EA' }; });
      rows2.push({ label: '글로벌', value: T.share, note: fmt.compact(T.ours) + ' EA', strong: true, color: 'var(--c-fg)' });
      App.bars.hbars(s2, { rows: rows2, format: function (v) { return fmt.pct(v, 1); } });
      var Dp = yi > 0 ? act.displayFor('Base', yi - 1)[sim.TOTAL] : null;
      paper.appendChild(section('2', name + ' M/S ' + fmt.pct(T.share, 1) + ' · ' + fmt.compact(T.ours) + ' EA',
        '글로벌 디스플레이 TAM 의 ' + b(fmt.pct(T.share, 1)) + (Dp ? ' (전년 ' + fmt.pct(Dp.share, 1) + ', ' + fmt.signedPp(T.share - Dp.share, 1) + ')' : '') +
          ', 주요 지역 안에서는 ' + b(fmt.pct(majTam ? majOurs / majTam : 0, 1)) + ' 입니다.', s2));

      // ③ 고객 구분
      var s3 = h('div');
      App.bars.stack(s3, {
        label: name + ' 물량의 고객 구분',
        items: sim.display.TIERS.map(function (t) { return { label: t.label, value: T.tiers[t.key].ours, color: TIER_COLOR[t.key] }; }),
        format: function (v) { return fmt.compact(v) + ' EA'; },
      });
      var tierRows = sim.display.TIERS.map(function (t) {
        var x = T.tiers[t.key];
        var oems = ds.brands.filter(function (bb) { return sim.display.tierOf(st.display, bb) === t.key && bb !== sim.OTHER; });
        return [t.label, fmt.compact(x.tam), fmt.compact(x.ours), fmt.pct(T.ours ? x.ours / T.ours : 0, 0), fmt.pct(x.share, 1), t.key === 'other' ? '그 외 OEM' : oems.join(', ')];
      });
      s3.appendChild(w.table(['구분', { label: '디스플레이 TAM (EA)', num: true }, { label: name + ' 물량 (EA)', num: true }, { label: name + ' 물량 비중', num: true }, { label: name + ' M/S', num: true }, 'OEM'], tierRows));
      var st1 = T.tiers.strategic;
      var mt1 = T.tiers.maintain;
      paper.appendChild(section('3', '고객 구분: 전략고객 ' + fmt.pct(T.ours ? st1.ours / T.ours : 0, 0) + ' · 유지고객 ' + fmt.pct(T.ours ? mt1.ours / T.ours : 0, 0),
        name + ' 물량의 ' + b(fmt.pct(T.ours ? (st1.ours + mt1.ours) / T.ours : 0, 0)) + ' 가 전략·유지고객입니다. 전략고객 안 ' + name + ' M/S ' + b(fmt.pct(st1.share, 1)) + ', 유지고객 안 ' + b(fmt.pct(mt1.share, 1)) + '.', s3));

      // ④ 고객 수요 전망
      var grid = h('div', { class: 'xgrid' });
      var leadParts = [];
      ['strategic', 'maintain'].forEach(function (key) {
        var label = key === 'strategic' ? '전략고객' : '유지고객';
        function series(n) { return years.map(function (y, i) { return act.displayFor(n, i)[sim.TOTAL].tiers[key].tam; }); }
        var base = series('Base');
        var lo = series('Worst');
        var hi = series('Best');
        var cell = h('div', { class: 'xgrid__cell' }, [h('h3', { class: 'report__h3', text: label + ' 디스플레이 TAM (EA)' })]);
        App.bars.columns(cell, {
          labels: years.map(function (y) { return y.label; }),
          base: base, low: lo.map(function (v, i) { return Math.min(v, hi[i]); }), high: hi.map(function (v, i) { return Math.max(v, lo[i]); }),
          actual: years.map(function (y) { return y.kind === 'A'; }),
          label: label + ' 연도별 디스플레이 TAM',
        });
        var c = sim.annual.cagr(base[0], base[lastI], lastI);
        leadParts.push(label + ' ' + b(fmt.compact(base[0]) + ' → ' + fmt.compact(base[lastI]) + ' EA') + ' (CAGR ' + (isFinite(c) ? fmt.signedPct(c) : '-') + ', ' + years[lastI].label + ' 범위 ' + fmt.compact(Math.min(lo[lastI], hi[lastI])) + ' ~ ' + fmt.compact(Math.max(lo[lastI], hi[lastI])) + ')');
        // OEM 별
        var oems = ds.brands.filter(function (bb) { return sim.display.tierOf(st.display, bb) === key; });
        var oRows = oems.map(function (bb) {
          var u = set.annual.Base.brandUnits[sim.TOTAL][bb];
          var c2 = sim.annual.cagr(u[0], u[lastI], lastI);
          var a1 = set.annual.Worst.brandUnits[sim.TOTAL][bb][lastI];
          var a2 = set.annual.Best.brandUnits[sim.TOTAL][bb][lastI];
          return [bb, fmt.compact(u[0]), fmt.compact(u[lastI]), isFinite(c2) ? fmt.signedPct(c2) : '-',
            fmt.compact(Math.min(a1, a2)) + ' ~ ' + fmt.compact(Math.max(a1, a2))];
        });
        if (oRows.length) cell.appendChild(w.table(['OEM 차량 판매', { label: years[0].label, num: true }, { label: years[lastI].label, num: true }, { label: 'CAGR', num: true }, { label: years[lastI].label + ' 범위', num: true }], oRows));
        else cell.appendChild(h('p', { class: 'empty', text: label + ' 로 지정한 OEM 이 없습니다 (데이터 탭 6번).' }));
        grid.appendChild(cell);
      });
      paper.appendChild(section('4', '전략·유지고객 수요 전망 (' + years[0].label + ' ~ ' + years[lastI].label + ')', leadParts.join('<br>') + '<br><span class="xsec__note">막대 Base, 선 Worst ~ Best. 실적 연도는 옅은 막대.</span>', grid));
    }

    // ⑤ 시나리오 가정
    var items = set.build.items;
    var s5 = h('div');
    if (items.length) {
      var DIR = { positive: '긍정', negative: '부정', neutral: '-' };
      s5.appendChild(w.table(['외생변수', '내용', '자사 영향', { label: 'Worst / Base / Best', num: true }], items.map(function (it) {
        var u = S.unitOf(it.card.layer);
        function sg(v) { var r = Math.round(v * 10) / 10; return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + u; }
        return [it.card.name, S.describe(it.card), DIR[it.direction], sg(it.values.Worst) + ' / ' + sg(it.values.Base) + ' / ' + sg(it.values.Best)];
      })));
    } else {
      s5.appendChild(h('p', { class: 'empty', text: '외생변수 없음 (Worst = Base = Best = Trend).' }));
    }
    var tot = ['Worst', 'Base', 'Best'].map(function (n) {
      var d = act.displayFor(n, lastI)[sim.TOTAL];
      return n + ' ' + fmt.compact(useDisp ? d.ours : d.vehicles) + unit;
    }).join(' · ');
    paper.appendChild(section(useDisp ? '5' : '2', '시나리오 가정',
      'Base 는 모든 외생변수를 예상값으로, Worst 는 부정 요인 크게 · 긍정 요인 작게, Best 는 그 반대입니다. ' + years[lastI].label + ' ' + (useDisp ? name + ' 물량' : '관측 OEM 판매') + ': ' + b(tot), s5));

    paper.appendChild(h('footer', { class: 'report__foot' }, [
      h('p', { text: '방법: 월별 OEM M/S trend 로 ' + st.bl.months[st.bl.months.length - 1] + ' 까지 전망하고 연 단위로 합산. 디스플레이 TAM = 차량 판매 x 대당 디스플레이, ' + name + ' 물량 = 디스플레이 TAM x 브랜드 내 ' + name + ' M/S.' }),
      h('p', { text: '주요 지역 외는 "' + sim.OTHER_REGION + '", 관측 OEM ' + (ds.brands.length - 1) + '개 외는 "기타" 로 합산. A 실적 · E 실적+전망 · F 전망.' }),
    ]));
    root.appendChild(paper);
  }

  App.views = App.views || {};
  App.views.report = render;
})(window);
