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
    if (focus) main.appendChild(dashboard(App.data.company(focus), period, r));

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
            return { label: label(x), value: x.t.musd.revenue, color: x.c.group === 'Tier1' ? 'var(--viz-2)' : 'var(--viz-1)', tip: ['YoY ' + f.pct(x.t.yoy.revenue, true) + ' · QoQ ' + f.pct(x.t.qoq.revenue, true)], onClick: go(x) };
          }),
        }),
        App.chart.bars({
          title: '영업이익률',
          unit: '%',
          format: function (v) { return f.num(v, 1); },
          data: mar.map(function (x) {
            return { label: label(x), value: x.t.opMargin, color: x.c.group === 'Tier1' ? 'var(--viz-2)' : 'var(--viz-1)', tip: ['영업이익 ' + f.musd(x.t.musd.operatingIncome) + ' MUSD'], onClick: go(x) };
          }),
        }),
        App.chart.bars({
          title: '부채비율',
          unit: '% (낮은 순)',
          format: function (v) { return f.num(v, 1); },
          data: debt.map(function (x) {
            return { label: label(x), value: x.t.debtRatio, color: x.c.group === 'Tier1' ? 'var(--viz-2)' : 'var(--viz-1)', tip: [x.t.debtRatioSource === 'reported' ? '원문에 적힌 비율' : '부채총계 / 자본총계'], onClick: go(x) };
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

  /* 지표별 막대 색. 음수(감소)는 빨강. */
  var COLORS = { revenue: 'var(--viz-1)', operatingIncome: 'var(--viz-2)', opMargin: 'var(--viz-3)', debtRatio: 'var(--viz-7)', deliveries: 'var(--viz-6)' };
  var NEG = 'var(--viz-8)';

  /** 보기 바꾸기 단추 묶음 */
  function seg2(items, cur, key) {
    return h('div', { class: 'seg', role: 'group' }, items.map(function (it) {
      return h('button', {
        type: 'button', class: 'seg__btn' + (it[0] === cur ? ' is-on' : ''), text: it[1], disabled: it[2] ? true : null,
        onclick: function () { var o = {}; o[key] = it[0]; App.go(o, true); },
      });
    }));
  }

  /**
   * 차트 한 개에 들어갈 값. mode 'val' 은 값, 'yoy' 는 전년 대비, 'qoq' 는 전 분기 대비.
   * 금액과 대수는 증감률(%), 비율(영업이익률, 부채비율)은 차이(%p)로 보여 줍니다.
   */
  var SPECS = [
    { key: 'revenue', title: '매출', unit: 'MUSD', kind: 'flow', val: function (d) { return d.musd.revenue; }, fmt: function (v) { return f.musd(v); } },
    { key: 'operatingIncome', title: '영업이익', unit: 'MUSD', kind: 'flow', val: function (d) { return d.musd.operatingIncome; }, fmt: function (v) { return f.musd(v); } },
    { key: 'opMargin', title: '영업이익률', unit: '%', kind: 'ratio', val: function (d) { return d.opMargin; }, prevY: 'opMarginPrev', prevQ: 'opMarginPrevQ', fmt: function (v) { return f.num(v, 1); } },
    { key: 'debtRatio', title: '부채비율', unit: '%', kind: 'ratio', val: function (d) { return d.debtRatio; }, prevY: 'debtRatioPrev', prevQ: 'debtRatioPrevQ', fmt: function (v) { return f.num(v, 0); } },
    { key: 'deliveries', title: '판매 대수', unit: '천 대', kind: 'flow', val: function (d) { return d.deliveries; }, fmt: function (v) { return f.num(v); } },
  ];
  function seriesValue(sp, d, mode) {
    if (mode === 'val') return sp.val(d);
    if (sp.kind === 'flow') {
      var g = mode === 'yoy' ? d.yoy : d.qoq;
      return g ? g[sp.key] : null;
    }
    var cur = sp.val(d);
    var prev = d[mode === 'yoy' ? sp.prevY : sp.prevQ];
    return cur === null || cur === undefined || prev === null || prev === undefined ? null : cur - prev;
  }

  /** 분기/연간, 값/전년 대비/전 분기 대비 고르는 줄. 회사별 탭도 같이 씁니다. */
  function readModes(r) {
    var gran = r.gran === 'y' ? 'y' : 'q';
    var mode = r.dm === 'yoy' || (r.dm === 'qoq' && gran === 'q') ? r.dm : 'val';
    return { gran: gran, mode: mode };
  }
  function modeBar(gran, mode) {
    return h('div', { class: 'toolbar dash__modes' }, [
      seg2([['q', '분기'], ['y', '연간']], gran, 'gran'),
      seg2([['val', '값'], ['yoy', '전년 대비'], ['qoq', '전 분기 대비', gran === 'y']], mode, 'dm'),
      gran === 'y' ? h('span', { class: 'muted small', text: '달력 연도 합계. 4개 분기가 다 없는 해는 연도 옆 괄호에 분기 수' } ) : null,
    ]);
  }
  /** 지표별 막대 차트 묶음. o.quarters, o.years 는 보여 줄 개수, o.wrap 은 감쌀 클래스 */
  function trendCharts(c, rep, fx, rows, gran, mode, o) {
    var series = gran === 'y' ? C.annual(rep, c, fx).slice(0, o.years).reverse() : rows.slice(0, o.quarters).reverse();
    var label = gran === 'y'
      ? function (d) { return d.year + (d.quarters < 4 ? ' (' + d.quarters + ')' : ''); }
      : function (d) { return shortP(d.period); };
    var out = [];
    SPECS.forEach(function (sp) {
      if (sp.key === 'deliveries' && c.group === 'Tier1') return;
      var data = series.map(function (d) {
        var tips = [gran === 'y' ? d.year + '년' + (d.quarters < 4 ? ' (' + d.quarters + '개 분기 합)' : '') : C.periodLabel(d.period) + (d.quarter.fiscalLabel ? ' · ' + d.quarter.fiscalLabel : '')];
        if (mode !== 'val') tips.push('값 ' + sp.fmt(sp.val(d)) + ' ' + sp.unit);
        return { label: label(d), value: seriesValue(sp, d, mode), tip: tips };
      });
      if (!data.some(function (x) { return x.value !== null && x.value !== undefined; })) return;
      out.push(h('div', { class: o.wrap }, App.chart.columns({
        title: sp.title + (mode === 'yoy' ? ' 전년 대비' : mode === 'qoq' ? ' 전 분기 대비' : ''),
        unit: mode === 'val' ? sp.unit : sp.kind === 'flow' ? '%' : '%p',
        format: mode === 'val' ? sp.fmt : function (v) { return (v > 0 ? '+' : '') + f.num(v, 1); },
        height: o.height, data: data,
        color: COLORS[sp.key], negColor: NEG, labels: mode === 'val' ? 'last' : 'all',
      })));
    });
    return out;
  }
  App.trend = { readModes: readModes, modeBar: modeBar, charts: trendCharts };

  /** 업체 한 곳의 대시보드: 고른 분기 숫자, 추이(분기/연간, 값/전년 대비/전 분기 대비), 센티먼트 */
  function dashboard(c, period, r) {
    var SE = App.ea.sentiment;
    var rep = App.data.report(c.id);
    var fx = App.data.fx();
    var rows = C.table(rep, c, fx);
    var md = readModes(r), gran = md.gran, mode = md.mode;
    var box = h('section', { class: 'panel dash', id: 'dash' });
    var at = rows.filter(function (d) { return d.period === period; })[0] || rows[0];
    box.appendChild(h('div', { class: 'dash__head' }, [
      f.logo(c, 'lg'),
      h('div', null, [
        h('h2', { class: 'dash__name', text: c.nameKo || c.name }),
        h('div', { class: 'muted small', text: c.name + ' · ' + (c.group === 'Tier1' ? '부품사' : '완성차') + ' · ' + c.currency +
          (rows.length ? ' · ' + C.periodLabel(rows[rows.length - 1].period) + ' ~ ' + C.periodLabel(rows[0].period) + ' (' + rows.length + '개 분기)' : '') }),
      ]),
      h('div', { class: 'app__spacer' }),
      f.btn('상세 보기', function () { App.go({ tab: 'company', company: c.id, period: at ? at.period : '', gran: r.gran, dm: r.dm }); }, 'primary'),
    ]));
    if (!rows.length) {
      box.appendChild(f.empty('이 업체는 아직 자료가 없습니다', null, [
        f.btn('자료 넣기', function () { App.go({ tab: 'import', company: c.id }); }, 'primary'),
        f.btn('과거 실적 넣기', function () { App.go({ tab: 'company', company: c.id, edit: 'grid' }); }),
      ]));
      return box;
    }

    // 고른 분기(없으면 최근 분기) 숫자. 아래 줄에 전년 대비, 전 분기 대비
    var sent = at.quarter.sentiment;
    function chg(y, q, pp) {
      var fy = pp ? f.pp : function (v) { return f.pct(v, true); };
      var a = [];
      if (y !== null && y !== undefined) a.push('YoY ' + fy(y));
      if (q !== null && q !== undefined) a.push('QoQ ' + fy(q));
      return a.join(' · ');
    }
    function diff(cur, prev) { return cur === null || prev === null || prev === undefined ? null : cur - prev; }
    function tile(label, value, sub, color) {
      return h('div', { class: 'tile', style: color ? { borderTopColor: color } : null }, [
        h('div', { class: 'tile__label', text: label }),
        h('div', { class: 'tile__value' }, value),
        sub ? h('div', { class: 'tile__sub', text: sub }) : null,
      ]);
    }
    box.appendChild(h('div', { class: 'muted small dash__at', text: C.periodLabel(at.period, true) + (at.quarter.fiscalLabel ? ' · ' + at.quarter.fiscalLabel : '') + (at.period !== period ? ' (고른 분기 자료가 없어 최근 분기)' : '') }));
    box.appendChild(h('div', { class: 'tiles' }, [
      tile('매출 (MUSD)', f.musd(at.musd.revenue), chg(at.yoy.revenue, at.qoq.revenue), COLORS.revenue),
      tile('영업이익 (MUSD)', f.musd(at.musd.operatingIncome), chg(at.yoy.operatingIncome, at.qoq.operatingIncome), COLORS.operatingIncome),
      tile('영업이익률', f.pct(at.opMargin), chg(diff(at.opMargin, at.opMarginPrev), diff(at.opMargin, at.opMarginPrevQ), true), COLORS.opMargin),
      tile('부채비율', f.pct(at.debtRatio) + (at.debtRatioSource === 'reported' ? ' *' : ''), chg(diff(at.debtRatio, at.debtRatioPrev), diff(at.debtRatio, at.debtRatioPrevQ), true), COLORS.debtRatio),
      c.group === 'Tier1' ? null : tile('판매 대수 (천 대)', f.num(at.deliveries), chg(at.yoy.deliveries, at.qoq.deliveries), COLORS.deliveries),
      tile('센티먼트', sent ? f.sentCell(SE.index(sent), { cls: 'sent--big' }) : '-', sent ? '' : '콜 요약 없음'),
    ]));

    box.appendChild(modeBar(gran, mode));
    var charts = h('div', { class: 'grid3 dash__charts' });
    trendCharts(c, rep, fx, rows, gran, mode, { quarters: 12, years: 7, height: 170, wrap: 'dash__chart' }).forEach(function (n) { charts.appendChild(n); });

    // 센티먼트: 분기별 종합 점수와 가장 최근 콜 총평
    var recentQ = rows.slice(0, 12).reverse();
    var scored = recentQ.filter(function (d) { return d.quarter.sentiment; });
    var lastCall = rows.filter(function (d) { return d.quarter.call; })[0];
    charts.appendChild(h('div', { class: 'dash__chart dash__sent' }, [
      h('div', { class: 'chart__head' }, [h('span', { class: 'chart__title', text: '컨퍼런스콜 센티먼트' }), h('span', { class: 'chart__unit', text: '0~10점' })]),
      scored.length ? h('div', { class: 'sent-strip' }, recentQ.map(function (d) {
        var se = d.quarter.sentiment;
        return h('div', { class: 'sent-strip__q' }, [f.sentCell(se ? SE.index(se) : null), h('span', { class: 'small muted', text: shortP(d.period) })]);
      })) : h('div', { class: 'chart__empty', text: '점수가 있는 분기가 없습니다' }),
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
