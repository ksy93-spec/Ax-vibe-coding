/* 예시 데이터. 시드 고정이라 열 때마다 같습니다. 전역 App.sim.sample.
 * 브랜드 이름은 실제 자동차 업체지만 판매량, 점유율, 디스플레이 가정, 고객 구분은 모두 대략 지어낸 값입니다.
 * 화면과 계산을 확인하는 용도이며 실제 수치로 보고하면 안 됩니다.
 * 사내 CSV 와 같은 모양(월별 판매, 분기별 Powertrain)으로 만들어 두었습니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var sim = (App.sim = App.sim || {});
  var U = sim.util;

  var FIRST = '2023-09';
  var LAST = '2026-08';
  // Powertrain 분기 자료는 한 분기 늦게 나온다고 가정합니다. 2026-Q3 은 없습니다.
  var PT_LAST_QUARTER = '2026-Q2';
  var PTS = ['BEV', 'PHEV', 'HEV', 'ICE'];
  var GENERIC = [0.95, 0.92, 1.08, 0.98, 1.0, 1.02, 0.97, 0.95, 1.02, 1.02, 1.0, 1.09];

  // 지역: 월평균 차량 판매, 연간 성장, 계절(1~12월), 국가 비중, 지역 BEV 추세(연간 로그)
  var REGIONS = {
    CN: { tiv: 2300000, growth: 0.03, season: [0.95, 0.72, 0.95, 0.9, 0.95, 1.02, 0.92, 0.97, 1.05, 1.03, 1.15, 1.39], countries: { CN: 1 }, bev: 0.18 },
    NA: { tiv: 1600000, growth: 0.01, season: [0.8, 0.92, 1.1, 1.05, 1.1, 1.03, 1.0, 1.05, 0.98, 0.97, 0.97, 1.03], countries: { US: 0.84, CA: 0.09, MX: 0.07 }, bev: 0.05 },
    EU: { tiv: 1250000, growth: 0.005, season: [0.88, 0.9, 1.35, 0.95, 1.0, 1.08, 0.97, 0.7, 1.12, 0.98, 0.98, 1.09], countries: { DE: 0.25, FR: 0.17, GB: 0.16, IT: 0.13, ES: 0.08, PL: 0.05, NL: 0.04, BE: 0.04, SE: 0.03, NO: 0.02 }, bev: 0.12 },
    KR: { tiv: 140000, growth: 0.0, season: [0.9, 0.9, 1.05, 1.02, 1.04, 1.08, 0.98, 0.93, 1.0, 1.0, 1.02, 1.08], countries: { KR: 1 }, bev: 0.1 },
    JP: { tiv: 370000, growth: -0.01, season: [0.95, 1.1, 1.45, 0.8, 0.8, 0.95, 1.0, 0.85, 1.12, 0.92, 0.98, 1.08], countries: { JP: 1 }, bev: 0.05 },
    IN: { tiv: 400000, growth: 0.06, season: [1.0, 0.95, 1.05, 0.9, 0.95, 0.95, 0.92, 0.95, 1.05, 1.18, 1.12, 0.98], countries: { IN: 1 }, bev: 0.25 },
    ASEAN: { tiv: 300000, growth: 0.02, season: GENERIC, countries: { ID: 0.28, TH: 0.22, MY: 0.22, VN: 0.15, PH: 0.13 }, bev: 0.2 },
    LATAM: { tiv: 360000, growth: 0.03, season: GENERIC, countries: { BR: 0.62, AR: 0.15, CL: 0.12, CO: 0.11 }, bev: 0.15 },
    MEA: { tiv: 300000, growth: 0.04, season: GENERIC, countries: { SA: 0.25, TR: 0.32, AE: 0.12, ZA: 0.2, EG: 0.11 }, bev: 0.15 },
    ANZ: { tiv: 105000, growth: 0.0, season: GENERIC, countries: { AU: 0.88, NZ: 0.12 }, bev: 0.12 },
    RU: { tiv: 130000, growth: 0.02, season: GENERIC, countries: { RU: 0.85, KZ: 0.15 }, bev: 0.05 },
  };

  // 브랜드: 지역별 시작 점유율(%)과 연간 추세(로그), Powertrain 비중(BEV, PHEV, HEV, ICE)
  var BRANDS = [
    ['Toyota', { CN: [6.5, -0.08], NA: [14, 0.02], EU: [7.5, 0.02], KR: [1.3, 0.02], JP: [46, 0], IN: [6.5, 0.03], ASEAN: [30, -0.02], LATAM: [8, 0.02], MEA: [22, 0], ANZ: [20, 0] }, [0.02, 0.03, 0.42, 0.53]],
    ['Volkswagen', { CN: [11, -0.08], NA: [3.8, 0], EU: [26, 0], KR: [1, 0], JP: [0.6, -0.03], IN: [2, 0], LATAM: [15, 0], MEA: [2, 0], ANZ: [3, 0] }, [0.12, 0.05, 0.03, 0.8]],
    ['Hyundai', { CN: [0.5, -0.1], NA: [6, 0.04], EU: [4.3, 0], KR: [41, 0], JP: [0.1, 0.3], IN: [14, 0], ASEAN: [3, 0.02], LATAM: [6, 0], MEA: [9, 0], ANZ: [6, 0] }, [0.1, 0.03, 0.17, 0.7]],
    ['Kia', { CN: [0.4, -0.05], NA: [4.8, 0.04], EU: [4.1, 0.02], KR: [33, 0.02], IN: [6, 0.03], ASEAN: [1.5, 0], LATAM: [2, 0.02], MEA: [6, 0], ANZ: [6, 0.02] }, [0.09, 0.04, 0.16, 0.71]],
    ['GM', { CN: [4, -0.15], NA: [16.5, 0], KR: [2.5, -0.1], LATAM: [12, -0.02] }, [0.08, 0, 0.02, 0.9]],
    ['Stellantis', { NA: [8.5, -0.06], EU: [15, -0.05], LATAM: [22, 0], MEA: [4, 0] }, [0.05, 0.03, 0.1, 0.82]],
    ['Ford', { CN: [1, -0.1], NA: [12.5, -0.02], EU: [3, -0.08], ASEAN: [3, 0], LATAM: [4, -0.03], MEA: [2, 0], ANZ: [8, 0] }, [0.04, 0.02, 0.1, 0.84]],
    ['Honda', { CN: [3, -0.2], NA: [8.5, 0], EU: [0.5, -0.05], JP: [14, 0], IN: [2, -0.05], ASEAN: [10, -0.02], LATAM: [3, 0] }, [0.02, 0.02, 0.4, 0.56]],
    ['Nissan', { CN: [2.8, -0.15], NA: [5.5, -0.05], EU: [2.2, -0.05], JP: [9, -0.04], ASEAN: [2, -0.05], LATAM: [6, -0.02], MEA: [5, -0.03], ANZ: [3, -0.03] }, [0.04, 0, 0.2, 0.76]],
    ['BYD', { CN: [15, 0.12], EU: [1, 0.5], KR: [0.4, 0.6], JP: [0.1, 0.5], IN: [0.2, 0.5], ASEAN: [3, 0.35], LATAM: [3, 0.4], MEA: [1, 0.3], ANZ: [4, 0.3] }, [0.5, 0.5, 0, 0]],
    ['Tesla', { CN: [2.6, -0.05], NA: [3.4, -0.05], EU: [1.9, -0.12], KR: [3, 0.05], JP: [0.2, 0], ANZ: [3, 0] }, [1, 0, 0, 0]],
    ['BMW', { CN: [3, -0.06], NA: [2.3, 0], EU: [6.8, 0], KR: [4.6, 0], JP: [1, 0] }, [0.16, 0.08, 0.06, 0.7]],
    ['Mercedes-Benz', { CN: [2.6, -0.06], NA: [2.1, -0.02], EU: [5.6, -0.02], KR: [4, -0.02], JP: [1.1, 0] }, [0.12, 0.1, 0.08, 0.7]],
    ['Suzuki', { EU: [1.5, 0], JP: [15, 0.01], IN: [41, -0.02], ASEAN: [5, 0], MEA: [4, 0], ANZ: [3, 0] }, [0, 0, 0.2, 0.8]],
    ['Geely', { CN: [9, 0.12], EU: [2.4, 0.05], KR: [1, 0.03], ASEAN: [5, 0.05], MEA: [3, 0.1], RU: [12, 0.1] }, [0.35, 0.3, 0.05, 0.3]],
    ['Chery', { CN: [6, 0.15], EU: [0.6, 0.6], ASEAN: [2, 0.3], LATAM: [2, 0.2], MEA: [8, 0.15], RU: [15, 0.1] }, [0.12, 0.15, 0.03, 0.7]],
    ['Changan', { CN: [5.5, 0.05], ASEAN: [1, 0.3], MEA: [4, 0.1], RU: [8, 0.1] }, [0.25, 0.25, 0, 0.5]],
    ['SAIC', { CN: [5, -0.05], EU: [2.1, 0.05], IN: [1.5, 0.05], ANZ: [5, 0.03] }, [0.25, 0.15, 0.05, 0.55]],
    ['Renault', { EU: [9.5, 0.02], KR: [3, 0], IN: [1, -0.05], LATAM: [7, -0.02], MEA: [4, 0] }, [0.12, 0.02, 0.2, 0.66]],
    ['Tata', { IN: [13, 0.02] }, [0.07, 0, 0, 0.93]],
    ['Mahindra', { IN: [12, 0.05] }, [0.04, 0, 0, 0.96]],
    ['Mitsubishi', { NA: [0.5, 0], JP: [2.5, 0], ASEAN: [7, 0], MEA: [3, 0], ANZ: [6, -0.02] }, [0.01, 0.06, 0.08, 0.85]],
    ['Mazda', { CN: [0.4, -0.1], NA: [2.5, 0.02], EU: [1.1, 0], JP: [3.5, 0], ASEAN: [2, 0], ANZ: [8, -0.02] }, [0.01, 0.03, 0.15, 0.81]],
    ['Others', {}, [0.05, 0.02, 0.05, 0.88]],
  ];

  // 화면에서 처음 고를 관측 브랜드 12개 (전 지역 판매 상위만으로 고르면 BMW, Tesla 처럼 디스플레이 사업에 중요한 브랜드가 빠집니다)
  var OBSERVED = ['Toyota', 'Volkswagen', 'Hyundai', 'Kia', 'GM', 'Stellantis', 'Ford', 'Honda', 'BYD', 'Tesla', 'BMW', 'Mercedes-Benz'];

  function make() {
    var r = U.rng(20260930);
    function noise(sd) {
      return ((r() + r() + r()) / 3 - 0.5) * 2 * sd * 1.7;
    }
    var months = U.monthRange(FIRST, LAST);
    var sales = [];
    var ptAgg = {};

    Object.keys(REGIONS).forEach(function (rk) {
      var R = REGIONS[rk];
      // 표에 없는 업체 몫(Others): 나머지가 5% 보다 작으면 5%
      var listed = 0;
      BRANDS.forEach(function (B) { if (B[1][rk]) listed += B[1][rk][0]; });
      var others = Math.max(5, 100 - listed);
      months.forEach(function (m, t) {
        var cal = U.monthIndex(m) % 12;
        var years = t / 12;
        var tiv = R.tiv * R.season[cal] * Math.pow(1 + R.growth, years) * (1 + noise(0.02));

        // 북미는 2025-10 부터 BEV 가 꺾이고 직전 석 달에 막차 수요가 있었던 것으로 둡니다 (예시).
        var bevBoost = Math.exp(R.bev * years);
        if (rk === 'NA') {
          if (m >= '2025-07' && m <= '2025-09') bevBoost *= 1.35;
          if (m >= '2025-10') bevBoost *= 0.72;
        }

        var weights = BRANDS.map(function (B) {
          var cfg = B[0] === 'Others' ? [others, 0] : B[1][rk];
          if (!cfg) return 0;
          var w = cfg[0] * Math.exp(cfg[1] * years) * (1 + noise(0.04));
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

          Object.keys(R.countries).forEach(function (c) {
            var v = Math.round(bu * R.countries[c] * (1 + noise(0.03)));
            if (v > 0) sales.push({ month: m, region: rk, country: c, brand: B[0], units: v });
          });

          var q = U.quarterOf(m);
          if (q > PT_LAST_QUARTER) return;
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

  // 예시 디스플레이 가정: [브랜드, 지역('' = 모든 지역), 대당 디스플레이(EA), 브랜드 내 자사 M/S]
  var DISPLAY = [
    ['Toyota', '', 1.9, 0.1], ['Volkswagen', '', 2.4, 0.25], ['Hyundai', '', 2.6, 0.55], ['Kia', '', 2.5, 0.5],
    ['GM', '', 2.3, 0.35], ['Stellantis', '', 1.9, 0.2], ['Ford', '', 2.0, 0.22], ['Honda', '', 1.9, 0.12],
    ['BYD', '', 3.0, 0.05], ['Tesla', '', 1.5, 0.1], ['BMW', '', 2.6, 0.4], ['Mercedes-Benz', '', 3.2, 0.3],
    ['Volkswagen', 'CN', 2.4, 0.15], ['기타', '', 1.7, 0.05],
  ];
  var TIERS = {
    Hyundai: 'strategic', Kia: 'strategic', GM: 'strategic', BMW: 'strategic',
    Volkswagen: 'maintain', Stellantis: 'maintain', Ford: 'maintain', 'Mercedes-Benz': 'maintain',
  };

  function makeDisplay() {
    return DISPLAY.map(function (d) { return { brand: d[0], region: d[1], panelsPerVehicle: d[2], ourShare: d[3] }; });
  }

  function makeTiers() {
    return Object.assign({}, TIERS);
  }

  sim.sample = { make: make, makeDisplay: makeDisplay, makeTiers: makeTiers, OBSERVED: OBSERVED, MAJORS: ['CN', 'NA', 'EU', 'KR', 'JP'], FIRST: FIRST, LAST: LAST };
})(typeof window !== 'undefined' ? window : globalThis);
