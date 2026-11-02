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
        null,
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
    ]));
    if (missingFx.length) {
      main.appendChild(h('div', { class: 'notice notice--warn' }, [
        C.periodLabel(period) + ' ' + missingFx.join(', ') + ' 환율이 없어 일부 금액을 달러로 바꾸지 못했습니다. ',
        h('button', { type: 'button', class: 'link', text: '환율 넣기', onclick: function () { App.go({ tab: 'admin' }); } }),
      ]));
    }

    // 고른 업체 대시보드. 업체를 안 골랐으면 자료가 있는 첫 업체
    var focus = App.data.company(r.focus) && (!group || App.data.company(r.focus).group === group) ? r.focus : '';
    if (!focus) {
      var first = rows.filter(function (x) { return x.latest; })[0];
      focus = first ? first.c.id : '';
    }
    if (focus) main.appendChild(dashboard(App.data.company(focus), period));

    // 회사 카드. 누르면 위 대시보드가 그 업체로 바뀝니다.
    var grid = h('section', { class: 'cards', 'aria-label': '회사별 요약' });
    rows.forEach(function (x) {
      grid.appendChild(card(x, period, x.c.id === focus));
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
    var debt = withNum.filter(function (x) { return x.t.debtRatio !== null; })
      .sort(function (a, b) { return a.t.debtRatio - b.t.debtRatio; });
    var tableMode = r.view === 'table';
    main.appendChild(h('section', { class: 'panel' }, [
      h('div', { class: 'panel__bar' }, [
        h('h2', { class: 'panel__title', text: C.periodLabel(period, true) + ' 비교' }),
        h('div', { class: 'app__spacer' }),
        f.btn(tableMode ? '차트로 보기' : '표로 보기', function () { App.go({ view: tableMode ? '' : 'table' }, true); }, 'sm'),
      ]),
      tableMode ? compareTable(withNum) : h('div', { class: 'grid3' }, [
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
        App.chart.bars({
          title: '부채비율',
          unit: '% (낮은 순)',
          format: function (v) { return f.num(v, 1); },
          data: debt.map(function (x) {
            return { label: label(x), value: x.t.debtRatio, tip: [x.t.debtRatioSource === 'reported' ? '원문에 적힌 비율' : '부채총계 / 자본총계'], onClick: go(x) };
          }),
        }),
      ]),
    ]));

    var heat = sentimentHeat(rows, period);
    if (heat) main.appendChild(heat);
  };

  /** 고른 분기의 회사 x 요인 센티먼트 표. 점수가 있는 회사가 없으면 그리지 않습니다. 종합 점수 높은 순. */
  function sentimentHeat(rows, period) {
    var SE = App.ea.sentiment;
    var list = rows.filter(function (x) { return x.q && x.q.sentiment; }).map(function (x) {
      return { x: x, idx: SE.index(x.q.sentiment), e: SE.effective(x.q.sentiment) };
    }).sort(function (a, b) { return (b.idx === null ? -1 : b.idx) - (a.idx === null ? -1 : a.idx); });
    if (!list.length) return null;
    var head = h('tr', null, [h('th', { class: 'th', text: '회사' }), h('th', { class: 'th', text: '종합' })].concat(SE.FACTORS.map(function (fct) {
      return h('th', { class: 'th', text: fct.label.replace(' 가이던스', '') });
    })));
    var body = list.map(function (it) {
      return h('tr', { class: 'is-clickable', onclick: function () { App.go({ tab: 'company', company: it.x.c.id, period: period }); } }, [
        h('td', { class: 'rowh' }, h('span', { class: 'heat__co' }, [f.logo(it.x.c, 'sm'), it.x.c.nameKo || it.x.c.name])),
        h('td', { class: 'heat__cell' }, f.sentCell(it.idx, { cls: 'sent--big' })),
      ].concat(SE.FACTORS.map(function (fct) {
        var v = it.e[fct.key];
        var m = it.x.q.sentiment.model && it.x.q.sentiment.model[fct.key];
        return h('td', { class: 'heat__cell' }, f.sentCell(v.score, { manual: v.source === 'manual', title: fct.label + ': ' + (v.score === null ? '언급 없음' : v.score + '점') + (m && m.reason ? ' / ' + m.reason : '') }));
      })));
    });
    return h('section', { class: 'panel' }, [
      h('div', { class: 'panel__bar' }, [
        h('h2', { class: 'panel__title', text: C.periodLabel(period, true) + ' 센티먼트' }),
        h('span', { class: 'muted', text: '0~10점, 종합 높은 순' }),
      ]),
      f.sentLegend(),
      h('div', { class: 'table__scroll' }, h('table', { class: 'table heat' }, [h('thead', null, head), h('tbody', null, body)])),
    ]);
  }

  /** 짧은 분기 이름 (25Q3) */
  function shortP(p) {
    return p.slice(2, 4) + 'Q' + p.slice(5);
  }

  /** 업체 한 곳의 대시보드: 고른 분기 숫자, 최근 12개 분기 추이, 센티먼트 */
  function dashboard(c, period) {
    var SE = App.ea.sentiment;
    var rep = App.data.report(c.id);
    var rows = C.table(rep, c, App.data.fx());
    var box = h('section', { class: 'panel dash', id: 'dash' });
    var at = rows.filter(function (d) { return d.period === period; })[0] || rows[0];
    box.appendChild(h('div', { class: 'dash__head' }, [
      f.logo(c, 'lg'),
      h('div', null, [
        h('h2', { class: 'dash__name', text: c.nameKo || c.name }),
        h('div', { class: 'muted small', text: c.name + ' · ' + (c.group === 'Tier1' ? '부품사' : '완성차') + ' · 발표 통화 ' + c.currency +
          (rows.length ? ' · 자료 ' + C.periodLabel(rows[rows.length - 1].period) + ' ~ ' + C.periodLabel(rows[0].period) + ' (' + rows.length + '개 분기)' : '') }),
      ]),
      h('div', { class: 'app__spacer' }),
      f.btn('상세 보기', function () { App.go({ tab: 'company', company: c.id, period: at ? at.period : '' }); }, 'primary'),
    ]));
    if (!rows.length) {
      box.appendChild(f.empty('이 업체는 아직 자료가 없습니다', null, [
        f.btn('자료 넣기', function () { App.go({ tab: 'import', company: c.id }); }, 'primary'),
        f.btn('과거 실적 넣기', function () { App.go({ tab: 'company', company: c.id, edit: 'grid' }); }),
      ]));
      return box;
    }

    // 고른 분기(없으면 최근 분기) 숫자
    var sent = at.quarter.sentiment;
    function tile(label, value, sub, extra) {
      return h('div', { class: 'tile' }, [
        h('div', { class: 'tile__label', text: label }),
        h('div', { class: 'tile__value' }, value),
        sub ? h('div', { class: 'tile__sub', text: sub }) : null,
        extra || null,
      ]);
    }
    box.appendChild(h('div', { class: 'muted small dash__at', text: C.periodLabel(at.period, true) + (at.quarter.fiscalLabel ? ' · ' + at.quarter.fiscalLabel : '') + (at.period !== period ? ' (고른 분기 자료가 없어 최근 분기)' : '') + ' · 전년 동기 대비' }));
    box.appendChild(h('div', { class: 'tiles' }, [
      tile('매출 (MUSD)', f.musd(at.musd.revenue), f.pct(at.yoy.revenue, true)),
      tile('영업이익 (MUSD)', f.musd(at.musd.operatingIncome), f.pct(at.yoy.operatingIncome, true)),
      tile('영업이익률', f.pct(at.opMargin), at.opMarginPrev !== null && at.opMargin !== null ? f.pp(at.opMargin - at.opMarginPrev) : ''),
      tile('부채비율', f.pct(at.debtRatio) + (at.debtRatioSource === 'reported' ? ' *' : ''), at.debtRatioPrev !== null && at.debtRatio !== null ? f.pp(at.debtRatio - at.debtRatioPrev) : ''),
      c.group === 'Tier1' ? null : tile('판매 대수 (천 대)', f.num(at.deliveries), f.pct(at.yoy.deliveries, true)),
      tile('센티먼트', sent ? f.sentCell(SE.index(sent), { cls: 'sent--big' }) : '-', sent ? '' : '콜 요약 없음'),
    ]));

    // 최근 12개 분기 추이. 숫자가 하나도 없는 지표는 그리지 않습니다.
    var recent = rows.slice(0, 12).reverse();
    var specs = [
      ['매출', 'MUSD', f.musd, function (d) { return d.musd.revenue; }],
      ['영업이익', 'MUSD', f.musd, function (d) { return d.musd.operatingIncome; }],
      ['영업이익률', '%', function (v) { return f.num(v, 1); }, function (d) { return d.opMargin; }],
      ['부채비율', '%', function (v) { return f.num(v, 0); }, function (d) { return d.debtRatio; }],
      ['판매 대수', '천 대', function (v) { return f.num(v); }, function (d) { return d.deliveries; }],
    ];
    var charts = h('div', { class: 'grid3 dash__charts' });
    specs.forEach(function (sp) {
      if (!recent.some(function (d) { var v = sp[3](d); return v !== null && v !== undefined; })) return;
      charts.appendChild(h('div', { class: 'dash__chart' }, App.chart.columns({
        title: sp[0], unit: sp[1], format: sp[2], height: 170,
        data: recent.map(function (d) { return { label: shortP(d.period), value: sp[3](d), tip: [C.periodLabel(d.period) + (d.quarter.fiscalLabel ? ' · ' + d.quarter.fiscalLabel : '')] }; }),
      })));
    });

    // 센티먼트: 분기별 종합 점수와 가장 최근 콜 총평
    var scored = recent.filter(function (d) { return d.quarter.sentiment; });
    var lastCall = rows.filter(function (d) { return d.quarter.call; })[0];
    charts.appendChild(h('div', { class: 'dash__chart dash__sent' }, [
      h('div', { class: 'chart__head' }, [h('span', { class: 'chart__title', text: '컨퍼런스콜 센티먼트' }), h('span', { class: 'chart__unit', text: '종합, 0~10점' })]),
      scored.length ? h('div', { class: 'sent-strip' }, recent.map(function (d) {
        var se = d.quarter.sentiment;
        return h('div', { class: 'sent-strip__q' }, [f.sentCell(se ? SE.index(se) : null), h('span', { class: 'small muted', text: shortP(d.period) })]);
      })) : h('div', { class: 'chart__empty', text: '센티먼트 점수가 있는 분기가 없습니다' }),
      lastCall ? h('div', { class: 'dash__call' }, [
        h('div', { class: 'small muted', text: C.periodLabel(lastCall.period) + ' 콜' }),
        h('div', { text: lastCall.quarter.call.summary || '' }),
        h('ul', { class: 'hl__list small' }, (lastCall.quarter.call.highlights || []).slice(0, 3).map(function (x) { return h('li', { text: x.text }); })),
      ]) : null,
    ]));
    box.appendChild(charts);
    return box;
  }

  function card(x, period, focused) {
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
        h('dt', { text: '영업이익률' }), h('dd', null, [f.pct(t.opMargin), ppDelta(t.opMargin, t.opMarginPrev)]),
        h('dt', { text: '부채비율' }), h('dd', null, [f.pct(t.debtRatio), ppDelta(t.debtRatio, t.debtRatioPrev)]),
      ]);
    }
    var call = q && q.call;
    return h('button', {
      type: 'button',
      class: 'card' + (focused ? ' is-focus' : ''),
      'aria-pressed': focused ? 'true' : 'false',
      onclick: function () {
        App.go({ focus: c.id }, true);
        var d = document.getElementById('dash');
        if (d) d.scrollIntoView({ block: 'start', behavior: 'smooth' });
      },
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

  /** 전년 동기 대비 %p 차이 */
  function ppDelta(cur, prev) {
    if (cur === null || cur === undefined || prev === null || prev === undefined) return null;
    return h('span', { class: 'delta', title: '전년 동기 대비', text: f.pp(cur - prev) });
  }

  function yoy(v) {
    if (v === null || v === undefined) return null;
    return h('span', { class: 'delta ' + (v >= 0 ? 'delta--up' : 'delta--down'), text: f.pct(v, true) });
  }

  function compareTable(rows) {
    var table = h('table', { class: 'table' }, [
      h('thead', null, h('tr', null, ['회사', '매출 (MUSD)', '전년 대비', '영업이익 (MUSD)', '영업이익률', '부채비율', '판매 (천 대)', '환율'].map(function (t, i) {
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
          h('td', { class: 'num', text: f.pct(t.debtRatio) }),
          h('td', { class: 'num', text: f.num(t.deliveries) }),
          h('td', { class: 'num', text: t.currency === 'USD' ? '-' : t.currency + ' ' + f.rate(t.fx && t.fx.rate) }),
        ]);
      })),
    ]);
    return h('div', { class: 'table__scroll' }, table);
  }
})(window);
