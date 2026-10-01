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

  /** 표준 키(NA, EU, CN, KR, JP)에 해당하는 지역. 없으면 첫 지역 */
  function regionFor(ds, key) {
    var hit = ds.regions.filter(function (r) { return sim.geo.regionKey(r) === key; })[0];
    return hit || ds.regions[0];
  }

  /** 이름이 있으면 그 OEM, 없으면 대신할 OEM */
  function brandFor(ds, names, fallback) {
    for (var i = 0; i < names.length; i++) if (ds.brands.indexOf(names[i]) >= 0) return names[i];
    return fallback;
  }

  function base(ds, layer, patch) {
    return Object.assign(S.blank(layer, ds), patch);
  }

  sim.presets = [
    {
      key: 'subsidy-end',
      label: 'EV 보조금 종료 (Pull-forward 포함)',
      make: function (ds) {
        return base(ds, 'POWERTRAIN', {
          name: '(예시) 북미 EV 보조금 종료',
          region: regionFor(ds, 'NA'),
          target: evCode(ds),
          magnitude: { min: -5, mode: -3, max: -1 },
          probability: 0.8,
          start: U.addMonths(firstForecast(ds), 6),
          rampShape: 'step',
          rampMonths: 1,
          pullForward: { months: 3, pct: 15 },
          note: '예시 값. 종료 월, BEV 비중 감소 폭(%p), 종료 전 Pull-forward 를 실제 정책과 과거 사례로 바꾸세요.',
        });
      },
    },
    {
      key: 'co2',
      label: 'CO2 규제 강화 (BEV 비중 확대)',
      make: function (ds) {
        return base(ds, 'POWERTRAIN', {
          name: '(예시) 유럽 CO2 규제 강화',
          region: regionFor(ds, 'EU'),
          target: evCode(ds),
          magnitude: { min: 1, mode: 2, max: 4 },
          probability: 0.7,
          start: U.addMonths(firstForecast(ds), 4),
          rampShape: 'linear',
          rampMonths: 12,
          note: '예시 값. 규제 연도와 목표 달성을 위한 BEV 비중 확대 폭(%p)을 넣으세요.',
        });
      },
    },
    {
      key: 'autonomy',
      label: '자율주행 승인 (OEM M/S 상승)',
      make: function (ds, bl) {
        var region = regionFor(ds, 'CN');
        return base(ds, 'BRAND', {
          name: '(예시) 중국 자율주행(FSD) 승인',
          region: region,
          target: brandFor(ds, ['Tesla'], evLeader(ds, bl, region)),
          magnitude: { min: 0, mode: 8, max: 20 },
          probability: 0.5,
          start: U.addMonths(firstForecast(ds), 9),
          rampShape: 'scurve',
          rampMonths: 6,
          note: '예시 값. 승인 시점과 승인 뒤 M/S 상승률(현재 M/S 대비 %)을 넣으세요. 늘어난 몫은 같은 Powertrain 의 경쟁 OEM 에서 옵니다.',
        });
      },
    },
    {
      key: 'tariff',
      label: '수입 관세 (OEM M/S 하락)',
      make: function (ds) {
        return base(ds, 'BRAND', {
          name: '(예시) 유럽 중국산 EV 관세',
          region: regionFor(ds, 'EU'),
          target: brandFor(ds, ['BYD'], ds.brands[0]),
          magnitude: { min: -25, mode: -15, max: -5 },
          probability: 0.6,
          start: U.addMonths(firstForecast(ds), 3),
          rampShape: 'linear',
          rampMonths: 3,
          note: '예시 값. 관세율이 아니라 가격 인상 뒤 M/S 감소율(현재 M/S 대비 %)로 넣습니다.',
        });
      },
    },
    {
      key: 'macro',
      label: '경기 둔화 (시장 TAM 일시 감소)',
      make: function (ds) {
        return base(ds, 'TIV', {
          name: '(예시) 중국 경기 둔화',
          region: regionFor(ds, 'CN'),
          magnitude: { min: -6, mode: -3, max: 0 },
          probability: 0.4,
          start: U.addMonths(firstForecast(ds), 2),
          rampShape: 'linear',
          rampMonths: 6,
          holdMonths: 6,
          halfLifeMonths: 6,
          note: '예시 값. 시장 TAM 감소율과 회복 속도를 넣으세요.',
        });
      },
    },
    {
      key: 'launch',
      label: '신차 출시 (OEM M/S 상승)',
      make: function (ds) {
        return base(ds, 'BRAND', {
          name: '(예시) 북미 신차 출시',
          region: regionFor(ds, 'NA'),
          target: brandFor(ds, ['Hyundai'], ds.brands[0]),
          powertrain: null,
          magnitude: { min: 3, mode: 10, max: 15 },
          probability: 0.9,
          start: U.addMonths(firstForecast(ds), 5),
          rampShape: 'scurve',
          rampMonths: 4,
          note: '예시 값. 출시 월과 안정기 M/S 상승률(현재 M/S 대비 %)을 넣으세요.',
        });
      },
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
