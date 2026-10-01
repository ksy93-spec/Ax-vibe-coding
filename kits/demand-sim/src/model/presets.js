/* 예시 카드. "카드 추가 > 예시에서" 메뉴에 나옵니다. 전역 App.sim.presets.
 * 값은 전부 자리표시입니다. 실제 정책 날짜와 크기, 근거를 넣어서 쓰세요.
 * 사내에서 자주 쓰는 카드가 생기면 여기에 더합니다 (prompts/30-new-preset.md).
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var sim = (App.sim = App.sim || {});
  var U = sim.util;
  var S = sim.shocks;

  function firstForecast(ds) {
    return U.addMonths(ds.months[ds.months.length - 1], 1);
  }

  /** BEV 가 있으면 BEV, 없으면 첫 파워트레인 */
  function evCode(ds) {
    return ds.powertrains.indexOf('BEV') >= 0 ? 'BEV' : ds.powertrains[0];
  }

  /** 지역에서 기준 BEV 점유율이 가장 높은 관측 브랜드 */
  function evLeader(ds, bl, region) {
    var pt = evCode(ds);
    var shares = bl.brandShare[region][pt][0];
    var best = ds.brands[0];
    var bestV = -1;
    ds.brands.forEach(function (b, i) {
      if (b === sim.OTHER) return;
      if (shares[i] > bestV) {
        bestV = shares[i];
        best = b;
      }
    });
    return best;
  }

  function base(ds, layer, patch) {
    return Object.assign(S.blank(layer, ds), patch);
  }

  sim.presets = [
    {
      key: 'subsidy-end',
      label: '전기차 보조금 종료 (막차 수요 포함)',
      make: function (ds) {
        return base(ds, 'POWERTRAIN', {
          name: '(예시) 전기차 보조금 종료',
          target: evCode(ds),
          magnitude: { min: -5, mode: -3, max: -1 },
          probability: 0.8,
          start: U.addMonths(firstForecast(ds), 6),
          rampShape: 'step',
          rampMonths: 1,
          pullForward: { months: 3, pct: 15 },
          note: '예시 값. 종료 월, 전기차 비중이 줄어드는 폭(%p), 종료 전 막차 수요를 실제 정책과 과거 사례로 바꾸세요.',
        });
      },
    },
    {
      key: 'co2',
      label: 'CO2 배출 규제 강화 (전기차 공급 확대)',
      make: function (ds) {
        return base(ds, 'POWERTRAIN', {
          name: '(예시) CO2 규제 강화',
          target: evCode(ds),
          magnitude: { min: 1, mode: 2, max: 4 },
          probability: 0.7,
          start: U.addMonths(firstForecast(ds), 4),
          rampShape: 'linear',
          rampMonths: 12,
          note: '예시 값. 규제 연도, 목표 달성을 위한 전기차 비중 확대 폭을 넣으세요.',
        });
      },
    },
    {
      key: 'autonomy',
      label: '자율주행 기능 승인 (브랜드 선호 상승)',
      make: function (ds, bl) {
        var region = ds.regions[0];
        return base(ds, 'BRAND', {
          name: '(예시) 자율주행 기능 승인',
          region: region,
          target: evLeader(ds, bl, region),
          magnitude: { min: 0, mode: 8, max: 20 },
          probability: 0.5,
          start: U.addMonths(firstForecast(ds), 9),
          rampShape: 'scurve',
          rampMonths: 6,
          note: '예시 값. 승인 시점과 승인 뒤 점유율이 지금보다 몇 % 오를지 넣으세요. 늘어난 몫은 같은 차종의 경쟁 브랜드에서 옵니다.',
        });
      },
    },
    {
      key: 'tariff',
      label: '수입 관세 부과 (브랜드 점유율 하락)',
      make: function (ds) {
        return base(ds, 'BRAND', {
          name: '(예시) 수입 관세 부과',
          target: ds.brands[0],
          magnitude: { min: -25, mode: -15, max: -5 },
          probability: 0.6,
          start: U.addMonths(firstForecast(ds), 3),
          rampShape: 'linear',
          rampMonths: 3,
          note: '예시 값. 관세율이 아니라, 가격이 오른 뒤 점유율이 지금보다 몇 % 줄지로 넣습니다.',
        });
      },
    },
    {
      key: 'macro',
      label: '경기 둔화 (시장 판매 일시 감소)',
      make: function (ds) {
        return base(ds, 'TIV', {
          name: '(예시) 경기 둔화',
          magnitude: { min: -6, mode: -3, max: 0 },
          probability: 0.4,
          start: U.addMonths(firstForecast(ds), 2),
          rampShape: 'linear',
          rampMonths: 6,
          holdMonths: 6,
          halfLifeMonths: 6,
          note: '예시 값. 시장 전체 판매 감소율과 회복 속도를 넣으세요.',
        });
      },
    },
    {
      key: 'launch',
      label: '신차 출시 (브랜드 점유율 상승)',
      make: function (ds) {
        return base(ds, 'BRAND', {
          name: '(예시) 신차 출시',
          target: ds.brands[0],
          powertrain: null,
          magnitude: { min: 3, mode: 10, max: 15 },
          probability: 0.9,
          start: U.addMonths(firstForecast(ds), 5),
          rampShape: 'scurve',
          rampMonths: 4,
          note: '예시 값. 출시 월과, 자리 잡은 뒤 점유율이 지금보다 몇 % 오를지 넣으세요.',
        });
      },
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
