/* 회사별: 왼쪽 회사 목록, 오른쪽 분기 표, 차트, 고른 분기의 컨퍼런스콜 요약. */
(function (global) {
  'use strict';
  var App = global.App;
  var h = App.dom.h;
  var f = App.f;
  var C = App.ea.core;
  var M = App.ea.merge;
  var SE = App.ea.sentiment;
  var views = (App.views = App.views || {});

  var SHOW_QUARTERS = 8;
  var editingSent = ''; // 센티먼트 수정 모드인 '회사|분기'

  views.company = function (main, r) {
    var companies = App.data.companies();
    var c = App.data.company(r.company) || companies[0];
    if (!c) {
      main.appendChild(f.empty('회사가 없습니다', '관리 탭에서 회사를 추가하세요.'));
      return;
    }
    var layout = h('div', { class: 'split' });
    layout.appendChild(sideList(companies, c.id));
    var body = h('div', { class: 'split__main' });
    layout.appendChild(body);
    main.appendChild(layout);

    if (r.edit === 'grid') {
      App.editGrid(body, c);
      return;
    }
    if (r.edit) {
      App.editQuarter(body, c, r.period, r.edit === 'new');
      return;
    }
    detail(body, c, r);
  };

  function sideList(companies, cur) {
    var nav = h('nav', { class: 'side', 'aria-label': '회사' });
    [['OEM', '완성차'], ['Tier1', '부품사']].forEach(function (g) {
      var list = companies.filter(function (c) { return c.group === g[0]; });
      if (!list.length) return;
      nav.appendChild(h('div', { class: 'side__group', text: g[1] }));
      list.forEach(function (c) {
        var latest = C.latestPeriod(App.data.report(c.id));
        nav.appendChild(h('button', {
          type: 'button',
          class: 'side__item' + (c.id === cur ? ' is-active' : ''),
          'aria-current': c.id === cur ? 'true' : null,
          onclick: function () { App.go({ tab: 'company', company: c.id }); },
        }, [f.logo(c, 'sm'), h('span', { class: 'side__name', text: c.nameKo || c.name }),
          h('span', { class: 'side__meta', text: latest ? C.periodLabel(latest) : '' })]));
      });
    });
    return nav;
  }

  function detail(body, c, r) {
    var rep = App.data.report(c.id);
    var fx = App.data.fx();
    var rows = C.table(rep, c, fx);
    var period = r.period && C.quarterOf(rep, r.period) ? r.period : rows.length ? rows[0].period : null;

    body.appendChild(h('section', { class: 'chead' }, [
      f.logo(c, 'lg'),
      h('div', { class: 'chead__text' }, [
        h('h2', { class: 'chead__name', text: c.nameKo || c.name }),
        h('div', { class: 'chead__meta' }, [
          c.name,
          c.ticker ? ' · ' + c.ticker : '',
          ' · 발표 통화 ' + c.currency,
          ' · 회계연도 ' + (+c.fyEnd === 12 ? '1~12월' : (+c.fyEnd % 12 + 1) + '월 시작'),
        ]),
      ]),
      h('div', { class: 'app__spacer' }),
      f.btn('콜 요약 넣기', function () { App.go({ tab: 'import', company: c.id, period: period || '' }); }),
      f.btn('과거 실적 한꺼번에', function () { App.go({ edit: 'grid', period: '' }); }),
      f.btn('분기 추가', function () { App.go({ edit: 'new', period: '' }); }, 'primary'),
    ]));

    if (!rows.length) {
      body.appendChild(h('section', { class: 'panel' }, f.empty(
        c.nameKo + ' 자료가 아직 없습니다',
        null,
        [f.btn('자료 넣기', function () { App.go({ tab: 'import', company: c.id }); }, 'primary'),
          f.btn('과거 실적 한꺼번에', function () { App.go({ edit: 'grid' }); }),
          f.btn('분기 추가', function () { App.go({ edit: 'new' }); })]
      )));
      return;
    }

    var recent = rows.slice(0, SHOW_QUARTERS).reverse();
    body.appendChild(h('section', { class: 'panel' }, [
      h('div', { class: 'panel__bar' }, [
        h('h3', { class: 'panel__title', text: '분기 실적' }),
        h('span', { class: 'muted small', text: 'MUSD · 전년 대비는 발표 통화 기준 · * 원문에 적힌 부채비율' }),
      ]),
      quarterTable(recent, period, c),
    ]));

    body.appendChild(h('section', { class: 'grid3' }, [
      h('div', { class: 'panel' }, App.chart.columns({
        title: '매출',
        unit: 'MUSD',
        format: f.musd,
        data: recent.map(function (d) {
          return { label: C.periodLabel(d.period), value: d.musd.revenue, tip: [d.quarter.fiscalLabel || '', '전년 대비 ' + f.pct(d.yoy.revenue, true)] };
        }),
      })),
      h('div', { class: 'panel' }, App.chart.columns({
        title: '영업이익률',
        unit: '%',
        format: function (v) { return f.num(v, 1); },
        data: recent.map(function (d) {
          return { label: C.periodLabel(d.period), value: d.opMargin, tip: ['영업이익 ' + f.musd(d.musd.operatingIncome) + ' MUSD'] };
        }),
      })),
      h('div', { class: 'panel' }, App.chart.columns({
        title: '부채비율',
        unit: '%',
        format: function (v) { return f.num(v, 0); },
        data: recent.map(function (d) {
          return { label: C.periodLabel(d.period), value: d.debtRatio, tip: [d.debtRatioSource === 'reported' ? '원문에 적힌 비율' : '부채총계 / 자본총계'] };
        }),
      })),
    ]));

    var heat = sentimentTrend(recent, period);
    if (heat) body.appendChild(heat);

    if (period) body.appendChild(quarterDetail(c, rep, period));
  }

  function quarterTable(cols, period, c) {
    function cell(d, text, cls) {
      return h('td', {
        class: 'num' + (d.period === period ? ' is-sel' : '') + (cls ? ' ' + cls : ''),
        text: text,
      });
    }
    var notes = c.metricNotes || {};
    var defs = [
      ['매출', function (d) { return f.musd(d.musd.revenue); }],
      ['  전년 대비', function (d) { return f.pct(d.yoy.revenue, true); }, 'sub'],
      ['영업이익' + (notes.operatingIncome && notes.operatingIncome !== '영업이익' ? ' (' + notes.operatingIncome + ')' : ''), function (d) { return f.musd(d.musd.operatingIncome); }],
      ['  전년 대비', function (d) { return f.pct(d.yoy.operatingIncome, true); }, 'sub'],
      ['영업이익률', function (d) { return f.pct(d.opMargin); }],
      ['부채비율', function (d) { return f.pct(d.debtRatio) + (d.debtRatioSource === 'reported' ? ' *' : ''); }],
      ['판매 대수 (천 대)' + (notes.deliveries ? ' (' + notes.deliveries + ')' : ''), function (d) { return f.num(d.deliveries); }],
      ['  전년 대비', function (d) { return d.deliveries === null ? '-' : f.pct(d.yoy.deliveries, true); }, 'sub'],
      ['환율 (' + c.currency + '/USD)', function (d) {
        if (d.currency === 'USD') return '-';
        if (d.fx.source === 'missing') return '환율 없음';
        return f.rate(d.fx.rate) + (d.fx.source === 'override' ? ' *' : '');
      }, 'sub'],
    ];
    // 값이 하나도 없는 줄은 숨깁니다 (예: 조정 영업이익이 없는 회사)
    defs = defs.filter(function (def) {
      return cols.some(function (d) { var v = def[1](d); return v !== '-' && v !== ''; });
    });
    var head = h('tr', null, [h('th', { class: 'th', text: '' })].concat(cols.map(function (d) {
      return h('th', { class: 'th num th--link' + (d.period === period ? ' is-sel' : '') }, h('button', {
        type: 'button',
        class: 'link',
        onclick: function () { App.go({ period: d.period }, true); },
      }, [C.periodLabel(d.period), h('span', { class: 'th__sub', text: d.quarter.fiscalLabel || '' })]));
    })));
    var body = defs.map(function (def) {
      return h('tr', { class: def[2] === 'sub' ? 'tr--sub' : '' }, [h('td', { class: 'rowh', text: def[0].trim() })].concat(cols.map(function (d) {
        var v = def[1](d);
        return cell(d, v, v === '환율 없음' ? 'warn' : '');
      })));
    });
    return h('div', { class: 'table__scroll' }, h('table', { class: 'table table--q' }, [h('thead', null, head), h('tbody', null, body)]));
  }

  function quarterDetail(c, rep, period) {
    var q = C.quarterOf(rep, period);
    var call = q.call;
    var box = h('section', { class: 'panel qd' });
    box.appendChild(h('div', { class: 'panel__bar' }, [
      h('h3', { class: 'panel__title', text: C.periodLabel(period, true) + (q.fiscalLabel ? ' · ' + q.fiscalLabel : '') }),
      f.statusBadge(q.status),
      h('div', { class: 'app__spacer' }),
      f.btn('편집', function () { App.go({ edit: '1', period: period }); }, 'sm'),
      f.btn('삭제', function () {
        App.ui.confirm(C.periodLabel(period) + ' 자료를 지웁니다. 파일로 저장하기 전까지는 관리 탭에서 되돌릴 수 있습니다.', function (yes) {
          if (!yes) return;
          App.data.putReport(c.id, M.removeQuarter(rep, period));
          App.go({ period: '' });
        }, { danger: true, okLabel: '지우기' });
      }, 'ghost sm'),
    ]));
    box.appendChild(h('div', { class: 'meta' }, [
      q.reportDate ? h('span', null, '발표일 ' + q.reportDate) : null,
      call && call.date ? h('span', null, '콜 ' + call.date) : null,
      q.source ? h('span', { class: 'meta__src', title: q.source }, '출처 ' + q.source) : null,
      q.origin === 'outside' ? h('span', null, '바깥에서 받은 자료') : null,
      q.updatedAt ? h('span', null, '고친 때 ' + q.updatedAt) : null,
    ]));
    if (q.note) box.appendChild(h('p', { class: 'note', text: q.note }));
    if (q.sentiment && editingSent === c.id + '|' + period) {
      box.appendChild(sentEditor(c, rep, q));
    } else if (q.sentiment) {
      box.appendChild(h('div', { class: 'sent-box' }, f.sentTable(q.sentiment).concat([
        h('div', { class: 'row' }, [
          f.btn('수정', function () { editingSent = c.id + '|' + period; App.render(); }, 'sm'),
          f.btn('다시 매기기', function () { App.go({ tab: 'import', company: c.id, period: period }); }, 'ghost sm'),
          h('span', { class: 'muted small', text: '점수 매긴 때 ' + (q.sentiment.scoredAt || '-') + (q.sentiment.editedAt ? ', 사람이 고친 때 ' + q.sentiment.editedAt : '') }),
        ]),
      ])));
    } else if (q.call) {
      box.appendChild(h('div', { class: 'row' }, [
        h('span', { class: 'muted', text: '센티먼트 점수가 없습니다.' }),
        f.btn('점수 매기기', function () { App.go({ tab: 'import', company: c.id, period: period }); }, 'sm'),
      ]));
    }

    if (!call) {
      box.appendChild(f.empty('컨퍼런스콜 요약이 없습니다', null, [
        f.btn('콜 요약 넣기', function () { App.go({ tab: 'import', company: c.id, period: period }); }, 'primary'),
      ]));
      return box;
    }
    if (call.summary) box.appendChild(h('p', { class: 'summary', text: call.summary }));

    var cols = h('div', { class: 'grid2 grid2--top' });
    var hl = h('div', null, [h('h4', { class: 'sub__title', text: '하이라이트' })]);
    var byTopic = {};
    (call.highlights || []).forEach(function (x) {
      (byTopic[x.topic] = byTopic[x.topic] || []).push(x.text);
    });
    if (!(call.highlights || []).length) hl.appendChild(h('p', { class: 'muted', text: '없음' }));
    C.TOPICS.forEach(function (t) {
      if (!byTopic[t]) return;
      hl.appendChild(h('div', { class: 'hl' }, [
        f.chip(t, 'topic'),
        h('ul', { class: 'hl__list' }, byTopic[t].map(function (s) { return h('li', { text: s }); })),
      ]));
    });
    cols.appendChild(hl);
    cols.appendChild(h('div', null, [
      h('h4', { class: 'sub__title', text: '가이던스' }),
      call.guidance ? h('p', { class: 'guidance', text: call.guidance }) : h('p', { class: 'muted', text: '없음' }),
      (call.sources || []).length ? h('div', { class: 'muted small' }, ['출처: ', call.sources.join(', ')]) : null,
      transcriptBlock(c, period, call),
    ]));
    box.appendChild(cols);

    box.appendChild(h('h4', { class: 'sub__title', text: 'Q&A ' + (call.qa || []).length + '건' }));
    var qa = h('div', { class: 'qa' });
    (call.qa || []).forEach(function (x, i) {
      qa.appendChild(h('details', { class: 'qa__item', open: i < 3 }, [
        h('summary', { class: 'qa__q' }, [
          f.chip(x.topic, 'topic'),
          h('span', { class: 'qa__qt', text: x.question }),
          h('span', { class: 'qa__who', text: [x.asker, x.firm].filter(Boolean).join(', ') }),
        ]),
        h('div', { class: 'qa__a' }, [
          h('span', { class: 'qa__by', text: (x.answerer || '답변') + ': ' }),
          x.answer,
        ]),
      ]));
    });
    box.appendChild(qa);
    return box;
  }

  /**
   * 센티먼트 수정 모드. 총평, 요인별 방향, 근거, 인용은 그 자리에서 고치고,
   * 점수는 사람 점수(manual)로 저장합니다. 모델 점수는 그대로 남아 옆에 보입니다.
   */
  function sentEditor(c, rep, q) {
    var SE2 = App.ea.sentiment;
    var draft = JSON.parse(JSON.stringify(q.sentiment));
    draft.manual = draft.manual || {};
    draft.model = draft.model || {};
    function inp(val, ph, onInput, cls) {
      return h('input', { class: 'input input--sm' + (cls ? ' ' + cls : ''), value: val || '', placeholder: ph, oninput: function (e) { onInput(e.target.value); } });
    }
    var rows = SE2.FACTORS.map(function (fct) {
      var m = draft.model[fct.key] = draft.model[fct.key] || { score: null, direction: '언급 없음', reason: '', quote: '' };
      var man = draft.manual[fct.key];
      return h('tr', null, [
        h('td', { class: 'rowh', text: fct.label }),
        h('td', null, f.sentCell(m.score, { title: '모델 점수' })),
        h('td', null, h('input', {
          class: 'input input--num input--sm', inputmode: 'numeric', placeholder: '0~10', value: man === undefined || man === null ? '' : man,
          'aria-label': fct.label + ' 사람 점수',
          oninput: function (e) {
            var n = C.toNumber(e.target.value);
            if (n === null || n < 0 || n > 10) delete draft.manual[fct.key];
            else draft.manual[fct.key] = Math.round(n);
          },
        })),
        h('td', null, h('select', { class: 'input input--sm', 'aria-label': fct.label + ' 방향', onchange: function (e) { m.direction = e.target.value; } },
          SE2.DIRECTIONS.map(function (d) { return h('option', { value: d, selected: d === m.direction, text: d }); }))),
        h('td', { class: 'td--wrap' }, h('textarea', { class: 'input textarea', rows: 2, 'aria-label': fct.label + ' 근거', oninput: function (e) { m.reason = e.target.value; } }, m.reason || '')),
        h('td', { class: 'td--wrap' }, inp(m.quote, '짧은 인용', function (v) { m.quote = v; })),
      ]);
    });
    function save() {
      draft.editedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      var nq = JSON.parse(JSON.stringify(q));
      nq.sentiment = draft;
      nq.origin = 'inside';
      nq.updatedAt = draft.editedAt;
      editingSent = '';
      App.data.putReport(c.id, M.putQuarter(App.data.report(c.id), nq));
      App.ui.toast('센티먼트를 고쳤습니다. 파일 반영은 관리 탭에서 합니다.', 'ok');
    }
    return h('div', { class: 'sent-box sent-box--edit' }, [
      h('div', { class: 'panel__bar' }, [
        h('h4', { class: 'sub__title', text: '센티먼트 수정' }),
        h('span', { class: 'muted small', text: '사람 점수를 비우면 모델 점수를 씁니다.' }),
        h('div', { class: 'app__spacer' }),
        f.btn('취소', function () { editingSent = ''; App.render(); }, 'sm'),
        f.btn('저장', save, 'primary sm'),
      ]),
      f.field('총평', h('textarea', { class: 'input textarea', rows: 2, oninput: function (e) { draft.summary = e.target.value; } }, draft.summary || '')),
      h('div', { class: 'table__scroll' }, h('table', { class: 'table table--sent table--form' }, [
        h('thead', null, h('tr', null, ['요인', '모델 점수', '사람 점수', '방향', '근거', '인용'].map(function (t) { return h('th', { class: 'th', text: t }); }))),
        h('tbody', null, rows),
      ])),
    ]);
  }

  /** 요인별 점수 추이 (최근 분기, 오래된 것부터). 점수가 하나도 없으면 그리지 않습니다. */
  function sentimentTrend(cols, period) {
    if (!cols.some(function (d) { return d.quarter.sentiment; })) return null;
    var head = h('tr', null, [h('th', { class: 'th', text: '요인' })].concat(cols.map(function (d) {
      return h('th', { class: 'th num' + (d.period === period ? ' is-sel' : ''), text: C.periodLabel(d.period) });
    })));
    function row(label, getter, strong) {
      return h('tr', null, [h('td', { class: 'rowh', text: label })].concat(cols.map(function (d) {
        var sent = d.quarter.sentiment;
        var cell = h('td', { class: 'heat__cell' });
        if (!sent) { cell.appendChild(h('span', { class: 'muted small', text: '' })); return cell; }
        var v = getter(sent);
        cell.appendChild(f.sentCell(v.score, { manual: v.source === 'manual', cls: strong ? 'sent--big' : '' }));
        return cell;
      })));
    }
    var rows = [row('종합', function (sent) { return { score: SE.index(sent), source: null }; }, true)].concat(SE.FACTORS.map(function (fct) {
      return row(fct.label, function (sent) { return SE.effective(sent)[fct.key]; });
    }));
    return h('section', { class: 'panel' }, [
      h('div', { class: 'panel__bar' }, [h('h3', { class: 'panel__title', text: '센티먼트 추이' }),
      ]),
      f.sentLegend(),
      h('div', { class: 'table__scroll' }, h('table', { class: 'table heat' }, [h('thead', null, head), h('tbody', null, rows)])),
    ]);
  }

  function transcriptBlock(c, period, call) {
    var tr = call.transcript;
    if (!tr) return null;
    var wrap = h('div', { class: 'tr' }, [
      h('h4', { class: 'sub__title', text: '원문' }),
      h('div', { class: 'muted small', text: [tr.source, tr.url].filter(Boolean).join(' · ') || '출처 없음' }),
    ]);
    if (tr.stored) {
      wrap.appendChild(f.btn('원문 보기', function () {
        App.data.loadTranscripts(c.id).then(function (t) {
          var item = t.items[period];
          if (!item) {
            App.ui.toast('원문 파일(data/transcripts/' + c.id + '.js)을 찾지 못했습니다.', 'warn');
            return;
          }
          App.ui.modal({
            title: (c.nameKo || c.name) + ' ' + C.periodLabel(period) + ' 원문',
            body: h('pre', { class: 'transcript', text: item.text }),
            actions: [{ label: '닫기' }],
          });
          var m = document.querySelector('.modal');
          if (m) m.classList.add('modal--wide');
        });
      }, 'sm'));
    }
    return wrap;
  }
})(window);
