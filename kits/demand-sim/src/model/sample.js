/* 예시 데이터. 시드 고정이라 열 때마다 같습니다. 전역 App.sim.sample.
 * 실제 브랜드나 실제 판매량이 아닙니다. 화면과 계산을 확인하는 용도입니다.
 * 사내 CSV 와 같은 모양(월별 판매, 분기별 파워트레인)으로 만들어 두었습니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var sim = (App.sim = App.sim || {});
  var U = sim.util;

  var FIRST = '2023-09';
  var LAST = '2026-08';
  // 파워트레인 분기 자료는 한 분기 늦게 나온다고 가정합니다. 2026-Q3 은 없습니다.
  var PT_LAST_QUARTER = '2026-Q2';
  var PTS = ['BEV', 'PHEV', 'HEV', 'ICE'];

  // 지역: 월평균 총수요, 연간 성장, 계절(1~12월), 국가 비중, 지역 BEV 추세(연간 로그)
  var REGIONS = {
    CN: { tiv: 2000000, growth: 0.03, season: [0.95, 0.72, 0.95, 0.9, 0.95, 1.02, 0.92, 0.97, 1.05, 1.03, 1.15, 1.39], countries: { CN: 1 }, bev: 0.18 },
    NA: { tiv: 1550000, growth: 0.01, season: [0.8, 0.92, 1.1, 1.05, 1.1, 1.03, 1.0, 1.05, 0.98, 0.97, 0.97, 1.03], countries: { US: 0.84, CA: 0.09, MX: 0.07 }, bev: 0.05 },
    EU: { tiv: 1100000, growth: 0.005, season: [0.88, 0.9, 1.35, 0.95, 1.0, 1.08, 0.97, 0.7, 1.12, 0.98, 0.98, 1.09], countries: { DE: 0.27, FR: 0.18, UK: 0.22, IT: 0.17, ES: 0.12, NO: 0.04 }, bev: 0.12 },
    KR: { tiv: 140000, growth: 0.0, season: [0.9, 0.9, 1.05, 1.02, 1.04, 1.08, 0.98, 0.93, 1.0, 1.0, 1.02, 1.08], countries: { KR: 1 }, bev: 0.1 },
    JP: { tiv: 380000, growth: -0.01, season: [0.95, 1.1, 1.45, 0.8, 0.8, 0.95, 1.0, 0.85, 1.12, 0.92, 0.98, 1.08], countries: { JP: 1 }, bev: 0.05 },
  };

  // 브랜드: 지역별 시작 점유율(%)과 연간 추세(로그), 파워트레인 비중(BEV, PHEV, HEV, ICE)
  var BRANDS = [
    ['Brand A', { CN: [4.5, -0.1], NA: [4.2, -0.05], EU: [2.4, -0.12], KR: [3.0, 0.05], JP: [0.2, 0] }, [1, 0, 0, 0]],
    ['Brand B', { CN: [14, 0.12], EU: [0.8, 0.5], KR: [0.3, 0.4], JP: [0.1, 0.2] }, [0.45, 0.55, 0, 0]],
    ['Brand C', { CN: [6, -0.15], NA: [14, 0.02], EU: [6.5, 0.02], KR: [1.2, 0.05], JP: [32, 0] }, [0.03, 0.03, 0.42, 0.52]],
    ['Brand D', { CN: [1.2, -0.2], NA: [10.5, 0.03], EU: [8.2, 0], KR: [44, 0], JP: [0.1, 0] }, [0.14, 0.04, 0.2, 0.62]],
    ['Brand E', { CN: [11, -0.12], NA: [4.2, 0], EU: [25, -0.02], KR: [5, 0], JP: [1.1, 0] }, [0.18, 0.08, 0.16, 0.58]],
    ['Brand F', { CN: [1.1, -0.1], NA: [14.5, -0.01], EU: [2.4, -0.05] }, [0.05, 0.01, 0.06, 0.88]],
    ['Brand G', { NA: [13, 0], EU: [2.8, -0.03], KR: [1.2, 0] }, [0.04, 0, 0.08, 0.88]],
    ['Brand H', { CN: [0.5, -0.2], NA: [9, -0.06], EU: [15, -0.03] }, [0.1, 0.03, 0.17, 0.7]],
    ['Brand I', { CN: [4, -0.12], NA: [9.2, 0.01], EU: [3.2, 0], KR: [0.5, 0], JP: [12, 0] }, [0.03, 0.02, 0.3, 0.65]],
    ['Brand J', { CN: [8, 0.05], EU: [0.5, 0.3] }, [0.2, 0.3, 0, 0.5]],
    ['Brand K', { CN: [2, -0.1], NA: [7, 0], EU: [2.2, 0], JP: [10, 0] }, [0.02, 0.01, 0.25, 0.72]],
    ['Brand L', { CN: [3, -0.08], NA: [2.1, 0], EU: [5, 0.01], KR: [4, 0], JP: [1, 0] }, [0.16, 0.1, 0.1, 0.64]],
    ['Brand M', { CN: [2.2, 0.25] }, [1, 0, 0, 0]],
    ['Brand N', { NA: [1, 0], JP: [6, 0] }, [0.01, 0, 0.35, 0.64]],
    ['Brand O', { CN: [1.5, 0], NA: [1.5, 0], EU: [2, 0], KR: [1, 0], JP: [4, 0] }, [0.05, 0.02, 0.1, 0.83]],
    ['Brand P', { CN: [1.5, 0.1], EU: [1.5, 0], JP: [3, 0] }, [0.3, 0.1, 0.05, 0.55]],
    ['Brand Q', { CN: [1.2, 0], NA: [1, 0], EU: [1.5, 0], KR: [0.8, 0] }, [0.02, 0.01, 0.07, 0.9]],
    ['Brand R', { CN: [1.2, 0.05], NA: [0.8, 0], EU: [1.3, 0], JP: [2, 0] }, [0.05, 0.05, 0.1, 0.8]],
  ];

  function make() {
    var r = U.rng(20260930);
    function noise(sd) {
      // 합이 0 근처인 가벼운 잡음. 정규분포 근사(균등 3개 합)
      return ((r() + r() + r()) / 3 - 0.5) * 2 * sd * 1.7;
    }
    var months = U.monthRange(FIRST, LAST);
    var sales = [];
    var ptAgg = {};
    var cutQ = PT_LAST_QUARTER;

    Object.keys(REGIONS).forEach(function (rk) {
      var R = REGIONS[rk];
      months.forEach(function (m, t) {
        var cal = U.monthIndex(m) % 12;
        var years = t / 12;
        var tiv = R.tiv * R.season[cal] * Math.pow(1 + R.growth, years) * (1 + noise(0.02));

        // 북미는 2025-10 부터 BEV 가 꺾이고 직전 석 달에 당겨쓰기가 있었던 것으로 둡니다 (예시).
        var bevBoost = Math.exp(R.bev * years);
        if (rk === 'NA') {
          if (m >= '2025-07' && m <= '2025-09') bevBoost *= 1.35;
          if (m >= '2025-10') bevBoost *= 0.72;
        }

        var weights = BRANDS.map(function (B) {
          var cfg = B[1][rk];
          if (!cfg) return 0;
          var w = cfg[0] * Math.exp(cfg[1] * years) * (1 + noise(0.04));
          // BEV 비중이 큰 브랜드는 지역 BEV 흐름을 같이 탑니다.
          return w * (1 + B[2][0] * (bevBoost - 1));
        });
        var wsum = U.sum(weights);

        BRANDS.forEach(function (B, bi) {
          if (!weights[bi]) return;
          var bu = tiv * (weights[bi] / wsum);
          var mix = B[2].slice();
          mix[0] *= bevBoost;
          mix[1] *= Math.exp(R.bev * 0.6 * years);
          var ms = U.sum(mix);
          mix = mix.map(function (x) { return (x / ms) * (1 + (x > 0 ? noise(0.05) : 0)); });
          ms = U.sum(mix);
          mix = mix.map(function (x) { return x / ms; });

          // 국가별로 나눠 CSV 행을 만듭니다.
          Object.keys(R.countries).forEach(function (c) {
            var v = Math.round(bu * R.countries[c] * (1 + noise(0.03)));
            if (v > 0) sales.push({ month: m, region: rk, country: c, brand: B[0], units: v });
          });

          var q = U.quarterOf(m);
          if (q > cutQ) return;
          var key = q + '|' + rk + '|' + B[0];
          var agg = (ptAgg[key] = ptAgg[key] || U.zeros(PTS.length));
          for (var p = 0; p < PTS.length; p++) agg[p] += bu * mix[p];
        });
      });
    });

    var powertrain = [];
    Object.keys(ptAgg).sort().forEach(function (key) {
      var parts = key.split('|');
      ptAgg[key].forEach(function (v, p) {
        var n = Math.round(v);
        if (n > 0) powertrain.push({ quarter: parts[0], region: parts[1], brand: parts[2], powertrain: PTS[p], units: n });
      });
    });
    return { sales: sales, powertrain: powertrain };
  }

  /* 예시 디스플레이 가정: 브랜드별 대당 디스플레이 수와 우리 공급 비중. 지어낸 값입니다.
     일부 브랜드는 지역별 값이 따로 있습니다 (지역 행이 브랜드 행보다 먼저 쓰입니다). */
  var DISPLAY = [
    ['Brand A', '', 3.0, 0.1], ['Brand B', '', 2.6, 0.35], ['Brand C', '', 1.8, 0.2], ['Brand D', '', 2.4, 0.55],
    ['Brand E', '', 2.5, 0.25], ['Brand E', 'CN', 2.5, 0.4], ['Brand F', '', 1.9, 0.15], ['Brand G', '', 2.0, 0.3],
    ['Brand H', '', 1.7, 0.18], ['Brand I', '', 1.8, 0.12], ['Brand J', '', 2.3, 0.28], ['Brand K', '', 1.6, 0.08],
    ['Brand L', '', 2.8, 0.45], ['Brand L', 'EU', 2.8, 0.5], ['기타', '', 1.5, 0.05],
  ];

  function makeDisplay() {
    return DISPLAY.map(function (d) { return { brand: d[0], region: d[1], panelsPerVehicle: d[2], ourShare: d[3] }; });
  }

  sim.sample = { make: make, makeDisplay: makeDisplay, FIRST: FIRST, LAST: LAST };
})(typeof window !== 'undefined' ? window : globalThis);
