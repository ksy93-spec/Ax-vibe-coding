/* 한눈에 보기: 고른 분기의 회사별 카드와 비교 차트. */
(function (global) {
  'use strict';
  var App = global.App;
  var h = App.dom.h;
  var f = App.f;
  var C = App.ea.core;
  var views = (App.views = App.views || {});

  var GROUPS = [
    { id: '', label: '전체' },
    { id: 'OEM', label: '완성차' },
    { id: 'Tier1', label: '부품사' },
  ];

  /** 자료가 가장 많이 들어 있는 최근 분기 */
  function defaultPeriod(reports) {
    var count = {};
    Object.keys(reports).forEach(function (id) {
      (reports[id].quarters || []).forEach(function (q) {
        count[q.period] = (count[q.period] || 0) + 1;
      });
    });
    var ps = Object.keys(count).sort().reverse();
    if (!ps.length) return C.lastClosedPeriod();
    var max = Math.max.apply(null, ps.map(function (p) { return count[p]; }));
    // 최근 분기에 절반 이상이 들어와 있으면 최근 분기, 아니면 가장 많이 들어온 분기
    if (count[ps[0]] * 2 >= max) return ps[0];
    for (var i = 0; i < ps.length; i++) if (count[ps[i]] === max) return ps[i];
    return ps[0];
  }

  views.overview = function (main, r) {
    var companies = App.data.companies();
    var reports = App.data.reports();
    var fx = App.data.fx();
    var period = r.period || defaultPeriod(reports);
    var group = r.group || '';
    var shown = companies.filter(function (c) {
      return !group || c.group === group;
    });

    var hasAny = f.allPeriods(reports).length > 0;
    if (!hasAny) {
      main.appendChild(h('section', { class: 'panel' }, f.empty(
        '아직 쌓인 자료가 없습니다',
        '자료 넣기 탭에서 컨퍼런스콜 녹취록이나 보도자료를 붙여 넣으면 사내 모델용 프롬프트가 만들어지고, 답을 붙여 넣으면 이 화면에 쌓입니다. 바깥에서 만든 자료 묶음(.json)이 있으면 관리 탭에서 가져옵니다.',
        [f.btn('자료 넣기', function () { App.go({ tab: 'import' }); }, 'primary'),
          f.btn('자료 묶음 가져오기', function () { App.go({ tab: 'admin' }); })]
      )));
    }

    var periodSel = h('select', { class: 'input input--sm', 'aria-label': '분기', onchange: function (e) { App.go({ period: e.target.value }, true); } },
      f.periodChoices(reports).map(function (p) {
        return h('option', { value: p, selected: p === period, text: C.periodLabel(p, true) });
      }));
    var seg = h('div', { class: 'seg', role: 'group', 'aria-label': '회사 구분' }, GROUPS.map(function (g) {
      return h('button', {
        type: 'button',
        class: 'seg__btn' + (g.id === group ? ' is-on' : ''),
        text: g.label,
        onclick: function () { App.go({ group: g.id }, true); },
      });
    }));
    var missingFx = [];
    var rows = shown.map(function (c) {
      var rep = reports[c.id];
      var q = C.quarterOf(rep, period);
      var t = q ? C.table(rep, c, fx).filter(function (x) { return x.period === period; })[0] : null;
      if (t && t.missingFx && missingFx.indexOf(t.currency) < 0) missingFx.push(t.currency);
      return { c: c, q: q, t: t, latest: C.latestPeriod(rep) };
    });

    main.appendChild(h('div', { class: 'toolbar' }, [
      h('span', { class: 'toolbar__label', text: '분기' }), periodSel, seg,
      h('span', { class: 'toolbar__note', text: '달력 분기 기준. 3월 결산 회사도 같은 달로 맞춰 비교합니다.' }),
    ]));
    if (missingFx.length) {
      main.appendChild(h('div', { class: 'notice notice--warn' }, [
        C.periodLabel(period) + ' ' + missingFx.join(', ') + ' 환율이 없어 일부 금액을 달러로 바꾸지 못했습니다. ',
        h('button', { type: 'button', class: 'link', text: '환율 넣기', onclick: function () { App.go({ tab: 'admin' }); } }),
      ]));
    }

    // 회사 카드
    var grid = h('section', { class: 'cards', 'aria-label': '회사별 요약' });
    rows.forEach(function (x) {
      grid.appendChild(card(x, period));
    });
    main.appendChild(grid);

    // 비교 차트
    var withNum = rows.filter(function (x) { return x.t; });
    var label = function (x) { return x.c.nameKo || x.c.name; };
    var go = function (x) { return function () { App.go({ tab: 'company', company: x.c.id, period: period }); }; };
    var rev = withNum.filter(function (x) { return x.t.musd.revenue !== null; })
      .sort(function (a, b) { return b.t.musd.revenue - a.t.musd.revenue; });
    var mar = withNum.filter(function (x) { return x.t.opMargin !== null; })
      .sort(function (a, b) { return b.t.opMargin - a.t.opMargin; });
    var tableMode = r.view === 'table';
    main.appendChild(h('section', { class: 'panel' }, [
      h('div', { class: 'panel__bar' }, [
        h('h2', { class: 'panel__title', text: C.periodLabel(period, true) + ' 비교' }),
        h('div', { class: 'app__spacer' }),
        f.btn(tableMode ? '차트로 보기' : '표로 보기', function () { App.go({ view: tableMode ? '' : 'table' }, true); }, 'sm'),
      ]),
      tableMode ? compareTable(withNum) : h('div', { class: 'grid2' }, [
        App.chart.bars({
          title: '매출',
          unit: 'MUSD',
          format: f.musd,
          data: rev.map(function (x) {
            return { label: label(x), value: x.t.musd.revenue, tip: ['전년 동기 대비 ' + f.pct(x.t.yoy.revenue, true) + ' (발표 통화 기준)'], onClick: go(x) };
          }),
        }),
        App.chart.bars({
          title: '영업이익률',
          unit: '%',
          format: function (v) { return f.num(v, 1); },
          data: mar.map(function (x) {
            return { label: label(x), value: x.t.opMargin, tip: ['영업이익 ' + f.musd(x.t.musd.operatingIncome) + ' MUSD'], onClick: go(x) };
          }),
        }),
      ]),
    ]));
  };

  function card(x, period) {
    var c = x.c;
    var t = x.t;
    var q = x.q;
    var body;
    if (!t) {
      body = h('div', { class: 'card__none' }, [
        h('span', { text: '이 분기 자료 없음' }),
        x.latest ? h('span', { class: 'muted', text: '최근 ' + C.periodLabel(x.latest) }) : null,
      ]);
    } else {
      body = h('dl', { class: 'kv' }, [
        h('dt', { text: '매출' }), h('dd', null, [f.musd(t.musd.revenue), yoy(t.yoy.revenue)]),
        h('dt', { text: '영업이익' }), h('dd', null, [f.musd(t.musd.operatingIncome), yoy(t.yoy.operatingIncome)]),
        h('dt', { text: '영업이익률' }), h('dd', null, [f.pct(t.opMargin),
          t.opMarginPrev !== null && t.opMargin !== null ? h('span', { class: 'delta', text: f.pp(t.opMargin - t.opMarginPrev) }) : null]),
      ]);
    }
    var call = q && q.call;
    return h('button', {
      type: 'button',
      class: 'card',
      onclick: function () { App.go({ tab: 'company', company: c.id, period: t ? period : x.latest || '' }); },
    }, [
      h('div', { class: 'card__head' }, [
        f.logo(c, 'md'),
        f.companyName(c),
        h('span', { class: 'card__grp', text: c.group === 'Tier1' ? '부품사' : '완성차' }),
      ]),
      body,
      h('div', { class: 'card__foot' }, [
        q ? f.statusBadge(q.status) : null,
        call ? f.chip('콜 요약 ' + (call.highlights || []).length + ' · Q&A ' + (call.qa || []).length) : null,
        q && q.fiscalLabel ? h('span', { class: 'muted', text: q.fiscalLabel }) : null,
      ]),
    ]);
  }

  function yoy(v) {
    if (v === null || v === undefined) return null;
    return h('span', { class: 'delta ' + (v >= 0 ? 'delta--up' : 'delta--down'), text: f.pct(v, true) });
  }

  function compareTable(rows) {
    var table = h('table', { class: 'table' }, [
      h('thead', null, h('tr', null, ['회사', '매출 (MUSD)', '전년 대비', '영업이익 (MUSD)', '영업이익률', '순이익 (MUSD)', '판매 (천 대)', '환율'].map(function (t, i) {
        return h('th', { class: 'th' + (i ? ' num' : ''), text: t });
      }))),
      h('tbody', null, rows.map(function (x) {
        var t = x.t;
        return h('tr', null, [
          h('td', { text: x.c.nameKo || x.c.name }),
          h('td', { class: 'num', text: f.musd(t.musd.revenue) }),
          h('td', { class: 'num', text: f.pct(t.yoy.revenue, true) }),
          h('td', { class: 'num', text: f.musd(t.musd.operatingIncome) }),
          h('td', { class: 'num', text: f.pct(t.opMargin) }),
          h('td', { class: 'num', text: f.musd(t.musd.netIncome) }),
          h('td', { class: 'num', text: f.num(t.deliveries) }),
          h('td', { class: 'num', text: t.currency === 'USD' ? '-' : t.currency + ' ' + f.rate(t.fx && t.fx.rate) }),
        ]);
      })),
    ]);
    return h('div', { class: 'table__scroll' }, table);
  }
})(window);
