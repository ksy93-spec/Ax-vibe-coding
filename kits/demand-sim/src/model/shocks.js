/* 충격 카드: 외생변수 하나의 크기, 대상, 시점을 담습니다. 전역 App.sim.shocks.
 * 카드 형식은 types/sim.d.ts 의 Sim.ShockCard 입니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var sim = (App.sim = App.sim || {});
  var U = sim.util;

  // 화면에 나가는 말. 전문 용어 대신 풀어 쓴 표현을 씁니다.
  var LAYER_LABEL = { TIV: '시장 전체 판매량', POWERTRAIN: '동력원 비중', BRAND: '브랜드 점유율' };
  var LAYER_HELP = {
    TIV: '그 지역에서 팔리는 차 전체가 늘거나 줄어듭니다. 예: 경기 둔화, 금리 변화',
    POWERTRAIN: '전기차, 하이브리드 같은 동력원 비중이 바뀝니다. 예: 보조금 종료, 배출 규제',
    BRAND: '특정 브랜드가 경쟁사 몫을 가져오거나 잃습니다. 예: 자율주행 승인, 관세, 신차 출시',
  };
  var SHAPE_LABEL = { step: '바로', linear: '일정하게', scurve: '천천히 시작해 빨라지게' };
  var PT_LABEL = {
    BEV: '전기차 (BEV)', PHEV: '플러그인 하이브리드 (PHEV)', EREV: '주행거리 연장형 (EREV)', HEV: '하이브리드 (HEV)',
    MHEV: '마일드 하이브리드 (MHEV)', ICE: '내연기관 (ICE)', FCEV: '수소차 (FCEV)', ALL: '전체',
  };

  function ptLabel(code) {
    return PT_LABEL[code] || code;
  }

  function unitOf(layer) {
    return layer === 'POWERTRAIN' ? '%p' : '%';
  }

  /**
   * 월별 발효 강도 0~1.
   * 시작 월부터 rampMonths 개월에 걸쳐 1 에 도달하고 (step 이면 시작 월에 바로 1),
   * holdMonths 개월 유지한 뒤 halfLifeMonths 반감기로 줄어듭니다. 반감기가 없으면 바로 0.
   * holdMonths 가 null 이면 끝까지 1 입니다.
   */
  function curve(card, months) {
    var S = U.monthIndex(card.start);
    var R = card.rampShape === 'step' ? 1 : Math.max(1, Math.round(card.rampMonths || 1));
    var fullStart = S + R - 1;
    var hold = card.holdMonths;
    var hl = card.halfLifeMonths;
    return months.map(function (ym) {
      var m = U.monthIndex(ym);
      if (m < S) return 0;
      if (m < fullStart) {
        var x = (m - S + 1) / R;
        return card.rampShape === 'scurve' ? x * x * (3 - 2 * x) : x;
      }
      if (hold === null || hold === undefined) return 1;
      var k = m - fullStart;
      var H = Math.max(1, Math.round(hold));
      if (k < H) return 1;
      if (hl && hl > 0) return Math.pow(0.5, (k - H + 1) / hl);
      return 0;
    });
  }

  /** 국가 한정 카드의 강도 배율. 최근 12개월 지역 판매 중 지정 국가 비중. */
  function countryWeight(card, ds) {
    var list = card.countries || [];
    if (!list.length) return 1;
    var byCountry = ds.countryUnits[card.region];
    if (!byCountry) return 0;
    var T = ds.months.length;
    var from = Math.max(0, T - 12);
    var sel = 0;
    var all = 0;
    Object.keys(byCountry).forEach(function (c) {
      var brands = card.layer === 'BRAND' ? [card.target] : ds.brands;
      var v = 0;
      brands.forEach(function (b) {
        var a = byCountry[c][b];
        if (!a) return;
        for (var t = from; t < T; t++) v += a[t];
      });
      all += v;
      if (list.indexOf(c) >= 0) sel += v;
    });
    return all > 0 ? sel / all : 0;
  }

  function validate(card, ds, bl) {
    var out = [];
    function err(msg) { out.push({ level: 'error', message: msg }); }
    function warn(msg) { out.push({ level: 'warn', message: msg }); }
    if (ds.regions.indexOf(card.region) < 0) err('데이터에 없는 지역입니다: ' + card.region);
    if (!U.parseMonth(card.start) || U.parseMonth(card.start) !== card.start) err('시작 월을 골라 주세요.');
    var mg = card.magnitude || {};
    if (![mg.min, mg.mode, mg.max].every(function (v) { return typeof v === 'number' && isFinite(v); })) {
      err('영향 크기를 숫자로 넣어 주세요.');
    } else if (!(mg.min <= mg.mode && mg.mode <= mg.max)) {
      err('영향 범위는 "작게 보면 <= 예상 <= 크게 보면" 순서여야 합니다.');
    }
    if (!(card.probability >= 0 && card.probability <= 1)) err('일어날 가능성은 0~100% 사이입니다.');
    if (card.holdMonths !== null && card.holdMonths !== undefined && !(card.holdMonths >= 1)) err('효과가 이어지는 기간은 1개월 이상이어야 합니다.');
    if (card.pullForward && !(card.pullForward.months >= 1)) err('미리 사는 기간은 1개월 이상입니다.');
    if (out.length) return out;

    if (card.layer === 'POWERTRAIN') {
      var pi = ds.powertrains.indexOf(card.target);
      if (ds.powertrains.length === 1 && ds.powertrains[0] === 'ALL') err('동력원(파워트레인) 자료를 넣지 않아 이 카드를 쓸 수 없습니다.');
      else if (pi < 0) err('데이터에 없는 동력원입니다: ' + card.target);
      else if (!bl.ptActive[card.region][pi]) err(card.region + ' 에서 최근 1년 판매가 없는 동력원입니다. 판매가 없는 곳은 카드로 늘릴 수 없습니다.');
    } else if (card.layer === 'BRAND') {
      var bi = ds.brands.indexOf(card.target);
      if (bi < 0) {
        err('관측 브랜드가 아닙니다 (기타로 묶였을 수 있습니다): ' + card.target);
      } else {
        var nests = card.powertrain ? [card.powertrain] : ds.powertrains;
        if (card.powertrain && ds.powertrains.indexOf(card.powertrain) < 0) err('데이터에 없는 동력원입니다: ' + card.powertrain);
        else if (!nests.some(function (p) { return bl.brandActive[card.region][p][bi]; })) {
          err(card.region + ' 에서 ' + card.target + (card.powertrain ? ' ' + card.powertrain : '') + ' 의 최근 1년 판매가 없습니다. 판매가 없는 곳은 카드로 늘릴 수 없습니다.');
        }
      }
    } else if (card.layer !== 'TIV') {
      err('알 수 없는 대상입니다: ' + card.layer);
    }
    if (out.length) return out;

    var first = bl.months[0];
    var lastM = bl.months[bl.months.length - 1];
    if (card.start < first) warn('시작 월이 이미 지난 달입니다. 실적에 이미 나타난 일이라면 두 번 계산됩니다.');
    if (card.start > lastM && !card.pullForward) warn('시작 월이 전망 기간 뒤라 결과에 영향이 없습니다.');
    if ((card.countries || []).length) {
      var w = countryWeight(card, ds);
      if (w === 0) warn('고른 국가의 최근 1년 판매가 없어 영향이 0 입니다.');
    }
    if (card.layer === 'TIV' && mg.min <= -100) err('시장 판매 감소는 -100% 보다 클 수 없습니다.');
    return out;
  }

  var seq = 0;
  function newId() {
    seq += 1;
    return 'c' + Date.now().toString(36) + seq.toString(36);
  }

  function blank(layer, ds) {
    var pts = ds.powertrains;
    var target = '';
    if (layer === 'POWERTRAIN') target = pts.indexOf('BEV') >= 0 ? 'BEV' : pts[0];
    if (layer === 'BRAND') target = ds.brands[0];
    return {
      id: newId(),
      name: '',
      enabled: true,
      region: ds.regions[0],
      countries: [],
      layer: layer,
      target: target,
      powertrain: null,
      magnitude: { min: 0, mode: 0, max: 0 },
      probability: 1,
      start: U.addMonths(ds.months[ds.months.length - 1], 1),
      rampMonths: 3,
      rampShape: 'linear',
      holdMonths: null,
      halfLifeMonths: null,
      pullForward: null,
      note: '',
    };
  }

  function signed(v) {
    var r = Math.round(v * 10) / 10;
    return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r);
  }

  /** 카드를 한 문장으로. 표와 보고서에 그대로 나갑니다. */
  function describe(card) {
    var unit = unitOf(card.layer);
    var mg = card.magnitude;
    var where = card.region + ((card.countries || []).length ? '(' + card.countries.join(', ') + ')' : '');
    var what = card.layer === 'TIV' ? '시장 전체 판매'
      : card.layer === 'POWERTRAIN' ? ptLabel(card.target) + ' 비중'
      : card.target + (card.powertrain ? ' ' + ptLabel(card.powertrain) : '') + ' 점유율';
    var amount = signed(mg.mode) + unit;
    var range = mg.min === mg.max ? '' : ' (범위 ' + signed(mg.min) + ' ~ ' + signed(mg.max) + ')';
    var timing = card.start + '부터 ' + (card.rampShape === 'step' || card.rampMonths <= 1 ? '바로' : card.rampMonths + '개월에 걸쳐') + ' 반영';
    if (card.holdMonths === null || card.holdMonths === undefined) timing += ', 계속 유지';
    else timing += ', ' + card.holdMonths + '개월 뒤 ' + (card.halfLifeMonths ? '서서히 줄어듦' : '사라짐');
    var parts = [where + ' ' + what + ' ' + amount + range, timing];
    if (card.probability < 1) parts.push('가능성 ' + Math.round(card.probability * 100) + '%');
    if (card.pullForward) parts.push('시작 전 ' + card.pullForward.months + '개월 미리 사는 수요 ' + signed(card.pullForward.pct) + '%');
    return parts.join(' · ');
  }

  sim.shocks = {
    LAYER_LABEL: LAYER_LABEL,
    LAYER_HELP: LAYER_HELP,
    SHAPE_LABEL: SHAPE_LABEL,
    ptLabel: ptLabel,
    unitOf: unitOf,
    curve: curve,
    countryWeight: countryWeight,
    validate: validate,
    blank: blank,
    describe: describe,
  };
})(typeof window !== 'undefined' ? window : globalThis);
