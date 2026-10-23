/* 자료 넣기: 원문 -> 프롬프트 -> 사내 모델 답 -> 검사 -> 분기에 넣기.
 * 입력한 내용은 이 탭을 떠나도 페이지를 닫기 전까지 남아 있습니다 (브라우저에 저장하지는 않음).
 */
(function (global) {
  'use strict';
  var App = global.App;
  var h = App.dom.h;
  var f = App.f;
  var C = App.ea.core;
  var P = App.ea.parse;
  var M = App.ea.merge;
  var PR = App.ea.prompt;
  var views = (App.views = App.views || {});

  var SOURCES = ['Yahoo Finance', '회사 IR', 'Seeking Alpha', '기타'];

  var S = {
    company: '',
    period: '',
    routeKey: '',
    transcript: '',
    release: '',
    source: 'Yahoo Finance',
    url: '',
    keep: true,
    max: PR.DEFAULT_MAX,
    prompts: [],
    split: null,
    numPrompt: '',
    answers: [],
    numAnswer: '',
    checked: null,
  };

  function resetOutputs() {
    S.prompts = [];
    S.split = null;
    S.numPrompt = '';
    S.answers = [];
    S.numAnswer = '';
    S.checked = null;
  }

  views.import = function (main, r) {
    var companies = App.data.companies();
    var key = (r.company || '') + '|' + (r.period || '');
    if (key !== S.routeKey) {
      S.routeKey = key;
      if (r.company) S.company = r.company;
      if (r.period) S.period = r.period;
    }
    if (!App.data.company(S.company)) S.company = companies.length ? companies[0].id : '';
    if (!C.parsePeriod(S.period)) S.period = C.lastClosedPeriod();
    var c = App.data.company(S.company);
    if (!c) {
      main.appendChild(f.empty('회사가 없습니다', '관리 탭에서 회사를 추가하세요.'));
      return;
    }

    main.appendChild(h('p', { class: 'lead', text: '녹취록과 보도자료를 붙여 넣으면 사내 모델(ChatGPT Enterprise, Qwen)에 줄 프롬프트가 나옵니다. 모델 답을 4번 칸에 붙여 넣고 검사한 뒤 넣습니다. 프롬프트 없이 모델 답이나 손으로 쓴 JSON 만 있으면 4번부터 하면 됩니다.' }));
    main.appendChild(step1(c));
    main.appendChild(step2(c));
    main.appendChild(step3());
    main.appendChild(step4(c));
    main.appendChild(step5(c));
  };

  function stepBox(n, title, children, hint) {
    return h('section', { class: 'panel step' }, [
      h('div', { class: 'step__head' }, [h('span', { class: 'step__n', text: String(n) }), h('h2', { class: 'panel__title', text: title })]),
      hint ? h('p', { class: 'panel__hint', text: hint }) : null,
    ].concat(children));
  }

  function step1(c) {
    var companies = App.data.companies();
    var periods = f.periodChoices(App.data.reports());
    if (periods.indexOf(S.period) < 0) periods.unshift(S.period);
    var compSel = h('select', { class: 'input', onchange: function (e) { S.company = e.target.value; resetOutputs(); App.render(); } },
      companies.map(function (x) { return h('option', { value: x.id, selected: x.id === S.company, text: (x.nameKo || x.name) + ' (' + x.name + ')' }); }));
    var perSel = h('select', { class: 'input', onchange: function (e) { S.period = e.target.value; resetOutputs(); App.render(); } },
      periods.map(function (p) { return h('option', { value: p, selected: p === S.period, text: C.periodLabel(p, true) }); }));
    var other = h('input', { class: 'input input--sm', placeholder: '다른 분기 (예: 2024Q4)', onchange: function (e) {
      var p = C.normPeriod(e.target.value);
      if (!p) { App.ui.toast('분기를 2024Q4 처럼 적어 주세요.', 'warn'); return; }
      S.period = p;
      resetOutputs();
      App.render();
    } });
    var q = C.quarterOf(App.data.report(c.id), S.period);
    return stepBox(1, '회사와 분기', [
      h('div', { class: 'form-grid' }, [
        f.field('회사', compSel),
        f.field('분기 (달력 기준)', perSel, '회사 표기: ' + C.fiscalLabel(S.period, c.fyEnd) + ' (회계연도 ' + (+c.fyEnd === 12 ? '1~12월' : (+c.fyEnd % 12 + 1) + '월 시작') + ')'),
        f.field('목록에 없는 분기', other),
      ]),
      q ? h('div', { class: 'notice' }, [
        C.periodLabel(S.period) + ' 자료가 이미 있습니다 (숫자 ' + Object.keys(q.values || {}).length + '개, ' +
          (q.call ? '콜 요약 있음' : '콜 요약 없음') + '). 넣으면 같은 항목을 바꿉니다.',
      ]) : null,
    ]);
  }

  function step2(c) {
    var ta = h('textarea', {
      class: 'input textarea textarea--tall', rows: 10,
      placeholder: '컨퍼런스콜 녹취록 전체를 붙여 넣습니다. (Yahoo Finance > 종목 > Earnings Call Transcript 등)',
      oninput: function (e) { S.transcript = e.target.value; count.textContent = S.transcript.length.toLocaleString() + '자'; },
    }, S.transcript);
    var count = h('span', { class: 'muted', text: S.transcript.length.toLocaleString() + '자' });
    var rel = h('textarea', {
      class: 'input textarea', rows: 5,
      placeholder: '(선택) 실적 보도자료의 요약표나 첫 장을 붙여 넣으면 숫자 프롬프트가 따로 나옵니다.',
      oninput: function (e) { S.release = e.target.value; },
    }, S.release);
    return stepBox(2, '원문 붙여 넣기', [
      f.field('컨퍼런스콜 녹취록', ta),
      h('div', { class: 'row' }, [count,
        h('label', { class: 'check' }, [h('input', { type: 'checkbox', checked: S.keep, onchange: function (e) { S.keep = e.target.checked; } }), ' 원문도 보관 (data/transcripts 에 저장, 화면에서 "원문 보기")']),
      ]),
      h('div', { class: 'form-grid' }, [
        f.field('원문 출처', h('select', { class: 'input', onchange: function (e) { S.source = e.target.value; } },
          SOURCES.map(function (s) { return h('option', { value: s, selected: s === S.source, text: s }); }))),
        f.field('원문 주소 (선택)', h('input', { class: 'input', value: S.url, placeholder: 'https://...', oninput: function (e) { S.url = e.target.value; } })),
        f.field('조각 최대 글자 수', h('input', { class: 'input', inputmode: 'numeric', value: S.max, oninput: function (e) { S.max = C.toNumber(e.target.value) || PR.DEFAULT_MAX; } }),
          '모델 답이 중간에 끊기면 줄입니다. 영문 약 6글자가 1토큰'),
      ]),
      f.field('보도자료 숫자 (선택)', rel),
      h('div', { class: 'row' }, [
        f.btn('프롬프트 만들기', function () {
          if (!S.transcript.trim() && !S.release.trim()) {
            App.ui.toast('녹취록이나 보도자료를 붙여 넣어 주세요.', 'warn');
            return;
          }
          var keepAnswers = S.answers;
          resetOutputs();
          if (S.transcript.trim()) {
            var built = PR.buildCallPrompts(c, S.period, S.transcript, S.max);
            S.prompts = built.prompts;
            S.split = built.split;
            S.answers = S.prompts.map(function (_, i) { return keepAnswers[i] || ''; });
          }
          if (S.release.trim()) S.numPrompt = PR.buildNumbersPrompt(c, S.period, S.release);
          App.render();
          var el = document.getElementById('step3');
          if (el) el.scrollIntoView({ block: 'start' });
        }, 'primary'),
      ]),
    ]);
  }

  function copy(text, btn) {
    function done() {
      var old = btn.textContent;
      btn.textContent = '복사됨';
      setTimeout(function () { btn.textContent = old; }, 1500);
    }
    function fallback() {
      var t = h('textarea', { class: 'sr-only' }, text);
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); done(); } catch (e) { App.ui.toast('복사하지 못했습니다. 글을 직접 선택해 복사하세요.', 'warn'); }
      document.body.removeChild(t);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  function promptCard(title, meta, text) {
    var pre = h('textarea', { class: 'input textarea prompt__text', rows: 8, readonly: true }, text);
    var b = h('button', { class: 'btn btn--primary btn--sm', type: 'button', text: '복사', onclick: function () { copy(text, b); } });
    return h('div', { class: 'prompt' }, [
      h('div', { class: 'prompt__head' }, [h('span', { class: 'prompt__title', text: title }), h('span', { class: 'muted', text: meta }), h('div', { class: 'app__spacer' }), b]),
      h('details', null, [h('summary', { class: 'muted small', text: '프롬프트 보기' }), pre]),
    ]);
  }

  function step3() {
    var kids = [];
    if (!S.prompts.length && !S.numPrompt) {
      kids.push(h('p', { class: 'muted', text: '2번에서 프롬프트 만들기를 누르면 여기에 나옵니다.' }));
    } else {
      if (S.prompts.length > 1) {
        kids.push(h('div', { class: 'notice' }, '원문이 길어 ' + S.prompts.length + '개로 나눴습니다' +
          (S.split && S.split.found ? ' (발표와 질의응답 경계를 찾음).' : '. 질의응답 시작 표지를 찾지 못해 글자 수로만 나눴습니다.') +
          ' 조각마다 새 대화창에서 시키면 더 정확합니다.'));
      }
      S.prompts.forEach(function (p) {
        kids.push(promptCard('콜 요약 ' + p.title, p.chars.toLocaleString() + '자', p.text));
      });
      if (S.numPrompt) kids.push(promptCard('보도자료 숫자', '', S.numPrompt));
    }
    var box = stepBox(3, '사내 모델에 붙여 넣기', kids, '복사해서 ChatGPT Enterprise 나 Qwen 대화창에 붙여 넣습니다. 답으로 JSON 이 옵니다.');
    box.id = 'step3';
    return box;
  }

  function step4(c) {
    var boxes = [];
    var n = Math.max(1, S.prompts.length);
    while (S.answers.length < n) S.answers.push('');
    for (var i = 0; i < n; i++) {
      (function (i) {
        var label = S.prompts.length ? '콜 요약 답 ' + S.prompts[i].title : '콜 요약 답 (JSON)';
        boxes.push(f.field(label, h('textarea', {
          class: 'input textarea mono', rows: 6, placeholder: '{ "company": ..., "highlights": [...], "qa": [...] }',
          oninput: function (e) { S.answers[i] = e.target.value; S.checked = null; },
        }, S.answers[i] || '')));
      })(i);
    }
    boxes.push(f.field('보도자료 숫자 답 (JSON, 선택)', h('textarea', {
      class: 'input textarea mono', rows: 5, placeholder: '{ "company": ..., "values": [...] }',
      oninput: function (e) { S.numAnswer = e.target.value; S.checked = null; },
    }, S.numAnswer)));
    boxes.push(h('div', { class: 'row' }, [
      f.btn('검사', function () { S.checked = check(c); App.render(); var el = document.getElementById('step5'); if (el) el.scrollIntoView({ block: 'start' }); }, 'primary'),
      S.prompts.length ? null : f.btn('답 칸 더하기', function () { S.answers.push(''); S.prompts = []; App.render(); }, 'sm'),
    ]));
    return stepBox(4, '모델 답 붙여 넣기', boxes, '앞뒤 설명이나 ``` 울타리가 붙어 있어도 됩니다. 조각이 여럿이면 순서대로 칸마다 붙여 넣습니다.');
  }

  /** 붙여 넣은 답을 모두 읽고 검사합니다. */
  function check(c) {
    var ctx = { companies: App.data.companies(), company: c.id, period: S.period };
    var out = { parts: [], numbers: null, call: null, ok: true };
    S.answers.forEach(function (text, i) {
      if (!String(text || '').trim()) return;
      var res = { index: i, errors: [], warnings: [], fixed: [] };
      var j = P.lenientJson(text);
      if (!j.ok) {
        res.errors.push(j.error);
      } else {
        res.fixed = j.fixed;
        var kinds = P.detect(j.value);
        if (kinds.indexOf('call') >= 0) {
          var rc = P.readCall(j.value, ctx);
          res.errors = res.errors.concat(rc.errors);
          res.warnings = res.warnings.concat(rc.warnings);
          res.call = rc.call;
        }
        // 콜 요약 칸에 숫자가 같이 오면 그것도 씁니다.
        if (kinds.indexOf('numbers') >= 0 && !out.numbers) {
          var rn = P.readNumbers(j.value, ctx);
          if (rn.ok) out.numbers = rn;
        }
        if (!kinds.length) res.errors.push('highlights, qa, values 중 아무것도 없습니다. 콜 요약 답이 맞는지 보세요.');
      }
      if (res.errors.length) out.ok = false;
      out.parts.push(res);
    });
    if (String(S.numAnswer || '').trim()) {
      var j2 = P.lenientJson(S.numAnswer);
      var res2 = { index: 'num', errors: [], warnings: [], fixed: [] };
      if (!j2.ok) res2.errors.push(j2.error);
      else {
        res2.fixed = j2.fixed;
        var rn2 = P.readNumbers(j2.value, ctx);
        res2.errors = rn2.errors;
        res2.warnings = rn2.warnings;
        if (rn2.ok) out.numbers = rn2;
      }
      if (res2.errors.length) out.ok = false;
      out.parts.push(res2);
    }
    var calls = out.parts.map(function (p) { return p.call; }).filter(Boolean);
    if (calls.length) out.call = M.joinCalls(calls);
    if (!calls.length && !out.numbers) out.ok = false;
    return out;
  }

  function step5(c) {
    var k = S.checked;
    var kids = [];
    if (!k) {
      kids.push(h('p', { class: 'muted', text: '4번에서 검사를 누르면 결과와 미리보기가 나옵니다.' }));
    } else {
      k.parts.forEach(function (p) {
        var name = p.index === 'num' ? '숫자 답' : '콜 요약 답 ' + (S.prompts[p.index] ? S.prompts[p.index].title : p.index + 1);
        kids.push(h('div', { class: 'check-row ' + (p.errors.length ? 'is-bad' : 'is-good') }, [
          h('span', { class: 'check-row__name', text: name + (p.errors.length ? ' : 고칠 것 있음' : ' : 읽음') }),
          p.errors.length ? h('ul', { class: 'msgs msgs--err' }, p.errors.map(function (e) { return h('li', { text: e }); })) : null,
          p.warnings.length ? h('ul', { class: 'msgs msgs--warn' }, p.warnings.map(function (e) { return h('li', { text: e }); })) : null,
          p.fixed.length ? h('div', { class: 'muted small', text: '자동으로 고침: ' + p.fixed.join(', ') }) : null,
        ]));
      });
      if (!k.parts.length) kids.push(h('p', { class: 'muted', text: '붙여 넣은 답이 없습니다.' }));
      if (k.call) kids.push(previewCall(k.call));
      if (k.numbers) kids.push(previewNumbers(c, k.numbers.numbers));
      if (k.numbers && k.numbers.warnings.length && !k.parts.some(function (p) { return p.index === 'num'; })) {
        kids.push(h('ul', { class: 'msgs msgs--warn' }, k.numbers.warnings.map(function (e) { return h('li', { text: e }); })));
      }
      kids.push(h('div', { class: 'row' }, [
        f.btn(C.periodLabel(S.period) + ' ' + (c.nameKo || c.name) + ' 에 넣기', function () { apply(c); }, 'primary', { disabled: !k.ok }),
        k.ok ? h('span', { class: 'muted', text: '넣은 뒤 회사별 화면에서 고칠 수 있습니다. 상태는 "검증 필요" 로 들어갑니다.' })
          : h('span', { class: 'warn', text: '빨간 항목을 고친 뒤 다시 검사하세요. 고칠 수 없으면 모델에게 오류 문장을 그대로 주고 다시 답하게 합니다.' }),
      ]));
    }
    var box = stepBox(5, '검사와 넣기', kids);
    box.id = 'step5';
    return box;
  }

  function previewCall(call) {
    return h('div', { class: 'preview' }, [
      h('h4', { class: 'sub__title', text: '콜 요약 미리보기: 하이라이트 ' + call.highlights.length + '개, Q&A ' + call.qa.length + '건' }),
      call.summary ? h('p', { class: 'summary', text: call.summary }) : null,
      h('ul', { class: 'hl__list' }, call.highlights.map(function (x) { return h('li', null, [f.chip(x.topic, 'topic'), ' ', x.text]); })),
      call.guidance ? h('p', { class: 'guidance', text: call.guidance }) : null,
      h('ol', { class: 'qa-mini' }, call.qa.map(function (x) {
        return h('li', null, [h('span', { class: 'qa__qt', text: x.question }), h('span', { class: 'muted', text: ' ' + [x.asker, x.firm].filter(Boolean).join(', ') })]);
      })),
    ]);
  }

  function previewNumbers(c, n) {
    var cur = n.currency || c.currency;
    var fx = App.data.fx();
    var rows = C.METRICS.filter(function (m) { return n.values[m.key] !== undefined || n.ytd[m.key] !== undefined; }).map(function (m) {
      var isYtd = n.values[m.key] === undefined;
      var val = isYtd ? n.ytd[m.key] : n.values[m.key];
      var musd = m.kind === 'money' ? C.toMusd(val, cur, S.period, fx) : null;
      return h('tr', null, [
        h('td', { text: m.label + (isYtd ? ' (누계)' : '') }),
        h('td', { class: 'muted', text: n.raw[m.key] || '' }),
        h('td', { class: 'num', text: m.kind === 'money' ? f.num(val) + ' 백만 ' + cur : f.num(val, 1) + ' 천 대' }),
        h('td', { class: 'num', text: musd ? (musd.value === null ? '환율 없음' : f.musd(musd.value) + ' MUSD') : '' }),
      ]);
    });
    return h('div', { class: 'preview' }, [
      h('h4', { class: 'sub__title', text: '숫자 미리보기' + (n.fiscalLabel ? ' · ' + n.fiscalLabel : '') + (n.reportDate ? ' · 발표 ' + n.reportDate : '') }),
      h('table', { class: 'table' }, [
        h('thead', null, h('tr', null, ['지표', '원문 표기', '저장 값', '달러 환산'].map(function (t) { return h('th', { class: 'th', text: t }); }))),
        h('tbody', null, rows),
      ]),
      h('p', { class: 'muted small', text: '원문 표기와 저장 값의 자릿수가 맞는지 꼭 봅니다. 단위 실수가 가장 흔한 오류입니다.' }),
    ]);
  }

  function apply(c) {
    var k = S.checked;
    var rep = App.data.report(c.id);
    var existing = C.quarterOf(rep, S.period);
    function go() {
      var next = rep;
      var warnings = [];
      if (k.numbers) {
        var res = M.applyNumbers(next, c, S.period, k.numbers.numbers);
        next = res.report;
        warnings = res.warnings;
      }
      if (k.call) {
        var tr = S.transcript.trim() ? { source: S.source, url: S.url.trim(), stored: false } : null;
        if (tr && S.keep) {
          var stored = App.data.putTranscript(c.id, S.period, {
            source: S.source,
            url: S.url.trim(),
            addedAt: new Date().toISOString().slice(0, 10),
            text: S.transcript,
          });
          tr.stored = !!stored;
        }
        next = M.applyCall(next, c, S.period, k.call, tr ? { transcript: tr } : null);
      }
      App.data.putReport(c.id, next);
      warnings.forEach(function (w) { App.ui.toast(w, 'warn', 8000); });
      App.ui.toast('넣었습니다. 관리 탭에서 파일로 저장하면 다른 사람도 봅니다.', 'ok', 5000);
      S.transcript = '';
      S.release = '';
      S.url = '';
      resetOutputs();
      App.go({ tab: 'company', company: c.id, period: S.period });
    }
    if (existing && ((k.call && existing.call) || (k.numbers && Object.keys(existing.values || {}).length))) {
      App.ui.confirm(C.periodLabel(S.period) + ' 에 이미 있는 ' + [k.call && existing.call ? '콜 요약' : '', k.numbers && Object.keys(existing.values || {}).length ? '숫자' : ''].filter(Boolean).join('과 ') +
        '을(를) 새 답으로 바꿉니다.', function (yes) { if (yes) go(); }, { okLabel: '바꾸기' });
    } else go();
  }
})(window);
