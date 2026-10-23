/* 분기 편집 화면. 숫자, 출처, 상태, 컨퍼런스콜 요약(하이라이트, 가이던스, Q&A)을 손으로 고칩니다.
 * 고친 내용은 저장을 누를 때 작업본에 들어가고, 관리 탭에서 파일로 저장합니다. 전역 App.editQuarter.
 */
(function (global) {
  'use strict';
  var App = global.App;
  var h = App.dom.h;
  var f = App.f;
  var C = App.ea.core;
  var M = App.ea.merge;

  var MONEY_UNITS = [
    { id: 'million', label: '백만' },
    { id: 'hundred_million', label: '억' },
    { id: 'billion', label: '십억 (billion)' },
    { id: 'trillion', label: '조 (trillion)' },
  ];

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  App.editQuarter = function (body, c, period, isNew) {
    var rep = App.data.report(c.id);
    var existing = period ? C.quarterOf(rep, period) : null;
    var draft = existing ? clone(existing) : M.newQuarter(c, period || C.lastClosedPeriod());
    if (!draft.call) draft.call = null;
    var moneyUnit = 'million';
    var wrap = h('section', { class: 'panel edit' });
    body.appendChild(wrap);

    function v(key) {
      return draft.values && draft.values[key] !== undefined && draft.values[key] !== null ? draft.values[key] : '';
    }

    function draw() {
      App.dom.clear(wrap);
      wrap.appendChild(h('div', { class: 'panel__bar' }, [
        h('h3', { class: 'panel__title', text: (isNew ? '분기 추가' : C.periodLabel(draft.period) + ' 편집') + ' · ' + (c.nameKo || c.name) }),
        h('div', { class: 'app__spacer' }),
        f.btn('취소', function () { App.go({ edit: '' }); }),
        f.btn('저장', save, 'primary'),
      ]));

      // 기본 정보
      var periodInput = h('input', {
        class: 'input', value: draft.period, placeholder: '2026Q3', disabled: !isNew,
        oninput: function (e) {
          var p = C.normPeriod(e.target.value);
          draft.period = p || e.target.value;
          if (p && fiscal.dataset.auto === '1') {
            fiscal.value = C.fiscalLabel(p, c.fyEnd);
            draft.fiscalLabel = fiscal.value;
          }
        },
      });
      var fiscal = h('input', {
        class: 'input', value: draft.fiscalLabel || '', dataset: { auto: draft.fiscalLabel === C.fiscalLabel(draft.period, c.fyEnd) ? '1' : '0' },
        oninput: function (e) { draft.fiscalLabel = e.target.value; e.target.dataset.auto = '0'; },
      });
      wrap.appendChild(h('div', { class: 'form-grid' }, [
        f.field('분기 (달력 기준)', periodInput, isNew ? '예: 2026Q3, Q3 2026. 3월 결산 회사의 4~6월은 Q2' : '분기를 바꾸려면 지우고 새로 추가'),
        f.field('회사 분기 표기', fiscal, '예: Q3 2026, FY2027 Q1'),
        f.field('발표일', h('input', { class: 'input', type: 'date', value: draft.reportDate || '', oninput: function (e) { draft.reportDate = e.target.value; } })),
        f.field('상태', h('select', { class: 'input', onchange: function (e) { draft.status = e.target.value; } },
          ['검증 필요', '확인'].map(function (s) { return h('option', { value: s, selected: draft.status === s, text: s }); })),
          '원문 숫자와 대조했으면 확인'),
        f.field('출처 (보도자료 주소나 문서 이름)', h('input', { class: 'input', value: draft.source || '', oninput: function (e) { draft.source = e.target.value; } })),
        f.field('메모', h('input', { class: 'input', value: draft.note || '', oninput: function (e) { draft.note = e.target.value; } })),
      ]));

      // 숫자
      var cur = draft.currency || c.currency;
      var unitSel = h('select', { class: 'input input--sm', onchange: function (e) { moneyUnit = e.target.value; draw(); } },
        MONEY_UNITS.map(function (u) { return h('option', { value: u.id, selected: u.id === moneyUnit, text: u.label + ' ' + cur }); }));
      var factor = C.MONEY_UNITS[moneyUnit];
      var ratio = h('span', { class: 'muted num-preview' });
      function updRatio() {
        var d = C.derive({ period: draft.period, values: draft.values || {} }, c, App.data.fx());
        ratio.textContent = '영업이익률 ' + f.pct(d.opMargin) + ' · 부채비율 ' + f.pct(d.debtRatio) +
          (d.debtRatioSource === 'reported' ? ' (원문 비율)' : d.debtRatioSource === 'calc' ? ' (부채총계 / 자본총계)' : '');
      }
      var numRows = C.METRICS.map(function (m) {
        var stored = v(m.key);
        var shown = stored === '' ? '' : m.kind === 'money' ? C.round(stored / factor, 6) : stored;
        var preview = h('span', { class: 'muted num-preview' });
        function upd(val) {
          var n = C.toNumber(val);
          if (n === null) {
            if (draft.values) delete draft.values[m.key];
            preview.textContent = '';
            updRatio();
            return;
          }
          var storeVal = m.kind === 'money' ? C.round(n * factor, 6) : n;
          draft.values = draft.values || {};
          draft.values[m.key] = storeVal;
          if (m.flow) {
            var r = C.toMusd(storeVal, cur, C.normPeriod(draft.period), App.data.fx(), draft.fxOverride);
            preview.textContent = r.value === null ? '환율 없음' : '= ' + f.musd(r.value) + ' MUSD';
          } else preview.textContent = m.kind === 'pct' ? '%  (부채, 자본이 없을 때만 씀)' : '분기 말 잔액';
          updRatio();
        }
        var input = h('input', { class: 'input input--num', inputmode: 'decimal', value: shown, oninput: function (e) { upd(e.target.value); } });
        upd(shown);
        var noteName = m.key === 'operatingIncome' ? (c.metricNotes || {}).operatingIncome : '';
        return h('tr', null, [
          h('td', { class: 'rowh', text: m.label + (noteName ? ' (' + noteName + ')' : '') }),
          h('td', null, input),
          h('td', null, preview),
          h('td', null, h('input', {
            class: 'input input--sm', placeholder: m.kind === 'pct' ? '원문 표기 (예: 부채비율 152.3%)' : '원문 표기 (예: $48.6 billion)', value: (draft.raw || {})[m.key] || '',
            oninput: function (e) { draft.raw = draft.raw || {}; draft.raw[m.key] = e.target.value; },
          })),
        ]);
      });
      wrap.appendChild(h('h4', { class: 'sub__title', text: '숫자' }));
      wrap.appendChild(h('div', { class: 'row' }, [
        h('span', { class: 'muted', text: '금액 입력 단위' }), unitSel,
        h('span', { class: 'muted', text: '적자는 음수. 부채비율은 % 숫자.' }),
      ]));
      wrap.appendChild(h('table', { class: 'table table--form' }, h('tbody', null, numRows)));
      wrap.appendChild(h('div', { class: 'row' }, [ratio]));
      wrap.appendChild(h('div', { class: 'form-grid' }, [
        f.field('발표 통화', h('select', { class: 'input', onchange: function (e) { draft.currency = e.target.value; draw(); } },
          C.CURRENCIES.map(function (x) { return h('option', { value: x, selected: x === cur, text: x }); }))),
        f.field('이 분기만 쓸 환율 (선택, 1 USD 당 ' + cur + ')', h('input', {
          class: 'input', inputmode: 'decimal', value: draft.fxOverride || '',
          oninput: function (e) { var n = C.toNumber(e.target.value); if (n) draft.fxOverride = n; else delete draft.fxOverride; },
        }), '비우면 관리 탭 환율 표의 분기 평균을 씁니다'),
      ]));

      // 컨퍼런스콜
      wrap.appendChild(h('h4', { class: 'sub__title', text: '컨퍼런스콜 요약' }));
      if (!draft.call) {
        wrap.appendChild(h('div', { class: 'row' }, [
          h('span', { class: 'muted', text: '요약이 없습니다.' }),
          f.btn('직접 쓰기', function () { draft.call = { date: '', summary: '', highlights: [], guidance: '', qa: [], sources: [] }; draw(); }, 'sm'),
          f.btn('녹취록으로 만들기', function () { App.go({ tab: 'import', company: c.id, period: C.normPeriod(draft.period) || '' }); }, 'sm'),
        ]));
      } else {
        callEditor(wrap, draft.call);
      }
      wrap.appendChild(h('div', { class: 'row row--end' }, [
        f.btn('취소', function () { App.go({ edit: '' }); }),
        f.btn('저장', save, 'primary'),
      ]));
    }

    function callEditor(root, call) {
      root.appendChild(h('div', { class: 'form-grid' }, [
        f.field('콜 날짜', h('input', { class: 'input', type: 'date', value: call.date || '', oninput: function (e) { call.date = e.target.value; } })),
        f.field('원문 출처', h('input', {
          class: 'input', value: call.transcript ? [call.transcript.source, call.transcript.url].filter(Boolean).join(' ') : '',
          placeholder: 'Yahoo Finance, 회사 IR 등',
          oninput: function (e) {
            var t = call.transcript || {};
            t.source = e.target.value;
            call.transcript = t;
          },
        })),
      ]));
      root.appendChild(f.field('총평', h('textarea', { class: 'input textarea', rows: 2, oninput: function (e) { call.summary = e.target.value; } }, call.summary || '')));
      root.appendChild(f.field('가이던스', h('textarea', { class: 'input textarea', rows: 3, oninput: function (e) { call.guidance = e.target.value; } }, call.guidance || '')));

      root.appendChild(listEditor('하이라이트', call.highlights, function () { return { topic: '실적', text: '' }; }, function (x) {
        return [
          topicSelect(x),
          h('textarea', { class: 'input textarea', rows: 2, placeholder: '내용', oninput: function (e) { x.text = e.target.value; } }, x.text),
        ];
      }));
      root.appendChild(listEditor('Q&A', call.qa, function () {
        return { asker: '', firm: '', question: '', answerer: '', answer: '', topic: '기타' };
      }, function (x) {
        function inp(key, ph) {
          return h('input', { class: 'input input--sm', placeholder: ph, value: x[key] || '', oninput: function (e) { x[key] = e.target.value; } });
        }
        return [
          h('div', { class: 'row' }, [topicSelect(x), inp('asker', '질문자'), inp('firm', '소속'), inp('answerer', '답변자, 직책')]),
          h('textarea', { class: 'input textarea', rows: 2, placeholder: '질문 요약', oninput: function (e) { x.question = e.target.value; } }, x.question),
          h('textarea', { class: 'input textarea', rows: 3, placeholder: '답변 요약', oninput: function (e) { x.answer = e.target.value; } }, x.answer),
        ];
      }));
      root.appendChild(h('div', { class: 'row' }, [
        f.btn('콜 요약 통째로 지우기', function () {
          App.ui.confirm('이 분기의 컨퍼런스콜 요약을 지웁니다. 숫자는 남습니다.', function (yes) {
            if (yes) { draft.call = null; draw(); }
          }, { danger: true, okLabel: '지우기' });
        }, 'ghost sm'),
      ]));
    }

    function topicSelect(x) {
      return h('select', { class: 'input input--sm', 'aria-label': '주제', onchange: function (e) { x.topic = e.target.value; } },
        C.TOPICS.map(function (t) { return h('option', { value: t, selected: t === x.topic, text: t }); }));
    }

    function listEditor(title, list, make, fields) {
      var box = h('div', { class: 'le' }, [h('div', { class: 'le__head' }, [
        h('span', { class: 'le__title', text: title + ' ' + list.length + '개' }),
        f.btn('추가', function () { list.push(make()); draw(); }, 'sm'),
      ])]);
      list.forEach(function (x, i) {
        box.appendChild(h('div', { class: 'le__item' }, [
          h('div', { class: 'le__fields' }, fields(x)),
          h('div', { class: 'le__ops' }, [
            f.btn('위', function () { if (i > 0) { list.splice(i - 1, 0, list.splice(i, 1)[0]); draw(); } }, 'ghost sm', { disabled: i === 0, 'aria-label': '위로' }),
            f.btn('아래', function () { if (i < list.length - 1) { list.splice(i + 1, 0, list.splice(i, 1)[0]); draw(); } }, 'ghost sm', { disabled: i === list.length - 1, 'aria-label': '아래로' }),
            f.btn('빼기', function () { list.splice(i, 1); draw(); }, 'ghost sm'),
          ]),
        ]));
      });
      return box;
    }

    function save() {
      var p = C.normPeriod(draft.period);
      if (!p) {
        App.ui.toast('분기를 2026Q3 처럼 적어 주세요.', 'warn');
        return;
      }
      var cur = App.data.report(c.id);
      if (isNew && C.quarterOf(cur, p)) {
        App.ui.toast(C.periodLabel(p) + ' 자료가 이미 있습니다. 그 분기의 편집을 쓰세요.', 'warn');
        return;
      }
      var q = clone(draft);
      q.period = p;
      if (q.call) {
        q.call.highlights = q.call.highlights.filter(function (x) { return x.text && x.text.trim(); });
        q.call.qa = q.call.qa.filter(function (x) { return (x.question || '').trim() && (x.answer || '').trim(); });
      }
      q.origin = 'inside';
      q.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      App.data.putReport(c.id, M.putQuarter(cur, q));
      App.ui.toast('저장했습니다. 파일 반영은 관리 탭에서 합니다.', 'ok');
      App.go({ edit: '', period: p });
    }

    draw();
  };
})(window);
