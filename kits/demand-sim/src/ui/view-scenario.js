/* 시나리오 탭: 시나리오 목록과 충격 카드 편집. 전역 App.views.scenario. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var w = App.w;
  var sim = App.sim;
  var S = sim.shocks;
  var U = sim.util;
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
        class: 'chip' + (s.id === cur.id ? ' is-on' : ''), type: 'button', text: s.name + ' (' + s.cards.length + ')',
        onclick: function () { st.activeId = s.id; changed(); },
      });
    });
    var name = h('input', { class: 'input input--sm', value: cur.name, 'aria-label': '시나리오 이름' });
    name.addEventListener('change', function () { cur.name = name.value.trim() || cur.name; changed(); });
    var notes = h('textarea', { class: 'input textarea', rows: '2', placeholder: '이 시나리오의 전제. 보고서 첫머리에 그대로 나갑니다.' });
    notes.value = cur.notes || '';
    notes.addEventListener('change', function () { cur.notes = notes.value; act.persist(); });
    return h('section', { class: 'panel' }, [
      h('div', { class: 'row' }, chips.concat([
        h('div', { class: 'app__spacer' }),
        h('button', { class: 'btn btn--sm', type: 'button', text: '새 시나리오', onclick: function () {
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
      ])),
      h('div', { class: 'form-row' }, [w.field('이름', name), h('div', { class: 'grow' }, w.field('설명', notes))]),
    ]);
  }

  function cardTable(scn) {
    if (!scn.cards.length) {
      return h('p', { class: 'empty', text: '카드가 없습니다. 이 상태의 결과는 기준선과 같습니다. 위에서 카드를 추가하세요.' });
    }
    var rows = scn.cards.map(function (c, i) {
      var problems = S.validate(c, st.ds, st.bl);
      var cb = h('input', { type: 'checkbox', 'aria-label': '사용' });
      cb.checked = c.enabled;
      cb.addEventListener('change', function () { c.enabled = cb.checked; changed(); });
      var state = problems.length
        ? h('span', { class: 'badge ' + (problems.some(function (p) { return p.level === 'error'; }) ? 'badge--danger' : 'badge--warn'), text: problems.some(function (p) { return p.level === 'error'; }) ? '오류' : '확인', title: problems.map(function (p) { return p.message; }).join('\n') })
        : h('span', { class: 'badge badge--ok', text: '정상' });
      return [
        cb,
        h('div', null, [h('div', { class: 'card-name', text: c.name || '(이름 없음)' }), h('div', { class: 'card-desc', text: S.describe(c) })]),
        S.LAYER_LABEL[c.layer],
        state,
        h('div', { class: 'row row--tight' }, [
          h('button', { class: 'btn btn--sm', type: 'button', text: '편집', onclick: function (e) { e.stopPropagation(); editCard(scn, c); } }),
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
    return w.table(['사용', '카드', '층', '점검', ''], rows);
  }

  function addBar(scn) {
    var presetSel = w.select([{ value: '', label: '예시에서 추가...' }].concat(sim.presets.map(function (p) { return { value: p.key, label: p.label }; })), '', function (v) {
      var p = sim.presets.filter(function (x) { return x.key === v; })[0];
      if (!p) return;
      editCard(scn, p.make(st.ds, st.bl), true);
    });
    function add(layer) {
      return h('button', { class: 'btn btn--sm', type: 'button', text: '+ ' + S.LAYER_LABEL[layer], onclick: function () { editCard(scn, S.blank(layer, st.ds), true); } });
    }
    var pt = st.ds.powertrains.length === 1 && st.ds.powertrains[0] === 'ALL';
    var btnPt = add('POWERTRAIN');
    if (pt) { btnPt.disabled = true; btnPt.title = '파워트레인 자료가 없습니다'; }
    return h('div', { class: 'row' }, [add('TIV'), btnPt, add('BRAND'), presetSel]);
  }

  // ---------- 카드 편집 ----------

  function editCard(scn, original, isNew) {
    var c = clone(original);
    var ds = st.ds;
    var bl = st.bl;
    var form = h('div', { class: 'card-form' });
    var preview = h('div', { class: 'card-preview' });

    function rerender() {
      App.dom.clear(form);
      build();
      refreshPreview();
    }

    function build() {
      var unit = S.unitOf(c.layer);
      var name = h('input', { class: 'input input--sm', value: c.name, placeholder: '예: 2027 북미 전기차 세액공제 변경' });
      name.addEventListener('input', function () { c.name = name.value; });

      var region = w.select(ds.regions, c.region, function (v) { c.region = v; c.countries = []; rerender(); });
      var layer = w.select(['TIV', 'POWERTRAIN', 'BRAND'].map(function (l) { return { value: l, label: S.LAYER_LABEL[l] }; }), c.layer, function (v) {
        c.layer = v;
        c.target = v === 'POWERTRAIN' ? (ds.powertrains.indexOf('BEV') >= 0 ? 'BEV' : ds.powertrains[0]) : v === 'BRAND' ? ds.brands[0] : '';
        c.powertrain = null;
        rerender();
      });
      var target = null;
      if (c.layer === 'POWERTRAIN') target = w.field('대상 파워트레인', w.select(ds.powertrains, c.target, function (v) { c.target = v; refreshPreview(); }));
      if (c.layer === 'BRAND') {
        target = h('div', { class: 'form-row' }, [
          w.field('대상 브랜드', w.select(ds.brands, c.target, function (v) { c.target = v; refreshPreview(); })),
          w.field('파워트레인 한정', w.select([{ value: '', label: '모두' }].concat(ds.powertrains), c.powertrain || '', function (v) { c.powertrain = v || null; refreshPreview(); })),
        ]);
      }

      var countryBox = h('div', { class: 'country-list' }, (ds.countries[c.region] || []).map(function (cn) {
        var cb = h('input', { type: 'checkbox' });
        cb.checked = (c.countries || []).indexOf(cn) >= 0;
        cb.addEventListener('change', function () {
          c.countries = (c.countries || []).filter(function (x) { return x !== cn; });
          if (cb.checked) c.countries.push(cn);
          refreshPreview();
        });
        return h('label', { class: 'check' }, [cb, cn]);
      }));

      function mag(k) {
        return w.number(c.magnitude[k], function (v) { c.magnitude[k] = v === null ? 0 : v; refreshPreview(); }, { step: '0.5' });
      }
      var prob = w.number(Math.round(c.probability * 100), function (v) { c.probability = v === null ? 1 : Math.max(0, Math.min(100, v)) / 100; refreshPreview(); }, { step: '5', min: '0', max: '100' });

      var start = h('input', { class: 'input input--sm', type: 'month', value: c.start });
      start.addEventListener('change', function () { if (start.value) { c.start = start.value; refreshPreview(); } });
      var shape = w.select(['step', 'linear', 'scurve'].map(function (s) { return { value: s, label: S.SHAPE_LABEL[s] }; }), c.rampShape, function (v) { c.rampShape = v; rerender(); });
      var ramp = w.number(c.rampMonths, function (v) { c.rampMonths = Math.max(1, Math.round(v || 1)); refreshPreview(); }, { min: '1', step: '1', disabled: c.rampShape === 'step' });

      var holdForever = h('input', { type: 'checkbox' });
      holdForever.checked = c.holdMonths === null || c.holdMonths === undefined;
      holdForever.addEventListener('change', function () { c.holdMonths = holdForever.checked ? null : 12; rerender(); });
      var hold = w.number(c.holdMonths, function (v) { c.holdMonths = Math.max(1, Math.round(v || 1)); refreshPreview(); }, { min: '1', step: '1', disabled: holdForever.checked });
      var half = w.number(c.halfLifeMonths, function (v) { c.halfLifeMonths = v && v > 0 ? v : null; refreshPreview(); }, { min: '0', step: '1', placeholder: '바로 종료', disabled: holdForever.checked });

      var pfOn = h('input', { type: 'checkbox' });
      pfOn.checked = !!c.pullForward;
      pfOn.addEventListener('change', function () { c.pullForward = pfOn.checked ? { months: 3, pct: 10 } : null; rerender(); });
      var pfMonths = c.pullForward ? w.number(c.pullForward.months, function (v) { c.pullForward.months = Math.max(1, Math.round(v || 1)); refreshPreview(); }, { min: '1', step: '1' }) : null;
      var pfPct = c.pullForward ? w.number(c.pullForward.pct, function (v) { c.pullForward.pct = v || 0; refreshPreview(); }, { step: '1' }) : null;

      var note = h('textarea', { class: 'input textarea', rows: '2', placeholder: '근거, 출처, 가정. 보고서에 그대로 나갑니다.' });
      note.value = c.note || '';
      note.addEventListener('input', function () { c.note = note.value; });

      var magHint = c.layer === 'TIV' ? '지역 총수요 변화율. -3 은 3% 감소'
        : c.layer === 'POWERTRAIN' ? '지역 전체에서 이 파워트레인 비중의 변화. 3 은 +3%p'
        : '점유율의 상대 변화. 10 은 점유율 x1.10. 같은 파워트레인 안 경쟁사 몫에서 가져옵니다';

      [
        h('div', { class: 'form-row' }, [h('div', { class: 'grow' }, w.field('카드 이름', name))]),
        h('div', { class: 'form-row' }, [w.field('지역', region), w.field('층', layer)]),
        target,
        (ds.countries[c.region] || []).length > 1 ? w.field('국가 한정 (비우면 지역 전체)', countryBox, '고른 국가의 최근 12개월 비중만큼 강도를 줄여 지역에 적용합니다') : null,
        h('h3', { class: 'sub-title', text: '강도 (' + unit + ')' }),
        h('div', { class: 'form-row' }, [w.field('최소', mag('min')), w.field('최빈 (시나리오 값)', mag('mode')), w.field('최대', mag('max')), w.field('발생 확률 (%)', prob)]),
        h('p', { class: 'field__hint', text: magHint + '. 시나리오 경로는 최빈값으로 발생을 가정하고, 불확실성 구간은 확률과 최소~최대를 씁니다.' }),
        h('h3', { class: 'sub-title', text: '시점' }),
        h('div', { class: 'form-row' }, [
          w.field('시작 월', start),
          w.field('도달 방식', shape),
          w.field('도달 기간 (개월)', ramp),
          w.field('유지', h('label', { class: 'check' }, [holdForever, '끝까지'])),
          w.field('유지 기간 (개월)', hold),
          w.field('이후 반감기 (개월)', half),
        ]),
        h('div', { class: 'form-row' }, [
          w.field('당겨쓰기', h('label', { class: 'check' }, [pfOn, '시작 전 선구매, 시작 후 같은 물량 차감'])),
          pfMonths ? w.field('기간 (개월)', pfMonths) : null,
          pfPct ? w.field('시작 전 물량 증가 (%)', pfPct) : null,
        ]),
        w.field('근거 / 메모', note),
      ].forEach(function (el) { if (el) form.appendChild(el); });
    }

    function refreshPreview() {
      App.dom.clear(preview);
      var problems = S.validate(c, ds, bl);
      var curve = S.curve(c, bl.months);
      preview.appendChild(h('div', { class: 'sub-title', text: '발효 강도 미리보기' }));
      preview.appendChild(sparkBars(curve, bl.months));
      preview.appendChild(h('p', { class: 'card-desc', text: S.describe(c) }));
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
        if (mx <= 0) return '예측 기간 안에 발효되는 달이 없습니다.';
      }
      var base = sim.engine.simulate(ds, bl, []);
      var one = sim.engine.simulate(ds, bl, [Object.assign({}, card, { enabled: true, pullForward: null })]);
      var r = card.region;
      var m = bl.months[h0];
      if (card.layer === 'TIV') return m + ' 기준 ' + r + ' 총수요 ' + App.fmt.units(base.tiv[r][h0]) + ' → ' + App.fmt.units(one.tiv[r][h0]) + ' 대';
      if (card.layer === 'POWERTRAIN') return m + ' 기준 ' + r + ' ' + card.target + ' 비중 ' + App.fmt.pct(base.ptMix[r][card.target][h0]) + ' → ' + App.fmt.pct(one.ptMix[r][card.target][h0]);
      return m + ' 기준 ' + r + ' ' + card.target + ' 점유율 ' + App.fmt.pct(base.share[r][card.target][h0], 2) + ' → ' + App.fmt.pct(one.share[r][card.target][h0], 2) +
        ', 판매 ' + App.fmt.signedUnits(one.brandUnits[r][card.target][h0] - base.brandUnits[r][card.target][h0]) + ' 대/월';
    }

    build();
    refreshPreview();
    App.ui.modal({
      title: isNew ? '카드 추가' : '카드 편집',
      body: h('div', { class: 'card-editor' }, [form, preview]),
      actions: [
        { label: '취소' },
        {
          label: '저장', kind: 'primary',
          onClick: function (close) {
            if (!c.name.trim()) c.name = S.LAYER_LABEL[c.layer] + ' 카드';
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

  /** 월별 발효 강도 막대. 0~1 */
  function sparkBars(values, months) {
    var box = h('div', { class: 'spark', role: 'img', 'aria-label': '월별 발효 강도' });
    values.forEach(function (v, i) {
      box.appendChild(h('span', { class: 'spark__bar', style: { height: Math.round(v * 100) + '%' }, title: months[i] + ' ' + Math.round(v * 100) + '%' }));
    });
    return h('div', null, [box, h('div', { class: 'spark__axis' }, [h('span', { text: months[0] }), h('span', { text: months[months.length - 1] })])]);
  }

  function render(root) {
    if (!st.ds) {
      root.appendChild(h('section', { class: 'panel' }, h('p', { class: 'empty', text: '먼저 데이터 탭에서 데이터를 불러오세요.' })));
      return;
    }
    var scn = act.scenario();
    root.appendChild(scenarioBar());
    root.appendChild(h('section', { class: 'panel' }, [
      h('div', { class: 'row' }, [h('h2', { class: 'panel__title', text: '충격 카드' }), h('div', { class: 'app__spacer' }), addBar(scn)]),
      h('p', { class: 'panel__hint', text: '외생변수 하나가 카드 한 장입니다. 총수요는 %, 파워트레인 비중은 %p, 브랜드 점유율은 상대 % 로 넣습니다. 이미 실적에 반영된 사건은 넣지 않습니다.' }),
      cardTable(scn),
    ]));
  }

  App.views = App.views || {};
  App.views.scenario = render;
  App.views.editCard = editCard;
})(window);
