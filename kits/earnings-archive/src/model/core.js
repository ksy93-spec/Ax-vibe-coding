/* 기본 상수, 분기 계산, 단위와 환율 환산. DOM 을 쓰지 않습니다. 전역 App.ea.core.
 * 브라우저와 Node 테스트(tests/run.cjs) 양쪽에서 읽힙니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var ea = (App.ea = App.ea || {});

  /** 분기 자료에 들어가는 지표. money 는 발표 통화 백만 단위로 저장하고 화면에서 MUSD 로 바꿉니다. */
  var METRICS = [
    { key: 'revenue', label: '매출', kind: 'money' },
    { key: 'operatingIncome', label: '영업이익', kind: 'money' },
    { key: 'adjOperatingIncome', label: '조정 영업이익', kind: 'money' },
    { key: 'netIncome', label: '순이익(지배)', kind: 'money' },
    { key: 'deliveries', label: '판매 대수', kind: 'count' },
  ];

  /** 하이라이트와 Q&A 주제. 프롬프트도 이 목록을 그대로 씁니다. 바꾸면 기존 자료의 주제가 '기타' 로 보입니다. */
  var TOPICS = ['실적', '가이던스', '전동화', '관세·정책', 'SDV·전장', '지역', '공급망·원가', '주주환원', '기타'];

  var CURRENCIES = ['USD', 'EUR', 'JPY', 'KRW', 'GBP', 'SEK', 'CNY', 'CHF'];

  /** 금액 단위 -> 백만 배수 */
  var MONEY_UNITS = {
    one: 1e-6,
    thousand: 1e-3,
    ten_thousand: 1e-2,
    million: 1,
    hundred_million: 100,
    billion: 1000,
    trillion: 1e6,
  };
  /** 대수 단위 -> 천 대 배수 */
  var COUNT_UNITS = {
    one: 1e-3,
    thousand: 1,
    ten_thousand: 10,
    million: 1000,
  };
  /** 사내 모델이 흔히 쓰는 다른 이름 -> 위 키 */
  var UNIT_ALIASES = {
    units: 'one', unit: 'one', won: 'one', yen: 'one', dollar: 'one', dollars: 'one', '원': 'one', '대': 'one', '円': 'one',
    k: 'thousand', thousands: 'thousand', '천': 'thousand', '千': 'thousand', '천대': 'thousand', 'thousand_units': 'thousand',
    '만': 'ten_thousand', '万': 'ten_thousand',
    m: 'million', mn: 'million', mm: 'million', millions: 'million', '백만': 'million', '百万': 'million', '百万円': 'million', '백만원': 'million',
    '억': 'hundred_million', '億': 'hundred_million', '億円': 'hundred_million', '억원': 'hundred_million', hundred_millions: 'hundred_million',
    b: 'billion', bn: 'billion', billions: 'billion', '십억': 'billion', '십억원': 'billion',
    t: 'trillion', tn: 'trillion', trillions: 'trillion', '조': 'trillion', '兆': 'trillion', '조원': 'trillion', '兆円': 'trillion',
  };

  function normUnit(u) {
    if (u === undefined || u === null || u === '') return null;
    var s = String(u).trim().toLowerCase().replace(/\s+/g, '_');
    if (MONEY_UNITS[s] !== undefined || COUNT_UNITS[s] !== undefined) return s;
    return UNIT_ALIASES[s] || UNIT_ALIASES[String(u).trim()] || null;
  }

  /**
   * 값을 저장 단위로 바꿉니다. money 는 백만, count 는 천 대.
   * @returns {number|null} 단위를 모르면 null
   */
  function toStoreUnit(value, unit, kind) {
    var n = toNumber(value);
    if (n === null) return null;
    var u = normUnit(unit);
    var table = kind === 'count' ? COUNT_UNITS : MONEY_UNITS;
    if (!u || table[u] === undefined) return null;
    return round(n * table[u], 6);
  }

  /** "1,234.5", "(120)", "−3.2" 같은 표기를 숫자로. 못 읽으면 null */
  function toNumber(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (v === null || v === undefined) return null;
    var s = String(v).trim();
    if (!s) return null;
    var neg = false;
    if (/^\(.*\)$/.test(s)) {
      neg = true;
      s = s.slice(1, -1);
    }
    s = s.replace(/[−–—]/g, '-').replace(/[,\s]/g, '');
    if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(s)) return null;
    var n = parseFloat(s);
    if (!isFinite(n)) return null;
    return neg ? -n : n;
  }

  function round(n, digits) {
    var f = Math.pow(10, digits);
    return Math.round(n * f) / f;
  }

  /* ---------- 분기 ---------- */

  /** 여러 표기를 '2026Q3' 로. 못 읽으면 null.
   *  받는 표기: 2026Q3, 2026 Q3, 2026-Q3, Q3 2026, 3Q26, 3Q 2026, 2026년 3분기 */
  function normPeriod(s) {
    if (!s) return null;
    var t = String(s).trim().toUpperCase().replace(/\s+/g, ' ');
    var m;
    if ((m = /^(\d{4})\s*[-_ ]?Q([1-4])$/.exec(t))) return m[1] + 'Q' + m[2];
    if ((m = /^Q([1-4])\s*[-_ ']?\s*(\d{4})$/.exec(t))) return m[2] + 'Q' + m[1];
    if ((m = /^([1-4])Q\s*'?(\d{2}|\d{4})$/.exec(t))) return (m[2].length === 2 ? '20' + m[2] : m[2]) + 'Q' + m[1];
    if ((m = /^(\d{4})년\s*([1-4])분기$/.exec(t))) return m[1] + 'Q' + m[2];
    return null;
  }

  function parsePeriod(p) {
    var m = /^(\d{4})Q([1-4])$/.exec(p || '');
    if (!m) return null;
    return { y: +m[1], q: +m[2] };
  }

  function periodAdd(p, n) {
    var o = parsePeriod(p);
    if (!o) return null;
    var idx = o.y * 4 + (o.q - 1) + n;
    return Math.floor(idx / 4) + 'Q' + ((idx % 4) + 1);
  }

  function comparePeriod(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  /** 날짜가 속한 분기 바로 앞 분기 (마지막으로 끝난 분기) */
  function lastClosedPeriod(date) {
    var d = date || new Date();
    var q = Math.floor(d.getMonth() / 3) + 1;
    return periodAdd(d.getFullYear() + 'Q' + q, -1);
  }

  /** 'YYYYQn' 부터 'YYYYQn' 까지 (양끝 포함, 오래된 것부터) */
  function periodRange(from, to) {
    var out = [];
    var p = from;
    var guard = 0;
    while (p && p <= to && guard++ < 200) {
      out.push(p);
      p = periodAdd(p, 1);
    }
    return out;
  }

  /** 화면 표기. '2026Q3' -> "2026 Q3 (7~9월)" 처럼 짧게는 "2026 Q3" */
  function periodLabel(p, withMonths) {
    var o = parsePeriod(p);
    if (!o) return p || '';
    var s = o.y + ' Q' + o.q;
    if (withMonths) s += ' (' + (o.q * 3 - 2) + '~' + o.q * 3 + '월)';
    return s;
  }

  /**
   * 달력 분기를 회사 회계연도 표기로. fyEnd 는 회계연도 끝 달(12, 3 등).
   * 3월 결산 회사의 2026Q2(4~6월)는 'FY2027 Q1' (2027년 3월에 끝나는 회계연도의 1분기).
   * 회사마다 부르는 법이 달라 제안값으로만 씁니다. 분기 자료의 fiscalLabel 이 있으면 그것이 우선입니다.
   */
  function fiscalOf(p, fyEnd) {
    var o = parsePeriod(p);
    if (!o) return null;
    var end = +fyEnd || 12;
    var month = o.q * 3;
    var after = (month - end + 12) % 12 || 12;
    var fq = Math.ceil(after / 3);
    var fy = month <= end ? o.y : o.y + 1;
    return { fy: fy, fq: fq };
  }
  function fiscalLabel(p, fyEnd) {
    var f = fiscalOf(p, fyEnd);
    if (!f) return '';
    if ((+fyEnd || 12) === 12) return 'Q' + f.fq + ' ' + f.fy;
    return 'FY' + f.fy + ' Q' + f.fq;
  }

  /* ---------- 환율 ---------- */

  /**
   * 분기 평균 환율 (1 USD 당 통화 단위). USD 는 1. 없으면 null.
   * @param {{rates: Object<string, Object<string, number>>}} fx
   */
  function rateFor(fx, currency, period) {
    if (!currency || currency === 'USD') return 1;
    var r = fx && fx.rates && fx.rates[currency] && fx.rates[currency][period];
    var n = toNumber(r);
    return n && n > 0 ? n : null;
  }

  /**
   * 발표 통화 백만 -> 백만 달러. 분기 자료에 fxOverride 가 있으면 그 환율을 씁니다.
   * @returns {{value: number|null, rate: number|null, source: 'usd'|'table'|'override'|'missing'}}
   */
  function toMusd(valueMillions, currency, period, fx, override) {
    var v = toNumber(valueMillions);
    var ov = toNumber(override);
    var rate;
    var source;
    if (!currency || currency === 'USD') {
      rate = 1;
      source = 'usd';
    } else if (ov && ov > 0) {
      rate = ov;
      source = 'override';
    } else {
      rate = rateFor(fx, currency, period);
      source = rate ? 'table' : 'missing';
    }
    if (v === null || !rate) return { value: null, rate: rate, source: source };
    return { value: v / rate, rate: rate, source: source };
  }

  /* ---------- 분기 자료 계산 ---------- */

  function quarterOf(report, period) {
    if (!report || !report.quarters) return null;
    for (var i = 0; i < report.quarters.length; i++) {
      if (report.quarters[i].period === period) return report.quarters[i];
    }
    return null;
  }

  /**
   * 한 분기의 화면용 숫자. 금액은 MUSD, 대수는 천 대, 비율은 %.
   * @returns {{period, currency, fx: {rate, source}, musd: Object, local: Object, deliveries, opMargin, adjMargin, netMargin, missingFx: boolean}}
   */
  function derive(q, company, fx) {
    var currency = (q && q.currency) || (company && company.currency) || 'USD';
    var out = { period: q.period, currency: currency, musd: {}, local: {}, deliveries: null, missingFx: false, fx: null };
    var v = q.values || {};
    METRICS.forEach(function (m) {
      var n = toNumber(v[m.key]);
      if (m.kind === 'count') {
        out.deliveries = n;
        return;
      }
      out.local[m.key] = n;
      var r = toMusd(n, currency, q.period, fx, q.fxOverride);
      out.fx = { rate: r.rate, source: r.source };
      if (n !== null && r.value === null) out.missingFx = true;
      out.musd[m.key] = r.value;
    });
    if (!out.fx) out.fx = { rate: rateFor(fx, currency, q.period), source: 'table' };
    var rev = out.local.revenue;
    function margin(key) {
      var x = out.local[key];
      return rev && x !== null && x !== undefined ? (x / rev) * 100 : null;
    }
    out.opMargin = margin('operatingIncome');
    out.adjMargin = margin('adjOperatingIncome');
    out.netMargin = margin('netIncome');
    return out;
  }

  /** 증감률(%). 이전 값이 0 이하이거나 없으면 null. 적자 전환 같은 경우는 화면에서 따로 적습니다. */
  function growth(curr, prev) {
    if (curr === null || curr === undefined || prev === null || prev === undefined) return null;
    if (!(prev > 0)) return null;
    return (curr / prev - 1) * 100;
  }

  /**
   * 한 회사의 분기 표. 최근 분기부터. 전년 동기 대비(YoY)는 USD 기준이 아니라 발표 통화 기준입니다.
   * 환율 변동이 섞이지 않게 하려는 것입니다.
   */
  function table(report, company, fx) {
    var qs = ((report && report.quarters) || []).slice().sort(function (a, b) {
      return comparePeriod(b.period, a.period);
    });
    return qs.map(function (q) {
      var d = derive(q, company, fx);
      var prev = quarterOf(report, periodAdd(q.period, -4));
      var pd = prev ? derive(prev, company, fx) : null;
      d.yoy = {
        revenue: pd ? growth(d.local.revenue, pd.local.revenue) : null,
        operatingIncome: pd ? growth(d.local.operatingIncome, pd.local.operatingIncome) : null,
        deliveries: pd ? growth(d.deliveries, pd.deliveries) : null,
      };
      d.opMarginPrev = pd ? pd.opMargin : null;
      d.quarter = q;
      return d;
    });
  }

  function latestPeriod(report) {
    var best = null;
    ((report && report.quarters) || []).forEach(function (q) {
      if (!best || q.period > best) best = q.period;
    });
    return best;
  }

  /** 회사 목록에서 id, 이름, 별칭으로 찾기 (대소문자, 공백, 점 무시) */
  function findCompany(companies, key) {
    if (!key) return null;
    var k = String(key).toLowerCase().replace(/[\s.\-_,]/g, '');
    for (var i = 0; i < companies.length; i++) {
      var c = companies[i];
      var names = [c.id, c.name, c.nameKo, c.ticker].concat(c.aliases || []);
      for (var j = 0; j < names.length; j++) {
        if (names[j] && String(names[j]).toLowerCase().replace(/[\s.\-_,]/g, '') === k) return c;
      }
    }
    return null;
  }

  ea.core = {
    METRICS: METRICS,
    TOPICS: TOPICS,
    CURRENCIES: CURRENCIES,
    MONEY_UNITS: MONEY_UNITS,
    COUNT_UNITS: COUNT_UNITS,
    normUnit: normUnit,
    toStoreUnit: toStoreUnit,
    toNumber: toNumber,
    round: round,
    normPeriod: normPeriod,
    parsePeriod: parsePeriod,
    periodAdd: periodAdd,
    comparePeriod: comparePeriod,
    lastClosedPeriod: lastClosedPeriod,
    periodRange: periodRange,
    periodLabel: periodLabel,
    fiscalOf: fiscalOf,
    fiscalLabel: fiscalLabel,
    rateFor: rateFor,
    toMusd: toMusd,
    quarterOf: quarterOf,
    derive: derive,
    growth: growth,
    table: table,
    latestPeriod: latestPeriod,
    findCompany: findCompany,
  };
})(typeof window !== 'undefined' ? window : globalThis);
