/* 지역 이름 -> 지도 위 나라(ISO2) 찾기. 전역 App.sim.geo.
 *
 * 사내 데이터의 지역 값(예: 'NA', 'North America', '북미')과 국가 값(예: 'US', 'USA', 'United States', '미국')을
 * 지도에 칠할 나라 목록으로 바꿉니다. 국가 열이 있으면 국가 값을 먼저 쓰고, 못 찾으면 지역 별칭을 씁니다.
 * 별칭이 모자라면 REGION_ALIASES 에 더합니다 (prompts/10-column-names.md 와 같은 요령).
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var sim = (App.sim = App.sim || {});

  var EUROPE = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'NO', 'CH', 'IS'];

  // 비교할 때는 소문자로 바꾸고 공백, 밑줄, 하이픈, 마침표를 지웁니다.
  var REGION_ALIASES = {
    'na': ['US', 'CA', 'MX'], 'northamerica': ['US', 'CA', 'MX'], '북미': ['US', 'CA', 'MX'], '북아메리카': ['US', 'CA', 'MX'], 'usmca': ['US', 'CA', 'MX'], 'nafta': ['US', 'CA', 'MX'],
    'eu': EUROPE, 'europe': EUROPE, '유럽': EUROPE, 'eu27': EUROPE, 'eur': EUROPE, 'westerneurope': EUROPE, '서유럽': EUROPE, 'eu+efta+uk': EUROPE, 'euefta': EUROPE,
    'cn': ['CN'], 'china': ['CN'], '중국': ['CN'], 'prc': ['CN'],
    'kr': ['KR'], 'korea': ['KR'], 'southkorea': ['KR'], '한국': ['KR'], '국내': ['KR'], '내수': ['KR'],
    'jp': ['JP'], 'japan': ['JP'], '일본': ['JP'],
    'in': ['IN'], 'india': ['IN'], '인도': ['IN'],
    'asean': ['ID', 'TH', 'MY', 'VN', 'PH', 'SG'], 'sea': ['ID', 'TH', 'MY', 'VN', 'PH', 'SG'], '동남아': ['ID', 'TH', 'MY', 'VN', 'PH', 'SG'], '아세안': ['ID', 'TH', 'MY', 'VN', 'PH', 'SG'],
    'latam': ['BR', 'AR', 'CL', 'CO', 'PE'], 'southamerica': ['BR', 'AR', 'CL', 'CO', 'PE'], '중남미': ['BR', 'AR', 'CL', 'CO', 'PE', 'MX'], '남미': ['BR', 'AR', 'CL', 'CO', 'PE'],
    'mea': ['SA', 'AE', 'TR', 'IL', 'EG', 'ZA'], 'middleeast': ['SA', 'AE', 'TR', 'IL', 'QA', 'KW'], '중동': ['SA', 'AE', 'TR', 'IL', 'QA', 'KW'],
    'oceania': ['AU', 'NZ'], '오세아니아': ['AU', 'NZ'], 'anz': ['AU', 'NZ'],
    'russia': ['RU'], 'cis': ['RU', 'KZ', 'UZ', 'BY'], '러시아': ['RU'],
  };

  // 국가 이름표에 없는 흔한 표기
  var COUNTRY_EXTRA = { 'uk': 'GB', 'usa': 'US', 'america': 'US', '한국': 'KR', '남한': 'KR', 'korea': 'KR', 'uae': 'AE', 'holland': 'NL' };

  // 화면에 붙일 쉬운 이름. 없으면 데이터 값을 그대로 씁니다.
  var REGION_NAME = {
    'na': '북미', 'northamerica': '북미', 'eu': '유럽', 'europe': '유럽', 'cn': '중국', 'china': '중국',
    'kr': '한국', 'korea': '한국', 'southkorea': '한국', 'jp': '일본', 'japan': '일본', 'in': '인도', 'india': '인도',
    'asean': '동남아', 'sea': '동남아', 'latam': '중남미', 'southamerica': '남미', 'mea': '중동·아프리카', 'middleeast': '중동',
    'oceania': '오세아니아', 'anz': '오세아니아', 'russia': '러시아', 'cis': 'CIS',
  };

  /** 'NA' -> '북미 (NA)', '북미' -> '북미' */
  function regionLabel(region) {
    var n = REGION_NAME[norm(region)];
    if (!n || n === region) return region;
    return n + ' (' + region + ')';
  }

  function regionShort(region) {
    return REGION_NAME[norm(region)] || region;
  }

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[\s_\-.]/g, '');
  }

  var index = null;
  function buildIndex() {
    index = {};
    (sim.countryTable || []).forEach(function (row) {
      var a2 = row[0];
      index[norm(a2)] = a2;
      index[norm(row[1])] = a2;
      row[2].concat(row[3]).forEach(function (n) {
        if (!(norm(n) in index)) index[norm(n)] = a2;
      });
    });
    Object.keys(COUNTRY_EXTRA).forEach(function (k) { index[k] = COUNTRY_EXTRA[k]; });
  }

  /** 국가 값 하나 -> ISO2. 못 찾으면 null */
  function country(v) {
    if (!index) buildIndex();
    return index[norm(v)] || null;
  }

  function alias(v) {
    return REGION_ALIASES[norm(v)] || null;
  }

  /**
   * 지역 하나의 지도 나라 목록.
   * @param {string} region 데이터의 지역 값
   * @param {string[]} countryValues 그 지역의 국가 값들 (국가 열이 없으면 [region])
   * @returns {string[]} ISO2. 못 찾으면 빈 배열
   */
  function regionCountries(region, countryValues) {
    var out = [];
    function add(list) {
      (list || []).forEach(function (c) { if (c && out.indexOf(c) < 0) out.push(c); });
    }
    (countryValues || []).forEach(function (c) {
      if (norm(c) === norm(region)) {
        // 국가 열이 없어서 국가 값이 지역 값과 같은 경우. 'NA'(북미)를 나미비아로 읽지 않도록 별칭을 먼저 봅니다.
        add(alias(c) || [country(c)]);
      } else {
        var a2 = country(c);
        add(a2 ? [a2] : alias(c));
      }
    });
    if (!out.length) add(alias(region) || [country(region)]);
    return out;
  }

  sim.geo = { REGION_ALIASES: REGION_ALIASES, country: country, regionCountries: regionCountries, regionLabel: regionLabel, regionShort: regionShort };
})(typeof window !== 'undefined' ? window : globalThis);
