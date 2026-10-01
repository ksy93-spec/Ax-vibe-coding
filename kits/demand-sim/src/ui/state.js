/* 화면 상태와 재계산. 전역 App.state, App.actions.
 * 계산은 전부 App.sim 이 하고, 여기서는 언제 다시 계산할지만 정합니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var sim = App.sim;
  var STORE_KEY = 'demand-sim.project.v2';
  var SCN = ['Worst', 'Base', 'Best'];

  var state = {
    sales: null, // { fileName, encoding, columns, records, mapping, rows, notes }
    pt: null,
    source: '', // 'sample' | 'file'
    rank: [],
    brands: [],
    regionRank: [],
    regions: [], // 주요 지역. 나머지는 '기타 지역'
    blOptions: sim.baseline.defaults(),
    ds: null,
    bl: null,
    error: '',
    cards: [], // 외생변수. Worst/Base/Best 는 여기서 자동으로 나옵니다
    tab: 'data',
    view: { region: sim.TOTAL, brand: '' },
    overview: { region: '', year: -1, scenario: 'Base' },
    report: { title: '차량 디스플레이 수요 전망', year: -1 },
    display: sim.display.defaults(),
    displayMeta: null,
    pendingProject: null,
  };

  var dataVersion = 0;
  var cache = null;

  /** 데이터나 전망 설정이 바뀌면 데이터셋과 Trend 를 다시 만듭니다. */
  function rebuild() {
    state.ds = null;
    state.bl = null;
    state.error = '';
    cache = null;
    dataVersion++;
    if (!state.sales || !state.sales.rows.length) return;
    try {
      state.ds = sim.prep.buildDataset(state.sales.rows, state.pt ? state.pt.rows : null, { brands: state.brands, regions: state.regions });
      state.bl = sim.baseline.build(state.ds, state.blOptions);
      if (state.ds.regions.indexOf(state.view.region) < 0) state.view.region = sim.TOTAL;
      if (state.ds.brands.indexOf(state.view.brand) < 0) state.view.brand = state.ds.brands[0];
      if (state.ds.regions.indexOf(state.overview.region) < 0) state.overview.region = '';
    } catch (e) {
      state.error = e.message;
      state.ds = null;
      state.bl = null;
    }
  }

  function setSales(rows, meta) {
    state.sales = Object.assign({ rows: rows }, meta);
    state.rank = sim.prep.rankBrands(rows);
    state.regionRank = sim.prep.rankRegions(rows);
    var have = {};
    state.rank.forEach(function (r) { have[r.brand] = true; });
    var kept = state.brands.filter(function (b) { return have[b]; });
    state.brands = kept.length ? kept : state.rank.slice(0, 12).map(function (r) { return r.brand; });
    var haveR = {};
    state.regionRank.forEach(function (r) { haveR[r.region] = true; });
    var keptR = state.regions.filter(function (r) { return haveR[r]; });
    state.regions = keptR.length ? keptR : sim.prep.defaultMajors(state.regionRank);
    rebuild();
  }

  function setPowertrain(rows, meta) {
    state.pt = rows ? Object.assign({ rows: rows }, meta) : null;
    rebuild();
  }

  function useSample() {
    var raw = sim.sample.make();
    state.source = 'sample';
    state.pt = { rows: raw.powertrain, fileName: '예시 데이터', notes: [] };
    state.display = Object.assign(sim.display.defaults(), { rows: sim.sample.makeDisplay(), tiers: sim.sample.makeTiers() });
    state.displayMeta = { fileName: '예시 데이터' };
    state.brands = sim.sample.OBSERVED.slice();
    state.regions = sim.sample.MAJORS.slice();
    setSales(raw.sales, { fileName: '예시 데이터', notes: [] });
  }

  /**
   * Trend(외생변수 미반영)와 Worst/Base/Best 결과, 연 단위 집계. 카드, 디스플레이 가정, 데이터가 같으면 다시 계산하지 않습니다.
   * @returns {{build, results: {Trend, Worst, Base, Best}, annual: {Trend, Worst, Base, Best}, years}}
   */
  function scenarioSet() {
    if (!state.ds) return null;
    var sig = dataVersion + '|' + JSON.stringify(state.cards) + '|' + JSON.stringify(state.display);
    if (cache && cache.sig === sig) return cache.value;
    var ds = state.ds;
    var bl = state.bl;
    var build = sim.scenarios.build(ds, bl, state.cards, state.display);
    var results = { Trend: sim.engine.simulate(ds, bl, []) };
    SCN.forEach(function (n) { results[n] = sim.engine.simulate(ds, bl, build.cards[n]); });
    var actual = sim.annual.actualBrandUnits(ds);
    var annual = {};
    Object.keys(results).forEach(function (n) { annual[n] = sim.annual.fromResult(ds, bl, results[n], actual); });
    var value = { build: build, results: results, annual: annual, years: annual.Trend.years, actual: actual };
    cache = { sig: sig, value: value };
    return value;
  }

  /** 연도 인덱스 기본값: 실적과 전망이 섞인 해(E). 없으면 마지막 실적 해 */
  function defaultYear(years) {
    for (var i = 0; i < years.length; i++) if (years[i].kind === 'E') return i;
    for (var j = years.length - 1; j >= 0; j--) if (years[j].kind === 'A') return j;
    return 0;
  }

  /** 디스플레이 계산: 고른 시나리오, 고른 연도의 지역 -> 브랜드 -> 차량 */
  function displayFor(scenario, yearIdx) {
    var set = scenarioSet();
    var an = set.annual[scenario];
    var veh = {};
    state.ds.regions.forEach(function (r) {
      veh[r] = {};
      state.ds.brands.forEach(function (b) { veh[r][b] = an.brandUnits[r][b][yearIdx]; });
    });
    return sim.display.compute(state.ds, veh, state.display);
  }

  function hasDisplay() {
    return !!(state.display && state.display.rows && state.display.rows.length);
  }

  function projectData() {
    return {
      kind: 'demand-sim',
      version: 2,
      savedAt: new Date().toISOString(),
      brands: state.brands.slice(),
      regions: state.regions.slice(),
      baseline: state.blOptions,
      cards: state.cards,
      report: state.report,
      display: state.display,
      dataInfo: state.ds
        ? { firstMonth: state.ds.months[0], lastMonth: state.ds.months[state.ds.months.length - 1], regions: state.ds.regions }
        : null,
    };
  }

  /** 작업 파일 적용. 1판 형식(scenarios[])도 읽습니다. 데이터와 맞지 않는 점은 문장으로 돌려줍니다. */
  function applyProject(p) {
    if (!p || p.kind !== 'demand-sim') throw new Error('수요 시뮬레이터 작업 파일이 아닙니다.');
    var notes = [];
    if (p.brands && p.brands.length) state.brands = p.brands.slice();
    if (p.regions && p.regions.length) state.regions = p.regions.slice();
    if (p.baseline) {
      state.blOptions = Object.assign(sim.baseline.defaults(), p.baseline);
      if (p.version !== 2) state.blOptions.horizon = null; // 1판의 고정 24개월 대신 연말 기준
    }
    if (p.cards) state.cards = p.cards;
    else if (p.scenarios && p.scenarios.length) {
      var act = p.scenarios.filter(function (s) { return s.id === p.activeId; })[0] || p.scenarios[0];
      state.cards = act.cards || [];
      notes.push('이전 판 작업 파일입니다. "' + act.name + '" 의 카드를 외생변수로 가져왔습니다. Worst/Base/Best 는 자동으로 나옵니다.');
    }
    if (p.report && p.report.title) state.report.title = p.report.title;
    if (p.display) state.display = Object.assign(sim.display.defaults(), p.display, { tiers: p.display.tiers || {} });
    if (state.display.companyName === '우리') state.display.companyName = '자사';
    if (state.sales) {
      var have = {};
      state.rank.forEach(function (r) { have[r.brand] = true; });
      var lost = state.brands.filter(function (b) { return !have[b]; });
      if (lost.length) notes.push('지금 데이터에 없는 OEM 을 뺐습니다: ' + lost.join(', '));
      state.brands = state.brands.filter(function (b) { return have[b]; });
      rebuild();
      if (p.dataInfo && state.ds && p.dataInfo.lastMonth !== state.ds.months[state.ds.months.length - 1]) {
        notes.push('작업 파일은 실적 ' + p.dataInfo.lastMonth + ' 까지의 데이터로 만들었습니다. 지금 데이터는 ' + state.ds.months[state.ds.months.length - 1] + ' 까지입니다. 외생변수 시작 월을 확인하세요.');
      }
    }
    return notes;
  }

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(projectData()));
    } catch (e) { /* 저장 불가 환경 */ }
  }

  function restorable() {
    try {
      var raw = localStorage.getItem(STORE_KEY) || localStorage.getItem('demand-sim.project.v1');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  App.state = state;
  App.actions = {
    SCN: SCN,
    rebuild: rebuild,
    setSales: setSales,
    setPowertrain: setPowertrain,
    useSample: useSample,
    scenarioSet: scenarioSet,
    defaultYear: defaultYear,
    displayFor: displayFor,
    hasDisplay: hasDisplay,
    projectData: projectData,
    applyProject: applyProject,
    persist: persist,
    restorable: restorable,
  };
})(window);
