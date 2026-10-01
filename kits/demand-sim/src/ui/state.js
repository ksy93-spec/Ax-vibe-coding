/* 화면 상태와 재계산. 전역 App.state, App.actions.
 * 계산은 전부 App.sim 이 하고, 여기서는 언제 다시 계산할지만 정합니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var sim = App.sim;
  var STORE_KEY = 'demand-sim.project.v1';

  var seq = 0;
  function newScenario(name) {
    seq += 1;
    return { id: 's' + Date.now().toString(36) + seq, name: name, notes: '', cards: [] };
  }

  var first = newScenario('시나리오 1');
  var state = {
    sales: null, // { fileName, encoding, columns, records, mapping, rows, notes }
    pt: null,
    source: '', // 'sample' | 'file'
    rank: [],
    brands: [],
    blOptions: sim.baseline.defaults(),
    ds: null,
    bl: null,
    error: '',
    scenarios: [first],
    activeId: first.id,
    tab: 'data',
    view: { region: sim.TOTAL, brand: '', mcDraws: 500 },
    report: { title: '권역별 수요 시나리오 검토', focus: '', compare: [], allBrands: false },
    mc: {}, // scenarioId -> { sig, result }
    pendingProject: null, // 데이터보다 먼저 불러온 작업 파일
  };

  function scenario(id) {
    var list = state.scenarios.filter(function (s) { return s.id === (id || state.activeId); });
    return list[0] || state.scenarios[0];
  }

  /** 데이터나 기준선 설정이 바뀌면 데이터셋과 기준선을 다시 만듭니다. */
  function rebuild() {
    state.ds = null;
    state.bl = null;
    state.error = '';
    state.mc = {};
    if (!state.sales || !state.sales.rows.length) return;
    try {
      state.ds = sim.prep.buildDataset(state.sales.rows, state.pt ? state.pt.rows : null, { brands: state.brands });
      state.bl = sim.baseline.build(state.ds, state.blOptions);
      if (state.ds.regions.indexOf(state.view.region) < 0) state.view.region = sim.TOTAL;
      if (state.ds.brands.indexOf(state.view.brand) < 0) state.view.brand = state.ds.brands[0];
      if (state.ds.brands.indexOf(state.report.focus) < 0) state.report.focus = state.ds.brands[0];
    } catch (e) {
      state.error = e.message;
      state.ds = null;
      state.bl = null;
    }
  }

  function setSales(rows, meta) {
    state.sales = Object.assign({ rows: rows }, meta);
    state.rank = sim.prep.rankBrands(rows);
    var have = {};
    state.rank.forEach(function (r) { have[r.brand] = true; });
    var kept = state.brands.filter(function (b) { return have[b]; });
    state.brands = kept.length ? kept : state.rank.slice(0, 12).map(function (r) { return r.brand; });
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
    state.brands = [];
    setSales(raw.sales, { fileName: '예시 데이터', notes: [] });
  }

  /** 시나리오 결과. 매번 계산해도 빠르므로 캐시하지 않습니다. */
  function result(scn) {
    if (!state.ds) return null;
    return sim.engine.simulate(state.ds, state.bl, (scn || scenario()).cards);
  }

  function baseResult() {
    if (!state.ds) return null;
    return sim.engine.simulate(state.ds, state.bl, []);
  }

  function mcSig(scn) {
    return JSON.stringify(scn.cards) + '|' + state.view.mcDraws;
  }

  /** 몬테카를로 결과. 카드가 바뀌면 무효가 됩니다. */
  function mcResult(scn) {
    var hit = state.mc[scn.id];
    return hit && hit.sig === mcSig(scn) ? hit.result : null;
  }

  function runMc(scn) {
    var res = sim.engine.monteCarlo(state.ds, state.bl, scn.cards, { draws: state.view.mcDraws, seed: 42 });
    state.mc[scn.id] = { sig: mcSig(scn), result: res };
    return res;
  }

  function projectData() {
    return {
      kind: 'demand-sim',
      version: 1,
      savedAt: new Date().toISOString(),
      brands: state.brands.slice(),
      baseline: state.blOptions,
      scenarios: state.scenarios,
      activeId: state.activeId,
      report: state.report,
      dataInfo: state.ds
        ? { firstMonth: state.ds.months[0], lastMonth: state.ds.months[state.ds.months.length - 1], regions: state.ds.regions }
        : null,
    };
  }

  /** 작업 파일 적용. 데이터와 맞지 않는 점은 문장으로 돌려줍니다. */
  function applyProject(p) {
    if (!p || p.kind !== 'demand-sim') throw new Error('수요 시뮬레이터 작업 파일이 아닙니다.');
    var notes = [];
    if (p.brands && p.brands.length) state.brands = p.brands.slice();
    if (p.baseline) state.blOptions = Object.assign(sim.baseline.defaults(), p.baseline);
    if (p.scenarios && p.scenarios.length) {
      state.scenarios = p.scenarios;
      state.activeId = p.activeId && p.scenarios.some(function (s) { return s.id === p.activeId; }) ? p.activeId : p.scenarios[0].id;
    }
    if (p.report) state.report = Object.assign(state.report, p.report);
    if (state.sales) {
      var have = {};
      state.rank.forEach(function (r) { have[r.brand] = true; });
      var lost = state.brands.filter(function (b) { return !have[b]; });
      if (lost.length) notes.push('지금 데이터에 없는 관측 브랜드를 뺐습니다: ' + lost.join(', '));
      state.brands = state.brands.filter(function (b) { return have[b]; });
      rebuild();
      if (p.dataInfo && state.ds && p.dataInfo.lastMonth !== state.ds.months[state.ds.months.length - 1]) {
        notes.push('작업 파일은 실적 ' + p.dataInfo.lastMonth + ' 까지의 데이터로 만들었습니다. 지금 데이터는 ' + state.ds.months[state.ds.months.length - 1] + ' 까지입니다. 카드 시작 월을 확인하세요.');
      }
    }
    return notes;
  }

  /** 브라우저에 작업을 자동 저장합니다. 판매 실적은 저장하지 않습니다. 사내 정책으로 막히면 조용히 넘어갑니다. */
  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(projectData()));
    } catch (e) { /* 저장 불가 환경 */ }
  }

  function restorable() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  App.state = state;
  App.actions = {
    newScenario: newScenario,
    scenario: scenario,
    rebuild: rebuild,
    setSales: setSales,
    setPowertrain: setPowertrain,
    useSample: useSample,
    result: result,
    baseResult: baseResult,
    mcResult: mcResult,
    runMc: runMc,
    projectData: projectData,
    applyProject: applyProject,
    persist: persist,
    restorable: restorable,
  };
})(window);
