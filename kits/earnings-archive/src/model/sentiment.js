/* 실적 콜 센티먼트 점수. 요인 8개를 0~10점으로 매기고 종합 점수를 계산합니다. DOM 을 쓰지 않습니다.
 * 전역 App.ea.sentiment.
 *
 * 점수는 사내 모델이 매기고(model), 사람이 고칠 수 있습니다(manual). 화면은 manual 이 있으면 그것을 씁니다.
 * 종합 점수는 모델이 아니라 index() 가 요인 점수의 가중 평균으로 계산합니다.
 * 가중치를 바꾸면 과거 분기까지 같은 식으로 다시 계산됩니다.
 *
 * 분기 자료에 붙는 모양 (Quarter.sentiment)
 *   { model: { volume: { score: 3, direction: '하향', reason: '...', quote: '...' }, ... },
 *     manual: { volume: 4 }, summary: '한 줄 총평', scoredAt: 'YYYY-MM-DD HH:MM:SS' }
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var ea = (App.ea = App.ea || {});
  var C = ea.core;

  /** 요인. key 는 저장 이름이라 바꾸지 않습니다. 순서가 곧 화면 순서입니다. */
  var FACTORS = [
    { key: 'volume', label: '판매량 가이던스', hint: '판매, 인도, 생산 대수 전망' },
    { key: 'revenue', label: '매출 가이던스', hint: '매출 전망, 성장률' },
    { key: 'profit', label: '수익성 가이던스', hint: '영업이익률, EBIT, 이익 전망' },
    { key: 'capex', label: '투자 가이던스', hint: '설비투자, 연구개발비, 현금흐름 전망. 투자 축소로 현금흐름이 좋아지면 높게' },
    { key: 'supply', label: '공급망', hint: '부품 수급, 반도체, 생산 차질' },
    { key: 'materialsFx', label: '원자재·환율', hint: '원자재 가격, 배터리 원가, 환율 영향' },
    { key: 'demandPrice', label: '수요·가격', hint: '주문, 재고, 가격, 인센티브(할인)' },
    { key: 'tariffPolicy', label: '관세·정책', hint: '관세, 보조금, 배출 규제' },
  ];

  /** 종합 점수 가중치. 모두 1 이면 단순 평균입니다. 바꾸려면 이 숫자만 고칩니다. */
  var WEIGHTS = { volume: 1, revenue: 1, profit: 1, capex: 1, supply: 1, materialsFx: 1, demandPrice: 1, tariffPolicy: 1 };

  // 처음 값. configure() 가 설정 파일(data/settings.js)의 이름, 설명, 가중치로 덮었다가 되돌릴 때 씁니다.
  var DEFAULTS = FACTORS.map(function (f) { return { key: f.key, label: f.label, hint: f.hint }; });
  var DEFAULT_WEIGHTS = Object.assign({}, WEIGHTS);

  /**
   * 관리 탭에서 고친 요인 이름, 설명, 가중치를 적용합니다. 빈 값은 처음 값으로 둡니다.
   * FACTORS, WEIGHTS 객체를 그 자리에서 바꾸므로 다른 파일이 들고 있는 참조도 같이 바뀝니다.
   * @param {{factors?: Object<string, {label?: string, hint?: string}>, weights?: Object<string, number>}} cfg
   */
  function configure(cfg) {
    var c = cfg || {};
    var fs = c.factors || {};
    var ws = c.weights || {};
    FACTORS.forEach(function (f, i) {
      var d = DEFAULTS[i];
      var o = fs[f.key] || {};
      f.label = String(o.label || '').trim() || d.label;
      f.hint = String(o.hint || '').trim() || d.hint;
      var w = C.toNumber(ws[f.key]);
      WEIGHTS[f.key] = w !== null && w >= 0 ? w : DEFAULT_WEIGHTS[f.key];
    });
  }

  /** 점수 눈금. 프롬프트에 그대로 들어갑니다. */
  var SCALE = [
    '0~2: 크게 악화 (가이던스 큰 폭 하향이나 철회, 심각한 차질)',
    '3~4: 악화 (소폭 하향, 범위 하단으로 좁힘, 부담 증가)',
    '5: 중립 (유지, 변화 없음, 좋고 나쁨이 비슷함)',
    '6~7: 개선 (소폭 상향, 범위 상단으로 좁힘, 부담 감소)',
    '8~10: 크게 개선 (큰 폭 상향, 뚜렷한 호전)',
    '언급 없음: score 를 null 로, direction 을 "언급 없음" 으로. 5 를 주지 않는다',
  ];

  var DIRECTIONS = ['상향', '유지', '하향', '언급 없음'];
  var DIR_ALIASES = {
    up: '상향', raised: '상향', raise: '상향', improve: '상향', improved: '상향', '개선': '상향', '상승': '상향',
    flat: '유지', maintained: '유지', unchanged: '유지', neutral: '유지', '중립': '유지',
    down: '하향', lowered: '하향', cut: '하향', worse: '하향', '악화': '하향', '하락': '하향',
    none: '언급 없음', 'n/a': '언급 없음', na: '언급 없음', '없음': '언급 없음',
  };

  function factorOf(k) {
    if (!k) return null;
    var s = String(k).trim();
    var loose = s.toLowerCase().replace(/[\s·_\-./]/g, '');
    for (var i = 0; i < FACTORS.length; i++) {
      var f = FACTORS[i];
      if (f.key.toLowerCase() === loose || f.label.replace(/[\s·./]/g, '') === s.replace(/[\s·./]/g, '')) return f;
    }
    return null;
  }

  function normDirection(d) {
    var s = String(d || '').trim();
    if (DIRECTIONS.indexOf(s) >= 0) return s;
    return DIR_ALIASES[s.toLowerCase()] || null;
  }

  /**
   * 사내 모델 답을 검사합니다. scores 는 배열 [{factor, score, direction, reason, quote}] 또는 객체 {volume: {...}} 둘 다 받습니다.
   * @returns {{ok: boolean, errors: string[], warnings: string[], sentiment: object|null}}
   */
  function read(obj, ctx) {
    var errors = [];
    var warnings = [];
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return { ok: false, errors: ['JSON 객체({ ... })가 아님'], warnings: warnings, sentiment: null };
    }
    if (ctx && ctx.company && obj.company) {
      var c = C.findCompany(ctx.companies || [], obj.company);
      if (!c || c.id !== ctx.company) errors.push('답의 회사(' + obj.company + ')가 고른 회사(' + ctx.company + ')와 다름');
    }
    if (ctx && ctx.period && obj.period && C.normPeriod(obj.period) !== ctx.period) {
      warnings.push('답의 분기(' + obj.period + ')가 고른 분기(' + ctx.period + ')와 달라 고른 분기로 넣음');
    }
    var list = [];
    var src = obj.scores || obj.factors || [];
    if (Array.isArray(src)) list = src;
    else if (typeof src === 'object') {
      Object.keys(src).forEach(function (k) {
        list.push(Object.assign({ factor: k }, src[k]));
      });
    }
    var model = {};
    list.forEach(function (x, i) {
      if (!x || typeof x !== 'object') return;
      var f = factorOf(x.factor || x.key);
      if (!f) {
        warnings.push('scores[' + i + '] 요인 "' + (x.factor || x.key) + '" 를 몰라 뺌');
        return;
      }
      if (model[f.key]) {
        warnings.push(f.label + ' 가 두 번 와서 처음 것만 씀');
        return;
      }
      var dir = normDirection(x.direction);
      var score = x.score === null || x.score === undefined || x.score === '' ? null : C.toNumber(x.score);
      if (dir === '언급 없음') score = null;
      if (score !== null) {
        if (score < 0 || score > 10) {
          errors.push(f.label + ' 점수 ' + score + ' 가 0~10 밖');
          return;
        }
        score = Math.round(score);
      }
      var reason = String(x.reason || '').trim();
      if (score !== null && !reason) {
        errors.push(f.label + ' 점수에 근거(reason)가 없음');
        return;
      }
      if (!dir) {
        dir = score === null ? '언급 없음' : score >= 6 ? '상향' : score <= 4 ? '하향' : '유지';
        if (x.direction) warnings.push(f.label + ' 방향 "' + x.direction + '" 을 몰라 점수로 정함');
      }
      if (score !== null && ((dir === '상향' && score < 5) || (dir === '하향' && score > 5))) {
        warnings.push(f.label + ' 방향(' + dir + ')과 점수(' + score + ')가 어긋남. 확인 필요');
      }
      model[f.key] = { score: score, direction: dir, reason: reason, quote: String(x.quote || '').trim() };
    });
    FACTORS.forEach(function (f) {
      if (!model[f.key]) model[f.key] = { score: null, direction: '언급 없음', reason: '', quote: '' };
    });
    var scored = FACTORS.filter(function (f) { return model[f.key].score !== null; }).length;
    if (!scored) errors.push('점수가 매겨진 요인이 하나도 없음');
    return {
      ok: !errors.length,
      errors: errors,
      warnings: warnings,
      sentiment: errors.length ? null : { model: model, manual: {}, summary: String(obj.summary || '').trim(), scoredAt: '' },
    };
  }

  /** 화면에 쓸 요인 점수. 사람이 고친 점수가 우선입니다. {volume: {score, source: 'manual'|'model'|null}} */
  function effective(sent) {
    var out = {};
    FACTORS.forEach(function (f) {
      var m = sent && sent.manual && sent.manual[f.key];
      var mv = m === null || m === undefined || m === '' ? null : C.toNumber(m);
      var md = sent && sent.model && sent.model[f.key] ? sent.model[f.key].score : null;
      if (mv !== null) out[f.key] = { score: mv, source: 'manual' };
      else if (md !== null && md !== undefined) out[f.key] = { score: md, source: 'model' };
      else out[f.key] = { score: null, source: null };
    });
    return out;
  }

  /** 종합 점수: 점수가 있는 요인만 가중 평균. 하나도 없으면 null. */
  function index(sent, weights) {
    var w = weights || WEIGHTS;
    var e = effective(sent);
    var sum = 0;
    var wsum = 0;
    FACTORS.forEach(function (f) {
      var s = e[f.key].score;
      var k = w[f.key] === undefined ? 1 : +w[f.key];
      if (s === null || !(k > 0)) return;
      sum += s * k;
      wsum += k;
    });
    return wsum ? C.round(sum / wsum, 1) : null;
  }

  /** 5단계 색 구간. 0~2, 3~4, 5, 6~7, 8~10. 종합 점수(소수)는 반올림해서 구간을 정합니다 (4.9 는 중립). */
  function band(score) {
    if (score === null || score === undefined) return 'none';
    score = Math.round(score);
    if (score <= 2) return 'neg2';
    if (score < 5) return 'neg1';
    if (score < 6) return 'mid';
    if (score < 8) return 'pos1';
    return 'pos2';
  }

  ea.sentiment = {
    FACTORS: FACTORS,
    WEIGHTS: WEIGHTS,
    DEFAULTS: DEFAULTS,
    DEFAULT_WEIGHTS: DEFAULT_WEIGHTS,
    configure: configure,
    SCALE: SCALE,
    DIRECTIONS: DIRECTIONS,
    factorOf: factorOf,
    read: read,
    effective: effective,
    index: index,
    band: band,
  };
})(typeof window !== 'undefined' ? window : globalThis);
