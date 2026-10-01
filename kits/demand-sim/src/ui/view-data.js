/* 데이터 탭: CSV 불러오기, 열 지정, 주요 지역, 관측 OEM, 전망 설정, 디스플레이 가정. 전역 App.views.data. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var w = App.w;
  var sim = App.sim;
  var st = App.state;
  var act = App.actions;

  var FIELD_LABEL = {
    month: '월', quarter: '분기', region: 'Sales Region', country: 'Country (없어도 됨)', brand: 'Sales Brand', powertrain: 'Powertrain', units: '판매량',
    panels: '대당 디스플레이 (EA)', share: '브랜드 내 자사 M/S', tier: '고객 구분',
  };

  function refresh() {
    act.rebuild();
    act.persist();
    App.render();
  }

  function loadFile(kind, file) {
    App.csv.readFile(file, function (err, res) {
      if (err) { App.ui.toast(err.message, 'danger'); return; }
      var det = sim.prep.detectColumns(res.columns, kind);
      var meta = { fileName: file.name, encoding: res.encoding, columns: res.columns, records: res.records, mapping: det.mapping };
      if (kind !== 'display') st.source = 'file';
      applyMapping(kind, meta);
      if (det.missing.length) App.ui.toast('열 이름을 알아보지 못한 항목이 있습니다. 아래에서 열을 골라 주세요.', 'warn', 6000);
      else App.ui.toast(file.name + ' 을 읽었습니다 (' + res.records.length.toLocaleString('ko-KR') + '행)', 'ok');
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
        if (Object.keys(nd.tiers).length) st.display.tiers = nd.tiers;
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
      return w.field(FIELD_LABEL[f] || f, sel);
    }));
  }

  function filePanel(kind, title, hint, meta) {
    var body = [w.head(title, hint)];
    if (meta && meta.columns) {
      body.push(h('div', { class: 'row' }, [
        h('strong', { text: meta.fileName }),
        h('span', { class: 'badge', text: meta.records.length.toLocaleString('ko-KR') + '행' }),
        h('span', { class: 'badge', text: meta.encoding === 'cp949' ? 'CP949' : 'UTF-8' }),
        meta.missing && meta.missing.length ? h('span', { class: 'badge badge--warn', text: '열 지정 필요' }) : h('span', { class: 'badge badge--ok', text: meta.rows.length.toLocaleString('ko-KR') + '행 사용' }),
        h('div', { class: 'app__spacer' }),
        kind === 'powertrain' ? h('button', { class: 'btn btn--sm', type: 'button', text: '빼기', onclick: function () { act.setPowertrain(null); act.persist(); App.render(); } }) : null,
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

  /** 체크 목록 (주요 지역, 관측 OEM 공용) */
  function pickGrid(rank, keyOf, labelOf, selected, onChange) {
    var keep = {};
    selected.forEach(function (k) { keep[k] = true; });
    var total = 0;
    rank.forEach(function (r) { total += r.units; });
    return h('div', { class: 'brand-grid' }, rank.map(function (r) {
      var key = keyOf(r);
      var cb = h('input', { type: 'checkbox' });
      cb.checked = !!keep[key];
      cb.addEventListener('change', function () {
        var next = selected.filter(function (k) { return k !== key; });
        if (cb.checked) next.push(key);
        var order = rank.map(keyOf);
        next.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
        onChange(next);
      });
      return h('label', { class: 'brand-item' + (cb.checked ? ' is-on' : '') }, [
        cb,
        h('span', { class: 'brand-item__name', text: labelOf(r) }),
        h('span', { class: 'brand-item__val', text: App.fmt.pct(total ? r.units / total : 0) }),
      ]);
    }));
  }

  function regionPanel() {
    return h('section', { class: 'panel' }, [
      w.head('3. 주요 지역', '고른 지역은 M/S trend 로 따로 분석하고, 나머지는 "' + sim.OTHER_REGION + '" 하나로 합칩니다. 합쳐도 글로벌 TAM 에는 그대로 들어갑니다. 숫자는 최근 12개월 글로벌 비중.', [
        h('span', { class: 'badge', text: st.regions.length + '개 지역 + ' + sim.OTHER_REGION }),
        h('button', { class: 'btn btn--sm', type: 'button', text: '중국·북미·유럽·한국·일본', onclick: function () {
          st.regions = sim.prep.defaultMajors(st.regionRank);
          refresh();
        } }),
      ]),
      pickGrid(st.regionRank, function (r) { return r.region; }, function (r) { return sim.geo.regionLabel(r.region); }, st.regions, function (next) {
        if (!next.length) { App.ui.toast('주요 지역을 하나 이상 고르세요.', 'warn'); App.render(); return; }
        st.regions = next;
        refresh();
      }),
    ]);
  }

  function brandPanel() {
    return h('section', { class: 'panel' }, [
      w.head('4. 관측 OEM', '고르지 않은 OEM 은 "기타" 로 합칩니다. 고객사와 주요 경쟁 OEM 을 고르세요. 숫자는 최근 12개월 글로벌 M/S.', [
        h('span', { class: 'badge', text: st.brands.length + '개 선택, ' + (st.rank.length - st.brands.length) + '개는 기타' }),
        h('button', { class: 'btn btn--sm', type: 'button', text: '판매 상위 12개', onclick: function () {
          st.brands = st.rank.slice(0, 12).map(function (r) { return r.brand; });
          refresh();
        } }),
      ]),
      pickGrid(st.rank, function (r) { return r.brand; }, function (r) { return r.brand; }, st.brands, function (next) {
        st.brands = next;
        refresh();
      }),
    ]);
  }

  var PHI_OPTIONS = [
    { value: 0, label: '반영 안 함 (현재 M/S 고정)' },
    { value: 0.7, label: '약하게' },
    { value: 0.85, label: '보통 (권장)' },
    { value: 0.95, label: '강하게' },
    { value: 1, label: 'Trend 그대로 연장' },
  ];

  function forecastPanel() {
    var o = st.blOptions;
    function set(k, v) {
      o[k] = v;
      refresh();
    }
    var phiOpts = PHI_OPTIONS.slice();
    if (!phiOpts.some(function (x) { return x.value === o.phi; })) phiOpts.push({ value: o.phi, label: '직접 입력값 ' + o.phi });
    var lastY = Number(st.ds.months[st.ds.months.length - 1].slice(0, 4));
    var growthRows = st.ds.regions.map(function (r) {
      var ov = o.growth && typeof o.growth[r] === 'number' ? Math.round(o.growth[r] * 1000) / 10 : null;
      var inp = w.number(ov, function (v) {
        o.growth = o.growth || {};
        o.growth[r] = v === null || !isFinite(v) ? null : v / 100;
        refresh();
      }, { step: '0.5', placeholder: '자동', 'aria-label': r + ' TAM 성장률 직접 입력' });
      return [sim.geo.regionLabel(r), App.fmt.signedPct(st.bl.growthAuto[r]), inp, App.fmt.signedPct(st.bl.growthUsed[r])];
    });
    return h('section', { class: 'panel' }, [
      w.head('5. 전망 설정', '외생변수를 넣기 전 Trend 전망입니다. 지역 TAM 은 계절성과 성장률로, OEM M/S 와 Powertrain 비중은 월별 M/S trend 로 이어 갑니다.', [
        w.help('Trend 전망 방법',
          'TAM: 최근 12개월 판매에서 계절성(연말 성수기 등)을 걷어 낸 수준에 연간 성장률을 곱하고 계절성을 다시 입힙니다. 성장률은 최근 12개월 vs 직전 12개월로 자동 계산하며, 사내 전망이 있으면 직접 넣습니다.\n\n' +
          'M/S: 최근 N개월 월별 M/S 의 기울기를 구해 앞으로 이어 가되, "반영 정도" 에 따라 점점 평평해집니다. "보통" 은 1년쯤 지나면 거의 평평해집니다.'),
      ]),
      h('div', { class: 'form-row' }, [
        w.field('전망 종료', w.select([1, 2, 3].map(function (n) { return { value: n, label: (lastY + n) + '년 12월 (' + n + '년 뒤)' }; }), o.yearsAhead == null ? 2 : o.yearsAhead, function (v) { o.horizon = null; set('yearsAhead', Number(v)); })),
        w.field('M/S trend 구간', w.select([6, 12, 18, 24].map(function (n) { return { value: n, label: '최근 ' + n + '개월' }; }), o.trendWindow, function (v) { set('trendWindow', Number(v)); })),
        w.field('Trend 반영 정도', w.select(phiOpts, o.phi, function (v) { set('phi', Number(v)); })),
      ]),
      h('h3', { class: 'sub-title', text: '지역별 연간 TAM 성장률' }),
      w.table(['지역', { label: '자동 (최근 12M vs 직전 12M)', num: true }, { label: '직접 입력 (%)', num: true }, { label: '적용', num: true }], growthRows),
    ]);
  }

  var TIER_OPTS = [{ value: '', label: '-' }, { value: 'strategic', label: '전략고객' }, { value: 'maintain', label: '유지고객' }];

  function displayPanel() {
    var d = st.display;
    var ds = st.ds;
    d.tiers = d.tiers || {};
    function save() { act.persist(); App.render(); }
    function brandRow(b) {
      var row = d.rows.filter(function (r) { return r.brand === b && !r.region; })[0];
      if (!row) {
        row = { brand: b, region: '', panelsPerVehicle: NaN, ourShare: NaN };
        d.rows.push(row);
      }
      return row;
    }
    var company = h('input', { class: 'input input--sm', value: d.companyName, 'aria-label': '자사 표기' });
    company.addEventListener('change', function () { d.companyName = company.value.trim() || '자사'; save(); });

    var mainRows = ds.brands.map(function (b) {
      var existing = d.rows.filter(function (r) { return r.brand === b && !r.region; })[0];
      return [
        h('span', { class: 'sbar__name' }, [h('span', { class: 'swatch', style: { background: w.brandColor(ds, b) } }), b]),
        b === sim.OTHER ? h('span', { class: 'muted', text: '-' }) : w.select(TIER_OPTS, d.tiers[b] || '', function (v) { if (v) d.tiers[b] = v; else delete d.tiers[b]; save(); }),
        w.number(existing && isFinite(existing.panelsPerVehicle) ? existing.panelsPerVehicle : null, function (v) { brandRow(b).panelsPerVehicle = v === null ? NaN : v; save(); }, { step: '0.1', min: '0', placeholder: String(d.defaultPanels) }),
        w.number(existing && isFinite(existing.ourShare) ? Math.round(existing.ourShare * 1000) / 10 : null, function (v) { brandRow(b).ourShare = v === null ? NaN : Math.max(0, Math.min(100, v)) / 100; save(); }, { step: '1', min: '0', max: '100', placeholder: String(Math.round(d.defaultShare * 100)) }),
      ];
    });

    var regionOpts = ds.regions.map(function (r) { return { value: r, label: sim.geo.regionLabel(r) }; });
    var overrides = d.rows.map(function (row, i) { return { row: row, i: i }; }).filter(function (x) { return x.row.region; });
    var ovRows = overrides.map(function (x) {
      var row = x.row;
      return [
        w.select(ds.brands, row.brand, function (v) { row.brand = v; save(); }),
        w.select(regionOpts.some(function (o) { return o.value === row.region; }) ? regionOpts : regionOpts.concat([{ value: row.region, label: row.region + ' (데이터에 없음)' }]), row.region, function (v) { row.region = v; save(); }),
        w.number(isFinite(row.panelsPerVehicle) ? row.panelsPerVehicle : null, function (v) { row.panelsPerVehicle = v === null ? NaN : v; save(); }, { step: '0.1', min: '0' }),
        w.number(isFinite(row.ourShare) ? Math.round(row.ourShare * 1000) / 10 : null, function (v) { row.ourShare = v === null ? NaN : Math.max(0, Math.min(100, v)) / 100; save(); }, { step: '1', min: '0', max: '100' }),
        h('button', { class: 'btn btn--sm btn--ghost', type: 'button', text: '삭제', onclick: function () { d.rows.splice(x.i, 1); save(); } }),
      ];
    });
    var unknown = d.rows.filter(function (r) { return !r.region && ds.brands.indexOf(r.brand) < 0; }).map(function (r) { return r.brand; });
    var meta = st.displayMeta;
    return h('section', { class: 'panel', id: 'display-panel' }, [
      w.head('6. 디스플레이 가정과 고객 구분', 'OEM 별 대당 디스플레이(EA)와 브랜드 내 자사 M/S(%), 고객 구분을 넣습니다. 디스플레이 TAM = 차량 판매 x 대당 디스플레이, 자사 물량 = 디스플레이 TAM x 브랜드 내 자사 M/S.', [
        w.fileButton('CSV 로 불러오기', '.csv,.txt,.tsv', function (file) { loadFile('display', file); }),
      ]),
      h('div', { class: 'form-row' }, [
        w.field('자사 표기', company),
        w.field('가정 없는 OEM: 대당 디스플레이 (EA)', w.number(d.defaultPanels, function (v) { d.defaultPanels = v === null ? 0 : v; save(); }, { step: '0.1', min: '0' })),
        w.field('가정 없는 OEM: 브랜드 내 자사 M/S (%)', w.number(Math.round(d.defaultShare * 1000) / 10, function (v) { d.defaultShare = v === null ? 0 : Math.max(0, Math.min(100, v)) / 100; save(); }, { step: '1', min: '0', max: '100' })),
      ]),
      meta && meta.columns ? h('div', null, [h('p', { class: 'field__hint', text: '불러온 파일: ' + meta.fileName + '. 열: Brand, Region(없어도 됨), 대당 디스플레이, 브랜드 내 자사 M/S(25%, 25, 0.25 모두 됨), 고객 구분(전략/유지)' }), mappingRow('display', meta), w.notes(meta.notes)]) : null,
      w.table(['OEM', '고객 구분', { label: '대당 디스플레이 (EA)', num: true }, { label: '브랜드 내 자사 M/S (%)', num: true }], mainRows),
      h('div', { class: 'phead phead--sub' }, [
        h('div', { class: 'phead__text' }, [h('h3', { class: 'sub-title', text: '지역별 예외 (선택)' }), h('p', { class: 'field__hint', text: '같은 OEM 이라도 지역마다 자사 M/S 가 다르면 여기에 넣습니다. 그 지역에서는 이 값이 위 값보다 먼저 쓰입니다.' })]),
        h('div', { class: 'phead__tools' }, h('button', { class: 'btn btn--sm', type: 'button', text: '+ 예외 추가', onclick: function () {
          d.rows.push({ brand: ds.brands[0], region: ds.regions[0], panelsPerVehicle: NaN, ourShare: NaN });
          save();
        } })),
      ]),
      ovRows.length ? w.table(['OEM', '지역', { label: '대당 디스플레이 (EA)', num: true }, { label: '브랜드 내 자사 M/S (%)', num: true }, ''], ovRows) : null,
      unknown.length ? w.notes([{ level: 'info', message: '관측 OEM 이 아니라 쓰이지 않는 가정: ' + unknown.join(', ') + '. 이 OEM 들은 "기타" 행 값을 씁니다.' }]) : null,
      h('p', { class: 'field__hint', text: '자사 M/S 와 고객 구분은 사내 자료입니다. 작업 파일과 브라우저 자동 저장에 들어가므로 사내 PC 밖으로 내보내지 마세요.' }),
    ]);
  }

  function render(root) {
    root.appendChild(h('section', { class: 'panel panel--intro' }, [
      w.head('데이터', '① 월별 판매 CSV ② (있으면) 분기 Powertrain CSV ③ 주요 지역 ④ 관측 OEM ⑤ 전망 설정 ⑥ 디스플레이 가정 순서입니다. 처음이면 예시 데이터로 둘러보세요.', [
        h('button', { class: 'btn btn--sm', type: 'button', text: '예시 CSV 내려받기', onclick: function () { App.io.exportSample(); } }),
        h('button', { class: 'btn btn--primary btn--sm', type: 'button', text: '예시 데이터로 시작', onclick: function () {
          act.useSample();
          if (st.pendingProject) { act.applyProject(st.pendingProject); st.pendingProject = null; }
          act.persist();
          App.ui.toast('예시 데이터를 불러왔습니다. OEM 이름은 실제지만 수치는 지어낸 값입니다.', 'ok', 6000);
          st.tab = 'overview';
          App.render();
        } }),
      ]),
    ]));
    root.appendChild(h('div', { class: 'grid-2' }, [
      filePanel('sales', '1. 월별 판매 (필수)', '열: 월, Sales Region, Country, Sales Brand, 판매량. 한 줄이 한 달 · 한 국가 · 한 브랜드.', st.sales),
      filePanel('powertrain', '2. 분기 Powertrain (선택)', '열: 분기, Sales Region, Sales Brand, Powertrain(BEV/PHEV/HEV/ICE), 판매량. 있으면 BEV 비중 같은 외생변수를 쓸 수 있습니다.', st.pt),
    ]));
    if (st.error) root.appendChild(h('section', { class: 'panel' }, w.notes([{ level: 'error', message: st.error }])));
    if (st.regionRank.length) root.appendChild(regionPanel());
    if (st.rank.length) root.appendChild(brandPanel());
    if (st.ds) {
      root.appendChild(forecastPanel());
      root.appendChild(displayPanel());
      root.appendChild(h('section', { class: 'panel' }, [w.head('데이터 점검 결과'), w.notes(st.ds.notes)]));
    }
  }

  App.views = App.views || {};
  App.views.data = render;
})(window);
