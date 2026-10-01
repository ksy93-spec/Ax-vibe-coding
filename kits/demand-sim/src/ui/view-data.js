/* 데이터 탭: CSV 불러오기, 열 지정, 관측 브랜드, 기준선 설정. 전역 App.views.data. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var w = App.w;
  var sim = App.sim;
  var st = App.state;
  var act = App.actions;

  var FIELD_LABEL = {
    month: '월', quarter: '분기', region: '지역', country: '국가 (선택)', brand: '브랜드', powertrain: '파워트레인', units: '판매량',
  };

  function loadFile(kind, file) {
    App.csv.readFile(file, function (err, res) {
      if (err) { App.ui.toast(err.message, 'danger'); return; }
      var det = sim.prep.detectColumns(res.columns, kind);
      var meta = { fileName: file.name, encoding: res.encoding, columns: res.columns, records: res.records, mapping: det.mapping };
      st.source = 'file';
      applyMapping(kind, meta);
      if (det.missing.length) {
        App.ui.toast('열 이름을 알아보지 못한 항목이 있습니다. 아래에서 열을 골라 주세요.', 'warn', 6000);
      } else {
        App.ui.toast(file.name + ' 을 읽었습니다 (' + res.records.length.toLocaleString('ko-KR') + '행)', 'ok');
      }
    });
  }

  function applyMapping(kind, meta) {
    var req = kind === 'sales' ? ['month', 'region', 'brand', 'units'] : ['quarter', 'region', 'brand', 'powertrain', 'units'];
    var missing = req.filter(function (f) { return !meta.mapping[f]; });
    meta.missing = missing;
    if (missing.length) {
      if (kind === 'sales') { st.sales = Object.assign({ rows: [], notes: [] }, meta); st.rank = []; act.rebuild(); }
      else { st.pt = Object.assign({ rows: [], notes: [] }, meta); act.rebuild(); }
      App.render();
      return;
    }
    var norm = kind === 'sales' ? sim.prep.normalizeSales(meta.records, meta.mapping) : sim.prep.normalizePowertrain(meta.records, meta.mapping);
    meta.notes = norm.notes;
    if (kind === 'sales') act.setSales(norm.rows, meta);
    else act.setPowertrain(norm.rows, meta);
    if (st.pendingProject && kind === 'sales') {
      var n = act.applyProject(st.pendingProject);
      st.pendingProject = null;
      n.forEach(function (m) { App.ui.toast(m, 'warn', 8000); });
    }
    act.persist();
    App.render();
  }

  function mappingRow(kind, meta) {
    var fields = Object.keys(sim.prep.ALIASES[kind]);
    var opts = [{ value: '', label: '(없음)' }].concat(meta.columns.map(function (c) { return { value: c, label: c }; }));
    return h('div', { class: 'mapping' }, fields.map(function (f) {
      var sel = w.select(opts, meta.mapping[f] || '', function (v) {
        meta.mapping[f] = v || null;
        applyMapping(kind, meta);
      });
      if (meta.missing && meta.missing.indexOf(f) >= 0) sel.classList.add('is-invalid');
      return w.field(FIELD_LABEL[f], sel);
    }));
  }

  function filePanel(kind, title, hint, meta) {
    var body = [
      h('h2', { class: 'panel__title', text: title }),
      h('p', { class: 'panel__hint', text: hint }),
    ];
    if (meta && meta.columns) {
      body.push(h('div', { class: 'row' }, [
        h('strong', { text: meta.fileName }),
        h('span', { class: 'badge', text: (meta.records.length).toLocaleString('ko-KR') + '행' }),
        h('span', { class: 'badge', text: meta.encoding === 'cp949' ? 'CP949' : 'UTF-8' }),
        meta.missing && meta.missing.length ? h('span', { class: 'badge badge--warn', text: '열 지정 필요' }) : h('span', { class: 'badge badge--ok', text: (meta.rows.length).toLocaleString('ko-KR') + '행 사용' }),
        h('div', { class: 'app__spacer' }),
        kind === 'powertrain' ? h('button', { class: 'btn btn--sm', type: 'button', text: '빼기', onclick: function () { act.setPowertrain(null); App.render(); } }) : null,
      ]));
      body.push(mappingRow(kind, meta));
      body.push(w.notes(meta.notes));
    } else if (meta && st.source === 'sample') {
      body.push(h('div', { class: 'row' }, [h('strong', { text: '예시 데이터' }), h('span', { class: 'badge badge--ok', text: meta.rows.length.toLocaleString('ko-KR') + '행' })]));
    }
    body.push(w.dropZone(
      meta ? '다른 파일로 바꾸려면 끌어다 놓거나 누르세요' : 'CSV 파일을 끌어다 놓거나 눌러서 선택',
      'UTF-8, CP949 모두 읽습니다. 파일은 브라우저 밖으로 나가지 않습니다.',
      '.csv,.txt,.tsv',
      function (file) { loadFile(kind, file); }
    ));
    return h('section', { class: 'panel' }, body);
  }

  function brandPanel() {
    var keep = {};
    st.brands.forEach(function (b) { keep[b] = true; });
    var total = 0;
    st.rank.forEach(function (r) { total += r.units; });
    var list = h('div', { class: 'brand-grid' }, st.rank.map(function (r) {
      var cb = h('input', { type: 'checkbox' });
      cb.checked = !!keep[r.brand];
      cb.addEventListener('change', function () {
        if (cb.checked) st.brands.push(r.brand);
        else st.brands = st.brands.filter(function (b) { return b !== r.brand; });
        // 판매량 순서를 유지합니다.
        var order = st.rank.map(function (x) { return x.brand; });
        st.brands.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
        act.rebuild();
        act.persist();
        App.render();
      });
      return h('label', { class: 'brand-item' + (cb.checked ? ' is-on' : '') }, [
        cb,
        h('span', { class: 'brand-item__name', text: r.brand }),
        h('span', { class: 'brand-item__val', text: App.fmt.pct(total ? r.units / total : 0) }),
      ]);
    }));
    return h('section', { class: 'panel' }, [
      h('div', { class: 'row' }, [
        h('h2', { class: 'panel__title', text: '3. 관측 브랜드' }),
        h('span', { class: 'badge', text: st.brands.length + '개 선택, 나머지 ' + (st.rank.length - st.brands.length) + '개는 기타' }),
        h('div', { class: 'app__spacer' }),
        h('button', { class: 'btn btn--sm', type: 'button', text: '판매량 상위 12개', onclick: function () {
          st.brands = st.rank.slice(0, 12).map(function (r) { return r.brand; });
          act.rebuild(); act.persist(); App.render();
        } }),
      ]),
      h('p', { class: 'panel__hint', text: '숫자는 최근 12개월 전 지역 판매 비중입니다. 고르지 않은 브랜드는 "기타" 하나로 합쳐 총수요(TAM)에 그대로 남습니다.' }),
      list,
    ]);
  }

  function baselinePanel() {
    var o = st.blOptions;
    function set(k, v) {
      o[k] = v;
      act.rebuild(); act.persist(); App.render();
    }
    var growthRows = st.ds.regions.map(function (r) {
      var ov = o.growth && typeof o.growth[r] === 'number' ? Math.round(o.growth[r] * 1000) / 10 : null;
      var inp = w.number(ov, function (v) {
        o.growth = o.growth || {};
        o.growth[r] = v === null || !isFinite(v) ? null : v / 100;
        act.rebuild(); act.persist(); App.render();
      }, { step: '0.5', placeholder: '자동', 'aria-label': r + ' 연간 성장률 덮어쓰기' });
      return [r, App.fmt.signedPct(st.bl.growthAuto[r]), inp, App.fmt.signedPct(st.bl.growthUsed[r])];
    });
    return h('section', { class: 'panel' }, [
      h('h2', { class: 'panel__title', text: '4. 기준선 설정' }),
      h('p', { class: 'panel__hint', text: '기준선은 카드가 하나도 없을 때의 예측입니다. 총수요는 최근 12개월 계절 조정 평균에 연간 성장률을 곱하고, 점유율은 최근 추세를 감쇠시켜 이어 갑니다.' }),
      h('div', { class: 'form-row' }, [
        w.field('예측 기간', w.select([12, 18, 24, 30, 36].map(function (n) { return { value: n, label: n + '개월' }; }), o.horizon, function (v) { set('horizon', Number(v)); })),
        w.field('점유율 추세 구간', w.select([6, 12, 18, 24].map(function (n) { return { value: n, label: '최근 ' + n + '개월' }; }), o.trendWindow, function (v) { set('trendWindow', Number(v)); })),
        w.field('추세 감쇠 (0~1)', w.number(o.phi, function (v) { set('phi', v === null ? 0 : Math.max(0, Math.min(1, v))); }, { step: '0.05', min: '0', max: '1' }), '0 이면 최근 수준 유지, 1 이면 추세 그대로'),
      ]),
      h('h3', { class: 'sub-title', text: '지역별 연간 총수요 성장률' }),
      w.table(['지역', { label: '자동 (최근 12개월 / 직전 12개월)', num: true }, { label: '덮어쓰기 (%)', num: true }, { label: '적용', num: true }], growthRows),
    ]);
  }

  function render(root) {
    var top = h('section', { class: 'panel panel--intro' }, [
      h('div', { class: 'row' }, [
        h('div', null, [
          h('h2', { class: 'panel__title', text: '데이터 불러오기' }),
          h('p', { class: 'panel__hint', text: '월별 판매(지역, 국가, 브랜드)는 필수, 분기별 파워트레인 판매는 선택입니다. 처음이면 예시 데이터로 화면을 둘러보세요.' }),
        ]),
        h('div', { class: 'app__spacer' }),
        h('button', { class: 'btn btn--sm', type: 'button', text: '예시 CSV 내려받기', onclick: function () { App.io.exportSample(); } }),
        h('button', { class: 'btn btn--primary btn--sm', type: 'button', text: '예시 데이터로 시작', onclick: function () {
          act.useSample();
          if (st.pendingProject) { act.applyProject(st.pendingProject); st.pendingProject = null; }
          act.persist();
          App.ui.toast('예시 데이터를 불러왔습니다. 실제 브랜드가 아닙니다.', 'ok');
          App.render();
        } }),
      ]),
    ]);
    root.appendChild(top);
    root.appendChild(h('div', { class: 'grid-2' }, [
      filePanel('sales', '1. 월별 판매 (필수)', '열: 월, 지역(Sales Region), 국가, 브랜드(Sales Brand), 판매량. 한 행이 한 달 한 국가 한 브랜드입니다.', st.sales),
      filePanel('powertrain', '2. 분기별 파워트레인 (선택)', '열: 분기, 지역, 브랜드, 파워트레인(BEV/PHEV/HEV/ICE 등), 판매량. 월별 브랜드 판매를 이 비중으로 나눕니다.', st.pt),
    ]));
    if (st.error) root.appendChild(h('section', { class: 'panel' }, w.notes([{ level: 'error', message: st.error }])));
    if (st.rank.length) root.appendChild(brandPanel());
    if (st.ds) {
      root.appendChild(baselinePanel());
      root.appendChild(h('section', { class: 'panel' }, [
        h('h2', { class: 'panel__title', text: '데이터 점검' }),
        w.notes(st.ds.notes),
      ]));
    }
  }

  App.views = App.views || {};
  App.views.data = render;
})(window);
