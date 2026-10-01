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
    month: '월', quarter: '분기', region: '지역', country: '국가 (없어도 됨)', brand: '브랜드', powertrain: '동력원', units: '판매량',
    panels: '대당 디스플레이 수', share: '우리 공급 비중',
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
    if (kind === 'display') {
      meta.missing = meta.mapping.brand ? [] : ['brand'];
      st.displayMeta = meta;
      if (!meta.missing.length) {
        var nd = sim.prep.normalizeDisplay(meta.records, meta.mapping);
        meta.notes = nd.notes;
        st.display.rows = nd.rows;
        act.persist();
      }
      App.render();
      return;
    }
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
        h('h2', { class: 'panel__title', text: '3. 지켜볼 브랜드' }),
        h('span', { class: 'badge', text: st.brands.length + '개 선택, 나머지 ' + (st.rank.length - st.brands.length) + '개는 "기타" 로 합침' }),
        h('div', { class: 'app__spacer' }),
        h('button', { class: 'btn btn--sm', type: 'button', text: '판매량 상위 12개', onclick: function () {
          st.brands = st.rank.slice(0, 12).map(function (r) { return r.brand; });
          act.rebuild(); act.persist(); App.render();
        } }),
      ]),
      h('p', { class: 'panel__hint', text: '숫자는 최근 1년 전체 지역 판매 비중입니다. 고르지 않은 브랜드도 "기타" 로 합쳐져 시장 전체 크기에는 그대로 들어갑니다.' }),
      list,
    ]);
  }

  var PHI_OPTIONS = [
    { value: 0, label: '반영 안 함 (지금 점유율 고정)' },
    { value: 0.7, label: '조금' },
    { value: 0.85, label: '보통 (권장)' },
    { value: 0.95, label: '많이' },
    { value: 1, label: '그대로 계속' },
  ];

  function baselinePanel() {
    var o = st.blOptions;
    function set(k, v) {
      o[k] = v;
      act.rebuild(); act.persist(); App.render();
    }
    var phiOpts = PHI_OPTIONS.slice();
    if (!phiOpts.some(function (x) { return x.value === o.phi; })) phiOpts.push({ value: o.phi, label: '직접 입력값 ' + o.phi });
    var growthRows = st.ds.regions.map(function (r) {
      var ov = o.growth && typeof o.growth[r] === 'number' ? Math.round(o.growth[r] * 1000) / 10 : null;
      var inp = w.number(ov, function (v) {
        o.growth = o.growth || {};
        o.growth[r] = v === null || !isFinite(v) ? null : v / 100;
        act.rebuild(); act.persist(); App.render();
      }, { step: '0.5', placeholder: '비우면 자동', 'aria-label': r + ' 연간 성장률 직접 입력' });
      return [sim.geo.regionLabel(r), App.fmt.signedPct(st.bl.growthAuto[r]), inp, App.fmt.signedPct(st.bl.growthUsed[r])];
    });
    return h('section', { class: 'panel' }, [
      w.head('4. 기본 전망 설정', '기본 전망은 변수 카드 없이 지금 흐름이 그대로 이어질 때의 예측입니다. 대부분 그대로 두면 됩니다.', [
        w.help('기본 전망은 이렇게 만듭니다',
          '시장 전체 판매: 최근 1년 판매에서 계절 차이(연말 성수기 등)를 걸러 낸 수준에 연간 성장률을 곱하고, 계절 차이를 다시 입힙니다. ' +
          '성장률은 최근 1년과 그 앞 1년을 비교해 자동으로 잡으며, 사내 전망이 있으면 직접 넣습니다.\n\n' +
          '브랜드 점유율과 동력원 비중: 최근 흐름(예: 1년간 조금씩 오르는 중)을 앞으로도 얼마나 이어 갈지 정합니다. ' +
          '"보통" 은 처음 몇 달은 흐름을 따르다가 점점 평평해집니다.'),
      ]),
      h('div', { class: 'form-row' }, [
        w.field('전망 기간', w.select([12, 18, 24, 30, 36].map(function (n) { return { value: n, label: n + '개월' }; }), o.horizon, function (v) { set('horizon', Number(v)); })),
        w.field('최근 흐름을 읽을 기간', w.select([6, 12, 18, 24].map(function (n) { return { value: n, label: '최근 ' + n + '개월' }; }), o.trendWindow, function (v) { set('trendWindow', Number(v)); })),
        w.field('최근 흐름을 앞으로도 이어 갈까요?', w.select(phiOpts, o.phi, function (v) { set('phi', Number(v)); })),
      ]),
      h('h3', { class: 'sub-title', text: '지역별 연간 시장 성장률' }),
      w.table(['지역', { label: '자동 (최근 1년 vs 그 앞 1년)', num: true }, { label: '직접 입력 (%)', num: true }, { label: '적용값', num: true }], growthRows),
    ]);
  }

  function displayPanel() {
    var d = st.display;
    var ds = st.ds;
    function save() { act.persist(); App.render(); }
    var company = h('input', { class: 'input input--sm', value: d.companyName, 'aria-label': '화면에 쓸 우리 회사 이름' });
    company.addEventListener('change', function () { d.companyName = company.value.trim() || '우리'; save(); });

    var regionOpts = [{ value: '', label: '모든 지역' }].concat(ds.regions.map(function (r) { return { value: r, label: sim.geo.regionLabel(r) }; }));
    var rows = d.rows.map(function (row, i) {
      var known = ds.brands.indexOf(row.brand) >= 0;
      var brandSel = w.select((known ? [] : [{ value: row.brand, label: row.brand + ' (기타로 묶임)' }]).concat(ds.brands), row.brand, function (v) { row.brand = v; save(); });
      return [
        brandSel,
        w.select(regionOpts, row.region || '', function (v) { row.region = v; save(); }),
        w.number(isFinite(row.panelsPerVehicle) ? row.panelsPerVehicle : null, function (v) { row.panelsPerVehicle = v === null ? NaN : v; save(); }, { step: '0.1', min: '0', placeholder: '기본값' }),
        w.number(isFinite(row.ourShare) ? Math.round(row.ourShare * 1000) / 10 : null, function (v) { row.ourShare = v === null ? NaN : Math.max(0, Math.min(100, v)) / 100; save(); }, { step: '1', min: '0', max: '100', placeholder: '기본값' }),
        h('button', { class: 'btn btn--sm btn--ghost', type: 'button', text: '삭제', onclick: function () { d.rows.splice(i, 1); save(); } }),
      ];
    });
    var missing = ds.brands.filter(function (b) { return !d.rows.some(function (r) { return r.brand === b; }); });
    var meta = st.displayMeta;
    return h('section', { class: 'panel', id: 'display-panel' }, [
      w.head('5. 디스플레이 가정 (선택)', '브랜드마다 차 한 대에 디스플레이가 몇 장 들어가는지, 그중 우리가 몇 % 를 공급하는지 넣습니다. 한눈에 보기 탭의 디스플레이 수요와 우리 점유율이 여기서 나옵니다.', [
        h('button', { class: 'btn btn--sm', type: 'button', text: '+ 행 추가', onclick: function () {
          d.rows.push({ brand: missing[0] || ds.brands[0], region: '', panelsPerVehicle: d.defaultPanels, ourShare: 0 });
          save();
        } }),
        w.fileButton('CSV 로 불러오기', '.csv,.txt,.tsv', function (file) {
          App.csv.readFile(file, function (err, res) {
            if (err) { App.ui.toast(err.message, 'danger'); return; }
            var det = sim.prep.detectColumns(res.columns, 'display');
            applyMapping('display', { fileName: file.name, encoding: res.encoding, columns: res.columns, records: res.records, mapping: det.mapping });
            App.ui.toast(file.name + ' 에서 ' + st.display.rows.length + '행을 읽었습니다.', 'ok');
          });
        }),
      ]),
      h('div', { class: 'form-row' }, [
        w.field('화면에 쓸 우리 회사 이름', company),
        w.field('가정이 없는 브랜드: 대당 디스플레이 수', w.number(d.defaultPanels, function (v) { d.defaultPanels = v === null ? 0 : v; save(); }, { step: '0.1', min: '0' })),
        w.field('가정이 없는 브랜드: 우리 공급 비중 (%)', w.number(Math.round(d.defaultShare * 1000) / 10, function (v) { d.defaultShare = v === null ? 0 : Math.max(0, Math.min(100, v)) / 100; save(); }, { step: '1', min: '0', max: '100' })),
      ]),
      meta && meta.columns ? h('div', null, [h('p', { class: 'field__hint', text: '불러온 파일: ' + meta.fileName + '. 열 이름: 브랜드, 지역(없어도 됨), 대당 디스플레이 수, 우리 공급 비중(25%, 25, 0.25 모두 됨)' }), mappingRow('display', meta), w.notes(meta.notes)]) : null,
      d.rows.length
        ? w.table(['브랜드', '지역', { label: '대당 디스플레이 수 (장)', num: true }, { label: '우리 공급 비중 (%)', num: true }, ''], rows)
        : h('p', { class: 'empty', text: '아직 가정이 없습니다. "+ 행 추가" 로 넣거나 CSV 를 불러오세요.' }),
      h('p', { class: 'field__hint', text: '같은 브랜드에 "모든 지역" 행과 특정 지역 행이 함께 있으면 그 지역에서는 지역 행을 씁니다. 공급 비중은 사내 자료이니 이 PC 밖으로 내보내지 마세요.' }),
    ]);
  }

  function render(root) {
    var top = h('section', { class: 'panel panel--intro' }, [
      h('div', { class: 'row' }, [
        h('div', null, [
          h('h2', { class: 'panel__title', text: '데이터 불러오기' }),
          h('p', { class: 'panel__hint', text: '① 월별 판매 파일을 넣고 ② (있으면) 동력원 파일을 넣은 뒤 ③ 지켜볼 브랜드를 고릅니다. 처음이면 예시 데이터로 둘러보세요.' }),
        ]),
        h('div', { class: 'app__spacer' }),
        h('button', { class: 'btn btn--sm', type: 'button', text: '예시 CSV 내려받기', onclick: function () { App.io.exportSample(); } }),
        h('button', { class: 'btn btn--primary btn--sm', type: 'button', text: '예시 데이터로 시작', onclick: function () {
          act.useSample();
          if (st.pendingProject) { act.applyProject(st.pendingProject); st.pendingProject = null; }
          act.persist();
          App.ui.toast('예시 데이터를 불러왔습니다. 실제 브랜드가 아닙니다.', 'ok');
          st.tab = 'overview';
          App.render();
        } }),
      ]),
    ]);
    root.appendChild(top);
    root.appendChild(h('div', { class: 'grid-2' }, [
      filePanel('sales', '1. 월별 판매 (필수)', '열: 월, 지역(Sales Region), 국가, 브랜드(Sales Brand), 판매량. 한 줄이 "한 달, 한 국가, 한 브랜드" 입니다.', st.sales),
      filePanel('powertrain', '2. 분기별 동력원 판매 (선택)', '열: 분기, 지역, 브랜드, 동력원(BEV, PHEV, HEV, ICE 등), 판매량. 있으면 전기차 비중 같은 변수를 쓸 수 있습니다.', st.pt),
    ]));
    if (st.error) root.appendChild(h('section', { class: 'panel' }, w.notes([{ level: 'error', message: st.error }])));
    if (st.rank.length) root.appendChild(brandPanel());
    if (st.ds) {
      root.appendChild(baselinePanel());
      root.appendChild(displayPanel());
      root.appendChild(h('section', { class: 'panel' }, [
        h('h2', { class: 'panel__title', text: '데이터 점검 결과' }),
        w.notes(st.ds.notes),
      ]));
    }
  }

  App.views = App.views || {};
  App.views.data = render;
})(window);
