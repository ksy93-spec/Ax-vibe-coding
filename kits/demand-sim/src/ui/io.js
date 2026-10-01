/* 내려받기와 불러오기. 전역 App.io. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var sim = App.sim;

  function stamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  }

  function downloadText(name, text, type) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = App.csv.safeFilename(name);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return a.download;
  }

  function saveProject() {
    return downloadText('demand-sim_' + stamp() + '.json', JSON.stringify(App.actions.projectData(), null, 2), 'application/json');
  }

  function readJsonFile(file, cb) {
    var reader = new FileReader();
    reader.onerror = function () { cb(new Error('파일을 읽지 못했습니다.')); };
    reader.onload = function () {
      try {
        cb(null, JSON.parse(App.csv.decode(reader.result).text));
      } catch (e) {
        cb(new Error('JSON 형식이 아닙니다: ' + e.message));
      }
    };
    reader.readAsArrayBuffer(file);
  }

  /** 결과 CSV 열. 디스플레이 연동이 이 이름을 기준으로 붙습니다. 바꾸지 마세요 (SPEC.md 5절). */
  var RESULT_COLUMNS = [
    'scenario', 'region', 'brand', 'month',
    'baseline_units', 'scenario_units', 'p10_units', 'p50_units', 'p90_units',
    'baseline_share', 'scenario_share', 'region_tiv_baseline', 'region_tiv_scenario',
  ];

  function resultRecords(scenarios) {
    var st = App.state;
    var ds = st.ds;
    var base = App.actions.baseResult();
    var recs = [];
    scenarios.forEach(function (scn) {
      var res = App.actions.result(scn);
      var mc = App.actions.mcResult(scn);
      ds.regions.concat([sim.TOTAL]).forEach(function (r) {
        ds.brands.forEach(function (b) {
          res.months.forEach(function (m, h) {
            recs.push({
              scenario: scn.name,
              region: r,
              brand: b,
              month: m,
              baseline_units: Math.round(base.brandUnits[r][b][h]),
              scenario_units: Math.round(res.brandUnits[r][b][h]),
              p10_units: mc ? Math.round(mc.brandUnits[r][b].p10[h]) : '',
              p50_units: mc ? Math.round(mc.brandUnits[r][b].p50[h]) : '',
              p90_units: mc ? Math.round(mc.brandUnits[r][b].p90[h]) : '',
              baseline_share: base.share[r][b][h].toFixed(6),
              scenario_share: res.share[r][b][h].toFixed(6),
              region_tiv_baseline: Math.round(base.tiv[r][h]),
              region_tiv_scenario: Math.round(res.tiv[r][h]),
            });
          });
        });
      });
    });
    return recs;
  }

  function exportResults(scenarios) {
    var text = App.csv.stringify(RESULT_COLUMNS, resultRecords(scenarios));
    return App.csv.download('demand-sim_result_' + stamp() + '.csv', text);
  }

  /** 예시 데이터를 사내 CSV 와 같은 모양으로 내려받습니다. 열 이름 확인용. */
  function exportSample() {
    var raw = sim.sample.make();
    var a = App.csv.download('sample_sales_monthly.csv', App.csv.stringify(['Month', 'Sales Region', 'Sales Country', 'Sales Brand', 'Volume'],
      raw.sales.map(function (r) { return { Month: r.month, 'Sales Region': r.region, 'Sales Country': r.country, 'Sales Brand': r.brand, Volume: r.units }; })));
    setTimeout(function () {
      App.csv.download('sample_powertrain_quarterly.csv', App.csv.stringify(['Quarter', 'Sales Region', 'Sales Brand', 'Powertrain', 'Volume'],
        raw.powertrain.map(function (r) { return { Quarter: r.quarter, 'Sales Region': r.region, 'Sales Brand': r.brand, Powertrain: r.powertrain, Volume: r.units }; })));
    }, 400);
    return a;
  }

  App.io = {
    RESULT_COLUMNS: RESULT_COLUMNS,
    saveProject: saveProject,
    readJsonFile: readJsonFile,
    resultRecords: resultRecords,
    exportResults: exportResults,
    exportSample: exportSample,
  };
})(window);
