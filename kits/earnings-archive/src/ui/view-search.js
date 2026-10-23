/* 찾기: 모든 회사, 모든 분기의 하이라이트와 Q&A 에서 낱말과 주제로 찾습니다. 예: "관세", "LFP", "ADAS". */
(function (global) {
  'use strict';
  var App = global.App;
  var h = App.dom.h;
  var f = App.f;
  var C = App.ea.core;
  var views = (App.views = App.views || {});

  var LIMIT = 200;

  views.search = function (main, r) {
    var q = r.q || '';
    var topic = r.topic || '';
    var group = r.group || '';
    var input = h('input', {
      class: 'input input--grow', type: 'search', value: q, placeholder: '낱말 (예: 관세, 가이던스, 하이브리드, 중국)', 'aria-label': '찾을 낱말',
      onkeydown: function (e) { if (e.key === 'Enter') App.go({ q: e.target.value.trim() }, true); },
    });
    main.appendChild(h('div', { class: 'toolbar' }, [
      input,
      f.btn('찾기', function () { App.go({ q: input.value.trim() }, true); }, 'primary'),
      h('select', { class: 'input input--sm', 'aria-label': '주제', onchange: function (e) { App.go({ topic: e.target.value }, true); } },
        [h('option', { value: '', text: '주제 전체' })].concat(C.TOPICS.map(function (t) { return h('option', { value: t, selected: t === topic, text: t }); }))),
      h('select', { class: 'input input--sm', 'aria-label': '회사 구분', onchange: function (e) { App.go({ group: e.target.value }, true); } },
        [['', '회사 전체'], ['OEM', '완성차'], ['Tier1', '부품사']].map(function (g) { return h('option', { value: g[0], selected: g[0] === group, text: g[1] }); })),
    ]));

    if (!q && !topic) {
      main.appendChild(h('section', { class: 'panel' }, f.empty('낱말이나 주제를 고르세요', '하이라이트, 가이던스, Q&A 질문과 답변, 질문자 이름, 증권사 이름에서 찾습니다.')));
      setTimeout(function () { input.focus(); }, 0);
      return;
    }

    var hits = [];
    var needle = q.toLowerCase();
    function has(s) {
      return !needle || String(s || '').toLowerCase().indexOf(needle) >= 0;
    }
    App.data.companies().forEach(function (c) {
      if (group && c.group !== group) return;
      (App.data.report(c.id).quarters || []).forEach(function (qq) {
        var call = qq.call;
        if (!call) return;
        (call.highlights || []).forEach(function (x) {
          if ((!topic || x.topic === topic) && has(x.text)) hits.push({ c: c, p: qq.period, kind: '하이라이트', topic: x.topic, text: x.text });
        });
        if (!topic && call.guidance && has(call.guidance)) hits.push({ c: c, p: qq.period, kind: '가이던스', topic: '가이던스', text: call.guidance });
        (call.qa || []).forEach(function (x) {
          if (topic && x.topic !== topic) return;
          if (has(x.question) || has(x.answer) || has(x.asker) || has(x.firm)) {
            hits.push({ c: c, p: qq.period, kind: 'Q&A', topic: x.topic, text: x.question, sub: (x.answerer || '답변') + ': ' + x.answer, who: [x.asker, x.firm].filter(Boolean).join(', ') });
          }
        });
      });
    });
    hits.sort(function (a, b) { return a.p < b.p ? 1 : a.p > b.p ? -1 : 0; });

    var list = h('div', { class: 'hits' });
    hits.slice(0, LIMIT).forEach(function (x) {
      list.appendChild(h('button', {
        type: 'button', class: 'hit',
        onclick: function () { App.go({ tab: 'company', company: x.c.id, period: x.p }); },
      }, [
        h('div', { class: 'hit__head' }, [f.logo(x.c, 'sm'), h('span', { class: 'hit__co', text: x.c.nameKo || x.c.name }),
          h('span', { class: 'muted', text: C.periodLabel(x.p) }), f.chip(x.kind), f.chip(x.topic, 'topic'),
          x.who ? h('span', { class: 'muted', text: x.who }) : null]),
        h('div', { class: 'hit__text' }, f.marked(x.text, q)),
        x.sub ? h('div', { class: 'hit__sub' }, f.marked(x.sub, q)) : null,
      ]));
    });
    main.appendChild(h('section', { class: 'panel' }, [
      h('div', { class: 'panel__bar' }, [h('h2', { class: 'panel__title', text: hits.length + '건' + (hits.length > LIMIT ? ' (최근 ' + LIMIT + '건만 표시)' : '') })]),
      hits.length ? list : f.empty('찾은 것이 없습니다', '낱말을 줄이거나 주제를 전체로 바꿔 보세요.'),
    ]));
  };
})(window);
