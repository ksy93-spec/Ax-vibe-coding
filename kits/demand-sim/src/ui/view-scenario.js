/* 시나리오 탭: 시나리오 목록과 변수 카드 편집. 전역 App.views.scenario.
 * 카드 편집 창은 "무엇이 / 어디서 / 얼마나 / 언제" 네 단계로 묻습니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var w = App.w;
  var sim = App.sim;
  var S = sim.shocks;
  var st = App.state;
  var act = App.actions;

  function changed() {
    act.persist();
    App.render();
  }

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function scenarioBar() {
    var cur = act.scenario();
    var chips = st.scenarios.map(function (s) {
      return h('button', {
        class: 'chip' + (s.id === cur.id ? ' is-on' : ''), type: 'button', text: s.name + ' · 카드 ' + s.cards.length,
        onclick: function () { st.activeId = s.id; changed(); },
      });
    });
    var name = h('input', { class: 'input input--sm', value: cur.name, 'aria-label': '시나리오 이름' });
    name.addEventListener('change', function () { cur.name = name.value.trim() || cur.name; changed(); });
    var notes = h('textarea', { class: 'input textarea', rows: '2', placeholder: '예: 미국 보조금 축소가 예정대로 가고, 유럽 규제는 1년 늦춰지는 경우' });
    notes.value = cur.notes || '';
    notes.addEventListener('change', function () { cur.notes = notes.value; act.persist(); });
    return h('section', { class: 'panel' }, [
      w.head('시나리오', '"이런 일이 생기면?" 하나가 시나리오 하나입니다. 여러 개 만들어 보고서에서 나란히 비교할 수 있습니다.', [
        h('button', { class: 'btn btn--sm', type: 'button', text: '+ 새 시나리오', onclick: function () {
          var s = act.newScenario('시나리오 ' + (st.scenarios.length + 1));
          st.scenarios.push(s);
          st.activeId = s.id;
          changed();
        } }),
        h('button', { class: 'btn btn--sm', type: 'button', text: '복제', onclick: function () {
          var s = clone(cur);
          s.id = act.newScenario('').id;
          s.name = cur.name + ' 복사본';
          s.cards.forEach(function (c) { c.id = S.blank(c.layer, st.ds).id; });
          st.scenarios.push(s);
          st.activeId = s.id;
          changed();
        } }),
        h('button', { class: 'btn btn--sm', type: 'button', text: '삭제', disabled: st.scenarios.length < 2, onclick: function () {
          App.ui.confirm('"' + cur.name + '" 시나리오와 카드 ' + cur.cards.length + '장을 지웁니다.', function (ok) {
            if (!ok) return;
            st.scenarios = st.scenarios.filter(function (s) { return s.id !== cur.id; });
            st.activeId = st.scenarios[0].id;
            changed();
          }, { danger: true, okLabel: '지우기' });
        } }),
      ]),
      h('div', { class: 'row' }, chips),
      h('div', { class: 'form-row form-row--top' }, [w.field('이름', name), h('div', { class: 'grow' }, w.field('어떤 상황인가요? (보고서 첫머리에 들어갑니다)', notes))]),
    ]);
  }

  function cardTable(scn) {
    if (!scn.cards.length) {
      return h('div', { class: 'empty-cta' }, [
        h('p', { text: '아직 카드가 없습니다. 카드가 없으면 결과가 기본 전망과 같습니다.' }),
        h('p', { class: 'muted', text: '오른쪽 위 "+ 카드 추가" 나 "예시 카드" 로 시작해 보세요.' }),
      ]);
    }
    var rows = scn.cards.map(function (c, i) {
      var problems = S.validate(c, st.ds, st.bl);
      var hasErr = problems.some(function (p) { return p.level === 'error'; });
      var cb = h('input', { type: 'checkbox', 'aria-label': '이 카드 사용' });
      cb.checked = c.enabled;
      cb.addEventListener('change', function () { c.enabled = cb.checked; changed(); });
      var state = problems.length
        ? h('span', { class: 'badge ' + (hasErr ? 'badge--danger' : 'badge--warn'), text: hasErr ? '계산 안 됨' : '확인 필요', title: problems.map(function (p) { return p.message; }).join('\n') })
        : h('span', { class: 'badge badge--ok', text: '정상' });
      return [
        cb,
        h('div', null, [h('div', { class: 'card-name', text: c.name || '(이름 없음)' }), h('div', { class: 'card-desc', text: S.describe(c) })]),
        S.LAYER_LABEL[c.layer],
        state,
        h('div', { class: 'row row--tight' }, [
          h('button', { class: 'btn btn--sm', type: 'button', text: '고치기', onclick: function (e) { e.stopPropagation(); editCard(scn, c); } }),
          h('button', { class: 'btn btn--sm btn--ghost', type: 'button', text: '복제', onclick: function (e) {
            e.stopPropagation();
            var copy = clone(c);
            copy.id = S.blank(c.layer, st.ds).id;
            copy.name = c.name + ' 복사본';
            scn.cards.splice(i + 1, 0, copy);
            changed();
          } }),
          h('button', { class: 'btn btn--sm btn--ghost', type: 'button', text: '삭제', onclick: function (e) {
            e.stopPropagation();
            scn.cards.splice(i, 1);
            changed();
          } }),
        ]),
      ];
    });
    return w.table(['사용', '카드', '무엇이 바뀌나', '상태', ''], rows);
  }

  function addBar(scn) {
    var presetSel = w.select([{ value: '', label: '예시 카드로 시작...' }].concat(sim.presets.map(function (p) { return { value: p.key, label: p.label }; })), '', function (v) {
      var p = sim.presets.filter(function (x) { return x.key === v; })[0];
      if (!p) return;
      editCard(scn, p.make(st.ds, st.bl), true);
    });
    return [
      h('button', { class: 'btn btn--sm btn--primary', type: 'button', text: '+ 카드 추가', onclick: function () { editCard(scn, S.blank('TIV', st.ds), true); } }),
      presetSel,
    ];
  }

  // ---------- 카드 편집 ----------

  function editCard(scn, original, isNew) {
    var c = clone(original);
    var ds = st.ds;
    var bl = st.bl;
    var noPt = ds.powertrains.length === 1 && ds.powertrains[0] === 'ALL';
    var rangeOpen = !(c.magnitude.min === c.magnitude.mode && c.magnitude.mode === c.magnitude.max);
    var form = h('div', { class: 'card-form' });
    var preview = h('div', { class: 'card-preview' });

    function rerender() {
      App.dom.clear(form);
      build();
      refreshPreview();
    }

    function step(n, title, body) {
      return h('section', { class: 'step' }, [h('div', { class: 'step__head' }, [h('span', { class: 'step__num', text: n }), h('h3', { class: 'step__title', text: title })]), h('div', { class: 'step__body' }, body)]);
    }

    function build() {
      var unit = S.unitOf(c.layer);

      // 1. 무엇이
      var tiles = h('div', { class: 'tiles' }, ['TIV', 'POWERTRAIN', 'BRAND'].map(function (l) {
        var disabled = l === 'POWERTRAIN' && noPt;
        return h('button', {
          class: 'tile' + (c.layer === l ? ' is-on' : ''), type: 'button', disabled: disabled,
          onclick: function () {
            c.layer = l;
            c.target = l === 'POWERTRAIN' ? (ds.powertrains.indexOf('BEV') >= 0 ? 'BEV' : ds.powertrains[0]) : l === 'BRAND' ? ds.brands[0] : '';
            c.powertrain = null;
            rerender();
          },
        }, [h('span', { class: 'tile__title', text: S.LAYER_LABEL[l] }), h('span', { class: 'tile__sub', text: disabled ? '동력원 자료가 없어 쓸 수 없습니다' : S.LAYER_HELP[l] })]);
      }));

      // 2. 어디서, 누구에게
      var whereRow = [w.field('지역', w.select(ds.regions.map(function (r) { return { value: r, label: sim.geo.regionLabel(r) }; }), c.region, function (v) { c.region = v; c.countries = []; rerender(); }))];
      if (c.layer === 'POWERTRAIN') whereRow.push(w.field('어떤 동력원?', w.select(ds.powertrains.map(function (p) { return { value: p, label: S.ptLabel(p) }; }), c.target, function (v) { c.target = v; refreshPreview(); })));
      if (c.layer === 'BRAND') {
        whereRow.push(w.field('어떤 브랜드?', w.select(ds.brands, c.target, function (v) { c.target = v; refreshPreview(); })));
        whereRow.push(w.field('특정 동력원 차종만?', w.select([{ value: '', label: '모든 차종' }].concat(ds.powertrains.filter(function (p) { return p !== 'ALL'; }).map(function (p) { return { value: p, label: S.ptLabel(p) }; })), c.powertrain || '', function (v) { c.powertrain = v || null; refreshPreview(); })));
      }
      var countries = ds.countries[c.region] || [];
      var countryBox = null;
      if (countries.length > 1) {
        countryBox = h('details', { class: 'more', open: (c.countries || []).length ? true : null }, [
          h('summary', { text: '일부 국가에만 해당되나요? ' + ((c.countries || []).length ? '(' + c.countries.join(', ') + ')' : '') }),
          h('div', { class: 'country-list' }, countries.map(function (cn) {
            var cb = h('input', { type: 'checkbox' });
            cb.checked = (c.countries || []).indexOf(cn) >= 0;
            cb.addEventListener('change', function () {
              c.countries = (c.countries || []).filter(function (x) { return x !== cn; });
              if (cb.checked) c.countries.push(cn);
              refreshPreview();
            });
            return h('label', { class: 'check' }, [cb, cn]);
          })),
          h('p', { class: 'field__hint', text: '고른 국가가 지역 판매에서 차지하는 비중만큼만 영향이 들어갑니다.' }),
        ]);
      }

      // 3. 얼마나
      function setMode(v) {
        var x = v === null ? 0 : v;
        if (!rangeOpen) { c.magnitude.min = x; c.magnitude.max = x; }
        c.magnitude.mode = x;
        refreshPreview();
      }
      var amountHint = c.layer === 'TIV' ? '% 로 넣습니다. -3 이면 시장 전체 판매가 3% 줄어듭니다.'
        : c.layer === 'POWERTRAIN' ? '%p(퍼센트포인트)로 넣습니다. 지금 40% 인 전기차 비중이 -3 이면 37% 가 됩니다.'
        : '지금 점유율 대비 % 로 넣습니다. 지금 10% 인 점유율이 +20 이면 12% 가 됩니다. 늘어난 몫은 같은 차종의 경쟁 브랜드에서 옵니다.';
      var amount = w.number(c.magnitude.mode, setMode, { step: '0.5', 'aria-label': '예상 영향' });
      var prob = w.number(Math.round(c.probability * 100), function (v) { c.probability = v === null ? 1 : Math.max(0, Math.min(100, v)) / 100; refreshPreview(); }, { step: '5', min: '0', max: '100' });
      var rangeBox = h('details', { class: 'more', open: rangeOpen ? true : null }, [
        h('summary', { text: '확신이 없다면 범위도 넣기' }),
        h('div', { class: 'form-row' }, [
          w.field('작게 보면 (' + unit + ')', w.number(c.magnitude.min, function (v) { c.magnitude.min = v === null ? 0 : v; refreshPreview(); }, { step: '0.5' })),
          w.field('크게 보면 (' + unit + ')', w.number(c.magnitude.max, function (v) { c.magnitude.max = v === null ? 0 : v; refreshPreview(); }, { step: '0.5' })),
          w.field('일어날 가능성 (%)', prob),
        ]),
        h('p', { class: 'field__hint', text: '결과 탭의 "가능 범위 계산" 에만 쓰입니다. 시나리오 선 자체는 예상값으로, 일어난다고 보고 그립니다.' }),
      ]);
      rangeBox.addEventListener('toggle', function () { rangeOpen = rangeBox.open; });

      // 4. 언제
      var start = h('input', { class: 'input input--sm', type: 'month', value: c.start });
      start.addEventListener('change', function () { if (start.value) { c.start = start.value; refreshPreview(); } });
      var speed = w.select(['step', 'linear', 'scurve'].map(function (s) { return { value: s, label: S.SHAPE_LABEL[s] }; }), c.rampShape, function (v) { c.rampShape = v; rerender(); });
      var ramp = c.rampShape === 'step' ? null : w.field('다 반영되기까지 (개월)', w.number(c.rampMonths, function (v) { c.rampMonths = Math.max(1, Math.round(v || 1)); refreshPreview(); }, { min: '1', step: '1' }));
      var lastMode = c.holdMonths === null || c.holdMonths === undefined ? 'forever' : c.halfLifeMonths ? 'fade' : 'end';
      var lasting = w.select([
        { value: 'forever', label: '계속 이어짐' },
        { value: 'end', label: '일정 기간 뒤 사라짐' },
        { value: 'fade', label: '일정 기간 뒤 서서히 줄어듦' },
      ], lastMode, function (v) {
        if (v === 'forever') { c.holdMonths = null; c.halfLifeMonths = null; }
        if (v === 'end') { c.holdMonths = c.holdMonths || 12; c.halfLifeMonths = null; }
        if (v === 'fade') { c.holdMonths = c.holdMonths || 12; c.halfLifeMonths = c.halfLifeMonths || 6; }
        rerender();
      });
      var hold = lastMode === 'forever' ? null : w.field('얼마나 이어지나요 (개월)', w.number(c.holdMonths, function (v) { c.holdMonths = Math.max(1, Math.round(v || 1)); refreshPreview(); }, { min: '1', step: '1' }));
      var half = lastMode === 'fade' ? w.field('절반으로 줄기까지 (개월)', w.number(c.halfLifeMonths, function (v) { c.halfLifeMonths = v && v > 0 ? v : 1; refreshPreview(); }, { min: '1', step: '1' })) : null;

      var pfOn = h('input', { type: 'checkbox' });
      pfOn.checked = !!c.pullForward;
      pfOn.addEventListener('change', function () { c.pullForward = pfOn.checked ? { months: 3, pct: 10 } : null; rerender(); });
      var pfBox = h('details', { class: 'more', open: c.pullForward ? true : null }, [
        h('summary', { text: '시작 전에 미리 사는 수요가 있나요? (예: 보조금 끝나기 전 막차 수요)' }),
        h('label', { class: 'check' }, [pfOn, '있음. 시작 전 몇 달 동안 판매가 늘고, 시작 뒤 같은 양만큼 줄어듭니다']),
        c.pullForward ? h('div', { class: 'form-row' }, [
          w.field('몇 달 전부터?', w.number(c.pullForward.months, function (v) { c.pullForward.months = Math.max(1, Math.round(v || 1)); refreshPreview(); }, { min: '1', step: '1' })),
          w.field('그동안 판매가 몇 % 늘까요?', w.number(c.pullForward.pct, function (v) { c.pullForward.pct = v || 0; refreshPreview(); }, { step: '1' })),
        ]) : null,
      ]);

      var name = h('input', { class: 'input input--sm', value: c.name, placeholder: '예: 2027 미국 전기차 세액공제 축소' });
      name.addEventListener('input', function () { c.name = name.value; });
      var note = h('textarea', { class: 'input textarea', rows: '2', placeholder: '근거, 출처, 가정. 보고서에 그대로 나갑니다.' });
      note.value = c.note || '';
      note.addEventListener('input', function () { c.note = note.value; });

      [
        w.field('카드 이름', name),
        step('1', '무엇이 바뀌나요?', [tiles]),
        step('2', '어디서, 누구에게?', [h('div', { class: 'form-row' }, whereRow), countryBox]),
        step('3', '얼마나?', [h('div', { class: 'form-row' }, [w.field('예상 영향 (' + unit + ')', amount)]), h('p', { class: 'field__hint', text: amountHint }), rangeBox]),
        step('4', '언제부터, 얼마 동안?', [
          h('div', { class: 'form-row' }, [w.field('시작 월', start), w.field('반영 속도', speed), ramp, w.field('효과는?', lasting), hold, half]),
          pfBox,
        ]),
        w.field('근거 / 메모', note),
      ].forEach(function (el) { if (el) form.appendChild(el); });
    }

    function refreshPreview() {
      App.dom.clear(preview);
      var problems = S.validate(c, ds, bl);
      var curve = S.curve(c, bl.months);
      preview.appendChild(h('div', { class: 'sub-title', text: '이 카드를 한 줄로' }));
      preview.appendChild(h('p', { class: 'card-sentence', text: S.describe(c) }));
      preview.appendChild(h('div', { class: 'sub-title', text: '달마다 얼마나 반영되나 (전망 기간)' }));
      preview.appendChild(sparkBars(curve, bl.months));
      var errs = problems.filter(function (p) { return p.level === 'error'; });
      if (!errs.length) preview.appendChild(h('p', { class: 'card-effect', text: effectText(c) }));
      var n = w.notes(problems);
      if (n) preview.appendChild(n);
    }

    function effectText(card) {
      var curve = S.curve(card, bl.months);
      var h0 = curve.indexOf(1);
      if (h0 < 0) {
        var mx = Math.max.apply(null, curve);
        h0 = curve.indexOf(mx);
        if (mx <= 0) return '전망 기간 안에 반영되는 달이 없습니다.';
      }
      var base = sim.engine.simulate(ds, bl, []);
      var one = sim.engine.simulate(ds, bl, [Object.assign({}, card, { enabled: true, pullForward: null })]);
      var r = card.region;
      var m = bl.months[h0];
      var where = sim.geo.regionShort(r);
      if (card.layer === 'TIV') return m + ' 기준 ' + where + ' 월 판매 ' + App.fmt.units(base.tiv[r][h0]) + '대 → ' + App.fmt.units(one.tiv[r][h0]) + '대';
      if (card.layer === 'POWERTRAIN') return m + ' 기준 ' + where + ' ' + S.ptLabel(card.target) + ' 비중 ' + App.fmt.pct(base.ptMix[r][card.target][h0]) + ' → ' + App.fmt.pct(one.ptMix[r][card.target][h0]);
      return m + ' 기준 ' + where + ' ' + card.target + ' 점유율 ' + App.fmt.pct(base.share[r][card.target][h0], 2) + ' → ' + App.fmt.pct(one.share[r][card.target][h0], 2) +
        ' (월 ' + App.fmt.signedUnits(one.brandUnits[r][card.target][h0] - base.brandUnits[r][card.target][h0]) + '대)';
    }

    build();
    refreshPreview();
    App.ui.modal({
      title: isNew ? '카드 추가' : '카드 고치기',
      body: h('div', { class: 'card-editor' }, [form, preview]),
      actions: [
        { label: '취소' },
        {
          label: '저장', kind: 'primary',
          onClick: function (close) {
            if (!c.name.trim()) c.name = S.LAYER_LABEL[c.layer] + ' 변화';
            if (!rangeOpen) { c.magnitude.min = c.magnitude.mode; c.magnitude.max = c.magnitude.mode; }
            var idx = scn.cards.map(function (x) { return x.id; }).indexOf(c.id);
            if (idx >= 0) scn.cards[idx] = c;
            else scn.cards.push(c);
            close();
            changed();
          },
        },
      ],
    });
  }

  /** 월별 반영 정도 막대. 0~1 */
  function sparkBars(values, months) {
    var box = h('div', { class: 'spark', role: 'img', 'aria-label': '월별 반영 정도' });
    values.forEach(function (v, i) {
      box.appendChild(h('span', { class: 'spark__bar', style: { height: Math.round(v * 100) + '%' }, title: months[i] + ' ' + Math.round(v * 100) + '%' }));
    });
    return h('div', null, [box, h('div', { class: 'spark__axis' }, [h('span', { text: months[0] }), h('span', { text: '100% = 예상 영향이 다 반영됨' }), h('span', { text: months[months.length - 1] })])]);
  }

  function render(root) {
    if (!st.ds) {
      root.appendChild(h('section', { class: 'panel' }, h('p', { class: 'empty', text: '먼저 데이터 탭에서 데이터를 불러오세요.' })));
      return;
    }
    var scn = act.scenario();
    root.appendChild(scenarioBar());
    root.appendChild(h('section', { class: 'panel' }, [
      w.head('변수 카드: ' + scn.name, '보조금, 규제, 경기처럼 판매를 움직이는 일 하나가 카드 한 장입니다. 이미 실적에 나타난 일은 넣지 않습니다.', addBar(scn)),
      cardTable(scn),
    ]));
  }

  App.views = App.views || {};
  App.views.scenario = render;
  App.views.editCard = editCard;
})(window);
