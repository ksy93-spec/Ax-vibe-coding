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

  /** 결과 CSV 열. 디스플레이 연동이 이 이름을 기준으로 붙습니다. 바꾸지 마세요 (SPEC.md 5절).
      새 열은 끝에만 더합니다. 앞 열의 순서가 바뀌면 이 파일을 읽는 쪽이 깨집니다. */
  var RESULT_COLUMNS = [
    'scenario', 'region', 'brand', 'month',
    'baseline_units', 'scenario_units', 'p10_units', 'p50_units', 'p90_units',
    'baseline_share', 'scenario_share', 'region_tiv_baseline', 'region_tiv_scenario',
    'baseline_panels', 'scenario_panels', 'our_panels_baseline', 'our_panels_scenario',
  ];

  /** 월별 디스플레이 수요와 우리 몫: key(지역 또는 전체) -> brand -> { panels[], ours[] } */
  function panelSeries(brandUnits) {
    var ds = App.state.ds;
    var settings = App.state.display;
    var out = {};
    var keys = ds.regions.concat([sim.TOTAL]);
    keys.forEach(function (k) {
      out[k] = {};
      ds.brands.forEach(function (b) { out[k][b] = { panels: [], ours: [] }; });
    });
    ds.brands.forEach(function (b) {
      var H = brandUnits[ds.regions[0]][b].length;
      for (var h = 0; h < H; h++) {
        var tp = 0;
        var to = 0;
        ds.regions.forEach(function (r) {
          var a = sim.display.lookup(settings, b, r);
          var pnl = brandUnits[r][b][h] * a.panels;
          out[r][b].panels.push(pnl);
          out[r][b].ours.push(pnl * a.share);
          tp += pnl;
          to += pnl * a.share;
        });
        out[sim.TOTAL][b].panels.push(tp);
        out[sim.TOTAL][b].ours.push(to);
      }
    });
    return out;
  }

  function resultRecords(scenarios) {
    var st = App.state;
    var ds = st.ds;
    var base = App.actions.baseResult();
    var hasDisp = App.actions.hasDisplay();
    var bp = hasDisp ? panelSeries(base.brandUnits) : null;
    var recs = [];
    scenarios.forEach(function (scn) {
      var res = App.actions.result(scn);
      var mc = App.actions.mcResult(scn);
      var sp = hasDisp ? panelSeries(res.brandUnits) : null;
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
              baseline_panels: hasDisp ? Math.round(bp[r][b].panels[h]) : '',
              scenario_panels: hasDisp ? Math.round(sp[r][b].panels[h]) : '',
              our_panels_baseline: hasDisp ? Math.round(bp[r][b].ours[h]) : '',
              our_panels_scenario: hasDisp ? Math.round(sp[r][b].ours[h]) : '',
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
    setTimeout(function () {
      App.csv.download('sample_display_assumptions.csv', App.csv.stringify(['Brand', 'Region', 'Panels per vehicle', 'Our share'],
        sim.sample.makeDisplay().map(function (r) { return { Brand: r.brand, Region: r.region, 'Panels per vehicle': r.panelsPerVehicle, 'Our share': Math.round(r.ourShare * 100) + '%' }; })));
    }, 800);
    return a;
  }

  App.io = {
    RESULT_COLUMNS: RESULT_COLUMNS,
    saveProject: saveProject,
    readJsonFile: readJsonFile,
    resultRecords: resultRecords,
    panelSeries: panelSeries,
    exportResults: exportResults,
    exportSample: exportSample,
  };
})(window);
