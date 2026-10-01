/* 외생변수 탭: 외생변수 카드와 Worst / Base / Best. 전역 App.views.scenario.
 * 시나리오는 따로 만들지 않습니다. 카드의 범위 최소 / 예상 / 범위 최대에서 자동으로 나옵니다 (src/model/scenarios.js).
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

  var DIR = {
    positive: { label: '긍정', cls: 'badge--ok' },
    negative: { label: '부정', cls: 'badge--danger' },
    neutral: { label: '영향 없음', cls: '' },
  };

  function changed() {
    act.persist();
    App.render();
  }

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function signed(v) {
    var r = Math.round(v * 10) / 10;
    return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r);
  }

  /** Worst / Base / Best 요약: 연도별 자사 물량(또는 관측 OEM 차량) */
  function summary(set) {
    var name = st.display.companyName;
    var useDisp = act.hasDisplay();
    var years = set.years;
    var cols = ['시나리오'].concat(years.map(function (y) { return { label: y.label, num: true }; }));
    var rows = ['Worst', 'Base', 'Best', 'Trend'].map(function (n) {
      return [n === 'Trend' ? 'Trend (외생변수 미반영)' : n].concat(years.map(function (y, yi) {
        var d = act.displayFor(n, yi)[sim.TOTAL];
        return fmt.compact(useDisp ? d.ours : d.vehicles);
      }));
    });
    return h('section', { class: 'panel' }, [
      w.head('Worst / Base / Best', '외생변수 카드에서 자동으로 만듭니다. Base 는 모든 카드를 예상값으로, Worst 는 부정 요인을 크게 · 긍정 요인을 작게, Best 는 그 반대로 반영합니다. ' +
        '긍정·부정은 ' + (useDisp ? name + ' 디스플레이 물량' : '관측 OEM 차량 판매') + '에 주는 영향으로 판단합니다.', [
        w.help('시나리오 계산 방식',
          '카드마다 영향 크기를 범위 최소 / 예상 / 범위 최대로 넣습니다.\n\n' +
          'Base: 모든 카드를 예상값으로 반영합니다.\n' +
          'Worst: 카드마다 범위 안에서 ' + name + ' 물량을 가장 줄이는 값을 씁니다. 부정 요인은 크게, 긍정 요인은 작게 반영되는 셈입니다.\n' +
          'Best: 카드마다 ' + name + ' 물량을 가장 늘리는 값을 씁니다.\n\n' +
          '예를 들어 "중국 경기 둔화 TAM −3% (범위 −6 ~ −1)" 은 Worst −6%, Base −3%, Best −1% 로 들어갑니다. ' +
          '"BYD 유럽 관세" 처럼 경쟁사를 누르는 카드는 ' + name + ' 고객사 M/S 를 올리므로 긍정 요인으로 분류됩니다.'),
      ]),
      w.table(cols, rows),
      h('p', { class: 'field__hint', text: '단위: ' + (useDisp ? name + ' 디스플레이 물량 (EA), 글로벌' : '관측 OEM 차량 판매 (대), 글로벌') + '. A 실적 · E 실적+전망 · F 전망.' }),
      set.build.skipped.length ? w.notes(set.build.skipped.map(function (m) { return { level: 'warn', message: m + ' (시나리오에서 뺐습니다)' }; })) : null,
    ]);
  }

  function cardTable(set) {
    if (!st.cards.length) {
      return h('div', { class: 'empty-cta' }, [
        h('p', { text: '외생변수가 없습니다. 이 상태에서는 Worst = Base = Best = Trend 입니다.' }),
        h('p', { class: 'muted', text: '오른쪽 위 "+ 외생변수" 나 "예시로 시작" 을 눌러 보세요.' }),
      ]);
    }
    var byId = {};
    set.build.items.forEach(function (it) { byId[it.card.id] = it; });
    var unitName = act.hasDisplay() ? ' EA' : '대';
    var rows = st.cards.map(function (c, i) {
      var problems = S.validate(c, st.ds, st.bl);
      var hasErr = problems.some(function (p) { return p.level === 'error'; });
      var it = byId[c.id];
      var cb = h('input', { type: 'checkbox', 'aria-label': '사용' });
      cb.checked = c.enabled;
      cb.addEventListener('change', function () { c.enabled = cb.checked; changed(); });
      var unit = S.unitOf(c.layer);
      var dir = it ? DIR[it.direction] : null;
      return [
        cb,
        h('div', null, [h('div', { class: 'card-name', text: c.name || '(이름 없음)' }), h('div', { class: 'card-desc', text: S.describe(c) })]),
        it ? h('div', null, [h('span', { class: 'badge ' + dir.cls, text: dir.label }), h('div', { class: 'card-desc', text: 'Base ' + fmt.signedUnits(it.effect.Base) + unitName })]) : (hasErr ? h('span', { class: 'badge badge--danger', text: '계산 안 됨', title: problems.map(function (p) { return p.message; }).join('\n') }) : h('span', { class: 'muted', text: c.enabled ? '-' : '꺼짐' })),
        it ? signed(it.values.Worst) + unit : '',
        it ? signed(it.values.Base) + unit : '',
        it ? signed(it.values.Best) + unit : '',
        problems.length && !hasErr ? h('span', { class: 'badge badge--warn', text: '확인', title: problems.map(function (p) { return p.message; }).join('\n') }) : '',
        h('div', { class: 'row row--tight' }, [
          h('button', { class: 'btn btn--sm', type: 'button', text: '수정', onclick: function (e) { e.stopPropagation(); editCard(c); } }),
          h('button', { class: 'btn btn--sm btn--ghost', type: 'button', text: '복제', onclick: function (e) {
            e.stopPropagation();
            var copy = clone(c);
            copy.id = S.blank(c.layer, st.ds).id;
            copy.name = c.name + ' 복사본';
            st.cards.splice(i + 1, 0, copy);
            changed();
          } }),
          h('button', { class: 'btn btn--sm btn--ghost', type: 'button', text: '삭제', onclick: function (e) {
            e.stopPropagation();
            st.cards.splice(i, 1);
            changed();
          } }),
        ]),
      ];
    });
    return w.table(['', '외생변수', '자사 영향', { label: 'Worst', num: true }, { label: 'Base', num: true }, { label: 'Best', num: true }, '', ''], rows);
  }

  function addBar() {
    var presetSel = w.select([{ value: '', label: '예시로 시작...' }].concat(sim.presets.map(function (p) { return { value: p.key, label: p.label }; })), '', function (v) {
      var p = sim.presets.filter(function (x) { return x.key === v; })[0];
      if (!p) return;
      var c = p.make(st.ds, st.bl);
      editCard(c, true);
    });
    return [
      h('button', { class: 'btn btn--sm btn--primary', type: 'button', text: '+ 외생변수', onclick: function () {
        var c = S.blank('TIV', st.ds);
        c.magnitude = { min: -4, mode: -2, max: -1 };
        editCard(c, true);
      } }),
      presetSel,
      h('button', { class: 'btn btn--sm', type: 'button', text: '예시 6개 모두', onclick: function () {
        sim.presets.forEach(function (p) { st.cards.push(p.make(st.ds, st.bl)); });
        changed();
      } }),
    ];
  }

  // ---------- 카드 편집 ----------

  function editCard(original, isNew) {
    var c = clone(original);
    c.probability = 1;
    var ds = st.ds;
    var bl = st.bl;
    var noPt = ds.powertrains.length === 1 && ds.powertrains[0] === 'ALL';
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
        }, [h('span', { class: 'tile__title', text: S.LAYER_LABEL[l] }), h('span', { class: 'tile__sub', text: disabled ? 'Powertrain 자료가 없어 쓸 수 없습니다' : S.LAYER_HELP[l] })]);
      }));

      var whereRow = [w.field('지역', w.select(ds.regions.map(function (r) { return { value: r, label: sim.geo.regionLabel(r) }; }), c.region, function (v) { c.region = v; c.countries = []; rerender(); }))];
      if (c.layer === 'POWERTRAIN') whereRow.push(w.field('Powertrain', w.select(ds.powertrains, c.target, function (v) { c.target = v; refreshPreview(); })));
      if (c.layer === 'BRAND') {
        whereRow.push(w.field('OEM', w.select(ds.brands, c.target, function (v) { c.target = v; refreshPreview(); })));
        whereRow.push(w.field('Powertrain 한정', w.select([{ value: '', label: '전체' }].concat(ds.powertrains.filter(function (p) { return p !== 'ALL'; })), c.powertrain || '', function (v) { c.powertrain = v || null; refreshPreview(); })));
      }
      var countries = ds.countries[c.region] || [];
      var countryBox = null;
      if (countries.length > 1) {
        countryBox = h('details', { class: 'more', open: (c.countries || []).length ? true : null }, [
          h('summary', { text: '일부 국가만 해당 ' + ((c.countries || []).length ? '(' + c.countries.join(', ') + ')' : '') }),
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
          h('p', { class: 'field__hint', text: '고른 국가가 지역 판매에서 차지하는 비중만큼만 지역에 반영됩니다.' }),
        ]);
      }

      var amountHint = c.layer === 'TIV' ? '% 입니다. −3 이면 지역 TAM 3% 감소.'
        : c.layer === 'POWERTRAIN' ? '%p 입니다. BEV 비중 40% 에서 −3 이면 37%.'
        : '현재 M/S 대비 % 입니다. M/S 10% 에서 +20 이면 12%. 늘어난 몫은 같은 Powertrain 의 경쟁 OEM 에서 옵니다.';
      function mag(k, label) {
        return w.field(label + ' (' + unit + ')', w.number(c.magnitude[k], function (v) { c.magnitude[k] = v === null ? 0 : v; refreshPreview(); }, { step: '0.5', 'aria-label': label }));
      }

      var start = h('input', { class: 'input input--sm', type: 'month', value: c.start });
      start.addEventListener('change', function () { if (start.value) { c.start = start.value; refreshPreview(); } });
      var speed = w.select(['step', 'linear', 'scurve'].map(function (s) { return { value: s, label: S.SHAPE_LABEL[s] }; }), c.rampShape, function (v) { c.rampShape = v; rerender(); });
      var ramp = c.rampShape === 'step' ? null : w.field('완전 반영까지 (개월)', w.number(c.rampMonths, function (v) { c.rampMonths = Math.max(1, Math.round(v || 1)); refreshPreview(); }, { min: '1', step: '1' }));
      var lastMode = c.holdMonths === null || c.holdMonths === undefined ? 'forever' : c.halfLifeMonths ? 'fade' : 'end';
      var lasting = w.select([
        { value: 'forever', label: '지속' },
        { value: 'end', label: '일정 기간 후 종료' },
        { value: 'fade', label: '일정 기간 후 점진 소멸' },
      ], lastMode, function (v) {
        if (v === 'forever') { c.holdMonths = null; c.halfLifeMonths = null; }
        if (v === 'end') { c.holdMonths = c.holdMonths || 12; c.halfLifeMonths = null; }
        if (v === 'fade') { c.holdMonths = c.holdMonths || 12; c.halfLifeMonths = c.halfLifeMonths || 6; }
        rerender();
      });
      var hold = lastMode === 'forever' ? null : w.field('지속 기간 (개월)', w.number(c.holdMonths, function (v) { c.holdMonths = Math.max(1, Math.round(v || 1)); refreshPreview(); }, { min: '1', step: '1' }));
      var half = lastMode === 'fade' ? w.field('반감기 (개월)', w.number(c.halfLifeMonths, function (v) { c.halfLifeMonths = v && v > 0 ? v : 1; refreshPreview(); }, { min: '1', step: '1' })) : null;

      var pfOn = h('input', { type: 'checkbox' });
      pfOn.checked = !!c.pullForward;
      pfOn.addEventListener('change', function () { c.pullForward = pfOn.checked ? { months: 3, pct: 10 } : null; rerender(); });
      var pfBox = h('details', { class: 'more', open: c.pullForward ? true : null }, [
        h('summary', { text: 'Pull-forward (시작 전 선구매, 예: 보조금 종료 전 막차 수요)' }),
        h('label', { class: 'check' }, [pfOn, '시작 전 N개월 판매 증가, 시작 후 같은 물량 감소']),
        c.pullForward ? h('div', { class: 'form-row' }, [
          w.field('기간 (개월)', w.number(c.pullForward.months, function (v) { c.pullForward.months = Math.max(1, Math.round(v || 1)); refreshPreview(); }, { min: '1', step: '1' })),
          w.field('시작 전 판매 증가 (%)', w.number(c.pullForward.pct, function (v) { c.pullForward.pct = v || 0; refreshPreview(); }, { step: '1' })),
        ]) : null,
      ]);

      var name = h('input', { class: 'input input--sm', value: c.name, placeholder: '예: 2027 미국 IRA 세액공제 축소' });
      name.addEventListener('input', function () { c.name = name.value; });
      var note = h('textarea', { class: 'input textarea', rows: '2', placeholder: '근거, 출처. 보고서에 나갑니다.' });
      note.value = c.note || '';
      note.addEventListener('input', function () { c.note = note.value; });

      [
        w.field('외생변수 이름', name),
        step('1', '무엇이 바뀌나', [tiles]),
        step('2', '어디서, 누구에게', [h('div', { class: 'form-row' }, whereRow), countryBox]),
        step('3', '영향 크기', [
          h('div', { class: 'form-row' }, [mag('min', '범위 최소'), mag('mode', '예상 (Base)'), mag('max', '범위 최대')]),
          h('p', { class: 'field__hint', text: amountHint + ' 최소, 최대는 숫자 크기 순서입니다 (−6 이 −1 보다 작음). Worst 와 Best 는 이 범위 안에서 자사에 불리한 쪽, 유리한 쪽 값을 자동으로 씁니다.' }),
        ]),
        step('4', '시점', [
          h('div', { class: 'form-row' }, [w.field('시작 월', start), w.field('반영 방식', speed), ramp, w.field('효과', lasting), hold, half]),
          pfBox,
        ]),
        w.field('근거 / 메모', note),
      ].forEach(function (el) { if (el) form.appendChild(el); });
    }

    function refreshPreview() {
      App.dom.clear(preview);
      var problems = S.validate(c, ds, bl);
      preview.appendChild(h('div', { class: 'sub-title', text: '요약' }));
      preview.appendChild(h('p', { class: 'card-sentence', text: S.describe(c) }));
      preview.appendChild(h('div', { class: 'sub-title', text: '월별 반영률 (전망 기간)' }));
      preview.appendChild(sparkBars(S.curve(c, bl.months), bl.months));
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
      var one = sim.engine.simulate(ds, bl, [sim.scenarios.withValue(Object.assign({}, card, { enabled: true, pullForward: null }), card.magnitude.mode)]);
      var r = card.region;
      var m = bl.months[h0];
      var where = sim.geo.regionShort(r);
      if (card.layer === 'TIV') return '예상값 기준 ' + m + ' ' + where + ' 월 TAM ' + fmt.compact(base.tiv[r][h0]) + ' → ' + fmt.compact(one.tiv[r][h0]) + '대';
      if (card.layer === 'POWERTRAIN') return '예상값 기준 ' + m + ' ' + where + ' ' + card.target + ' 비중 ' + fmt.pct(base.ptMix[r][card.target][h0]) + ' → ' + fmt.pct(one.ptMix[r][card.target][h0]);
      return '예상값 기준 ' + m + ' ' + where + ' ' + card.target + ' M/S ' + fmt.pct(base.share[r][card.target][h0], 2) + ' → ' + fmt.pct(one.share[r][card.target][h0], 2) +
        ' (월 ' + fmt.signedUnits(one.brandUnits[r][card.target][h0] - base.brandUnits[r][card.target][h0]) + '대)';
    }

    build();
    refreshPreview();
    App.ui.modal({
      title: isNew ? '외생변수 추가' : '외생변수 수정',
      body: h('div', { class: 'card-editor' }, [form, preview]),
      actions: [
        { label: '취소' },
        {
          label: '저장', kind: 'primary',
          onClick: function (close) {
            if (!c.name.trim()) c.name = S.LAYER_LABEL[c.layer] + ' 변화';
            var idx = st.cards.map(function (x) { return x.id; }).indexOf(c.id);
            if (idx >= 0) st.cards[idx] = c;
            else st.cards.push(c);
            close();
            changed();
          },
        },
      ],
    });
  }

  function sparkBars(values, months) {
    var box = h('div', { class: 'spark', role: 'img', 'aria-label': '월별 반영률' });
    values.forEach(function (v, i) {
      box.appendChild(h('span', { class: 'spark__bar', style: { height: Math.round(v * 100) + '%' }, title: months[i] + ' ' + Math.round(v * 100) + '%' }));
    });
    return h('div', null, [box, h('div', { class: 'spark__axis' }, [h('span', { text: months[0] }), h('span', { text: '100% = 완전 반영' }), h('span', { text: months[months.length - 1] })])]);
  }

  function render(root) {
    if (!st.ds) {
      root.appendChild(h('section', { class: 'panel' }, h('p', { class: 'empty', text: '먼저 데이터 탭에서 데이터를 불러오세요.' })));
      return;
    }
    var set = act.scenarioSet();
    root.appendChild(summary(set));
    root.appendChild(h('section', { class: 'panel' }, [
      w.head('외생변수', 'EV 보조금, CO2 규제, 자율주행 규제, 관세, 경기처럼 판매를 움직이는 요인 하나가 카드 한 장입니다. 이미 실적에 반영된 사건은 넣지 않습니다.', addBar()),
      cardTable(set),
    ]));
  }

  App.views = App.views || {};
  App.views.scenario = render;
  App.views.editCard = editCard;
})(window);
