/* 입력 CSV 정리와 실적 데이터셋 만들기. 전역 App.sim.prep.
 *
 * 월별 판매(지역, 국가, 브랜드)와 분기별 파워트레인 판매를 받아
 * "지역 x 브랜드 x 파워트레인 x 월" 실적으로 만듭니다.
 * 월별 브랜드 합계는 그대로 두고, 분기 파워트레인 비중으로 나눕니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var sim = (App.sim = App.sim || {});
  var U = sim.util;

  var TOTAL = (sim.TOTAL = '전체');
  var OTHER = (sim.OTHER = '기타');
  var ALL_PT = 'ALL';

  /* 표준 필드와 CSV 열 이름 후보. 앞에서부터 대소문자, 공백, 밑줄을 무시하고 비교합니다.
     사내 파일의 열 이름이 여기 없으면 화면의 열 지정에서 고르거나 이 목록에 더합니다. */
  var ALIASES = {
    sales: {
      month: ['month', 'yyyymm', 'yearmonth', 'salesmonth', 'period', 'date', '월', '기간', '년월', '판매월'],
      region: ['region', 'salesregion', '지역', '권역', '판매지역'],
      country: ['country', 'salescountry', 'nation', '국가', '판매국가'],
      brand: ['brand', 'salesbrand', 'make', 'oem', 'maker', '브랜드', '제조사'],
      units: ['units', 'volume', 'salesvolume', 'sales', 'qty', 'quantity', 'registrations', '판매량', '대수', '수량'],
    },
    powertrain: {
      quarter: ['quarter', 'period', 'yyyyq', 'month', 'date', '분기', '기간'],
      region: ['region', 'salesregion', '지역', '권역', '판매지역'],
      brand: ['brand', 'salesbrand', 'make', 'oem', 'maker', '브랜드', '제조사'],
      powertrain: ['powertrain', 'pt', 'xev', 'fueltype', 'fuel', 'propulsion', '파워트레인', '동력원', '연료'],
      units: ['units', 'volume', 'salesvolume', 'sales', 'qty', 'quantity', '판매량', '대수', '수량'],
    },
  };
  var REQUIRED = {
    sales: ['month', 'region', 'brand', 'units'],
    powertrain: ['quarter', 'region', 'brand', 'powertrain', 'units'],
  };

  function norm(s) {
    return String(s).toLowerCase().replace(/[\s_\-.()]/g, '');
  }

  function detectColumns(columns, kind) {
    var aliases = ALIASES[kind];
    var mapping = {};
    var used = {};
    Object.keys(aliases).forEach(function (field) {
      mapping[field] = null;
      var cands = aliases[field];
      for (var i = 0; i < cands.length && !mapping[field]; i++) {
        for (var j = 0; j < columns.length; j++) {
          if (!used[columns[j]] && norm(columns[j]) === cands[i]) {
            mapping[field] = columns[j];
            used[columns[j]] = true;
            break;
          }
        }
      }
    });
    var missing = REQUIRED[kind].filter(function (f) {
      return !mapping[f];
    });
    return { mapping: mapping, missing: missing };
  }

  function cleanLabel(v) {
    return String(v == null ? '' : v).trim();
  }

  function normalizeSales(records, mapping) {
    var rows = [];
    var bad = 0;
    var firstBad = '';
    records.forEach(function (rec, i) {
      var month = U.parseMonth(rec[mapping.month]);
      var region = cleanLabel(rec[mapping.region]);
      var brand = cleanLabel(rec[mapping.brand]);
      var units = U.parseNumber(rec[mapping.units]);
      var country = mapping.country ? cleanLabel(rec[mapping.country]) : '';
      if (!month || !region || !brand || !isFinite(units)) {
        bad++;
        if (!firstBad) firstBad = (i + 2) + '행';
        return;
      }
      rows.push({ month: month, region: region, country: country || region, brand: brand, units: units });
    });
    var notes = [];
    if (bad) notes.push({ level: 'warn', message: '월별 판매에서 읽지 못한 행 ' + bad + '개를 건너뛰었습니다 (처음: ' + firstBad + ').' });
    if (!mapping.country) notes.push({ level: 'info', message: '월별 판매에 국가 열이 없어 국가 한정 카드는 지역 전체로 적용됩니다.' });
    return { rows: rows, notes: notes };
  }

  function normalizePowertrain(records, mapping) {
    var rows = [];
    var bad = 0;
    var firstBad = '';
    records.forEach(function (rec, i) {
      var q = U.parseQuarter(rec[mapping.quarter]);
      var region = cleanLabel(rec[mapping.region]);
      var brand = cleanLabel(rec[mapping.brand]);
      var pt = cleanLabel(rec[mapping.powertrain]).toUpperCase();
      var units = U.parseNumber(rec[mapping.units]);
      if (!q || !region || !brand || !pt || !isFinite(units)) {
        bad++;
        if (!firstBad) firstBad = (i + 2) + '행';
        return;
      }
      rows.push({ quarter: q, region: region, brand: brand, powertrain: pt, units: units });
    });
    var notes = [];
    if (bad) notes.push({ level: 'warn', message: '파워트레인 자료에서 읽지 못한 행 ' + bad + '개를 건너뛰었습니다 (처음: ' + firstBad + ').' });
    return { rows: rows, notes: notes };
  }

  function lastMonthOf(rows) {
    var last = null;
    rows.forEach(function (r) {
      if (!last || r.month > last) last = r.month;
    });
    return last;
  }

  function rankBrands(rows) {
    var last = lastMonthOf(rows);
    if (!last) return [];
    var from = U.addMonths(last, -11);
    var tot = {};
    rows.forEach(function (r) {
      if (!(r.brand in tot)) tot[r.brand] = 0;
      if (r.month >= from) tot[r.brand] += r.units;
    });
    return Object.keys(tot)
      .map(function (b) { return { brand: b, units: tot[b] }; })
      .sort(function (a, b) { return b.units - a.units || (a.brand < b.brand ? -1 : 1); });
  }

  /**
   * 한 (지역, 브랜드) 의 월별 합계를 파워트레인으로 나눕니다.
   * 1) 분기 비중을 분기 가운데 달에 두고 달 사이를 선형 보간해 시작값을 만듭니다.
   * 2) 행(월 합계)과 열(분기별 파워트레인 합계)을 번갈아 맞춥니다 (IPF).
   * 결과는 월 합계와 정확히 같고, 분기 안 파워트레인 합계는 분기 비중과 같습니다.
   * @param {number[]} monthly  months 길이
   * @param {string[]} months
   * @param {Object<string, number[]>} mixByQuarter  분기 -> 파워트레인 비중 (합 1)
   * @param {number} nPt
   * @returns {number[][]} [pt][t]
   */
  function splitByMix(monthly, months, mixByQuarter, nPt) {
    var T = months.length;
    var quarters = months.map(U.quarterOf);
    var out = [];
    var p, t, k;
    for (p = 0; p < nPt; p++) out.push(U.zeros(T));

    // 분기 가운데 달의 인덱스와 비중
    var anchors = [];
    var qSeen = {};
    for (t = 0; t < T; t++) {
      var q = quarters[t];
      if (qSeen[q]) continue;
      qSeen[q] = true;
      var mid = U.monthIndex(U.quarterMonths(q)[1]) - U.monthIndex(months[0]);
      anchors.push({ at: mid, mix: mixByQuarter[q] });
    }

    function seedAt(t) {
      var prev = null;
      var next = null;
      for (var a = 0; a < anchors.length; a++) {
        if (anchors[a].at <= t) prev = anchors[a];
        if (anchors[a].at >= t && !next) next = anchors[a];
      }
      if (!prev) return next.mix;
      if (!next || next === prev) return prev.mix;
      var w = (t - prev.at) / (next.at - prev.at);
      var m = [];
      for (var i = 0; i < nPt; i++) {
        // 한쪽 분기에서 0 인 파워트레인은 보간해도 0 으로 둡니다. 없는 차종이 새로 생기지 않게.
        m.push(prev.mix[i] === 0 || next.mix[i] === 0 ? 0 : prev.mix[i] * (1 - w) + next.mix[i] * w);
      }
      return m;
    }

    for (t = 0; t < T; t++) {
      var s = seedAt(t);
      // 앞뒤 분기의 차종이 완전히 달라 보간값이 전부 0 이면 그 달 분기 비중을 그대로 씁니다.
      if (U.sum(s) <= 0) s = mixByQuarter[quarters[t]];
      for (p = 0; p < nPt; p++) out[p][t] = monthly[t] * s[p];
    }

    // 분기별 열 목표
    var groups = {};
    for (t = 0; t < T; t++) {
      (groups[quarters[t]] = groups[quarters[t]] || []).push(t);
    }
    Object.keys(groups).forEach(function (q) {
      var ts = groups[q];
      var mix = mixByQuarter[q];
      var totalQ = 0;
      ts.forEach(function (tt) { totalQ += monthly[tt]; });
      var colTarget = [];
      for (p = 0; p < nPt; p++) colTarget.push(totalQ * mix[p]);
      for (var iter = 0; iter < 60; iter++) {
        var maxErr = 0;
        // 열 맞추기
        for (p = 0; p < nPt; p++) {
          var cs = 0;
          ts.forEach(function (tt) { cs += out[p][tt]; });
          if (cs > 0) {
            var f = colTarget[p] / cs;
            ts.forEach(function (tt) { out[p][tt] *= f; });
          }
        }
        // 행 맞추기
        ts.forEach(function (tt) {
          var rs = 0;
          for (k = 0; k < nPt; k++) rs += out[k][tt];
          if (rs > 0) {
            var g = monthly[tt] / rs;
            for (k = 0; k < nPt; k++) out[k][tt] *= g;
          }
        });
        for (p = 0; p < nPt; p++) {
          var cs2 = 0;
          ts.forEach(function (tt) { cs2 += out[p][tt]; });
          maxErr = Math.max(maxErr, Math.abs(cs2 - colTarget[p]));
        }
        if (maxErr < 1e-7 * Math.max(1, totalQ)) break;
      }
    });
    return out;
  }

  function buildDataset(sales, powertrain, opts) {
    if (!sales.length) throw new Error('월별 판매 자료가 비어 있습니다.');
    var notes = [];
    var keep = {};
    (opts.brands || []).forEach(function (b) { keep[b] = true; });
    function mapBrand(b) {
      return keep[b] ? b : OTHER;
    }

    var first = null;
    var last = null;
    var regionSet = {};
    var countrySet = {};
    sales.forEach(function (r) {
      if (!first || r.month < first) first = r.month;
      if (!last || r.month > last) last = r.month;
      regionSet[r.region] = true;
      (countrySet[r.region] = countrySet[r.region] || {})[r.country] = true;
    });
    if (regionSet[TOTAL]) throw new Error("지역 이름으로 '" + TOTAL + "' 는 쓸 수 없습니다. 합계 표시에 씁니다.");
    var months = U.monthRange(first, last);
    var T = months.length;
    var mIdx0 = U.monthIndex(first);
    var regions = Object.keys(regionSet).sort();
    var brands = (opts.brands || []).filter(function (b) { return b !== OTHER; }).concat([OTHER]);
    var countries = {};
    regions.forEach(function (r) { countries[r] = Object.keys(countrySet[r]).sort(); });

    // 월별 브랜드 합계, 국가별
    var monthly = {};
    var countryUnits = {};
    regions.forEach(function (r) {
      monthly[r] = {};
      countryUnits[r] = {};
      brands.forEach(function (b) { monthly[r][b] = U.zeros(T); });
      countries[r].forEach(function (c) {
        countryUnits[r][c] = {};
        brands.forEach(function (b) { countryUnits[r][c][b] = U.zeros(T); });
      });
    });
    sales.forEach(function (row) {
      var t = U.monthIndex(row.month) - mIdx0;
      var b = mapBrand(row.brand);
      monthly[row.region][b][t] += row.units;
      countryUnits[row.region][row.country][b][t] += row.units;
    });

    // 빈 달 확인
    regions.forEach(function (r) {
      var emptyMonths = [];
      for (var t = 0; t < T; t++) {
        var s = 0;
        brands.forEach(function (b) { s += monthly[r][b][t]; });
        if (s <= 0) emptyMonths.push(months[t]);
      }
      if (emptyMonths.length) {
        notes.push({ level: 'warn', message: r + ' 지역에 판매가 0 인 달이 있습니다: ' + emptyMonths.slice(0, 6).join(', ') + (emptyMonths.length > 6 ? ' 외' : '') });
      }
    });
    if (T < 24) notes.push({ level: 'warn', message: '실적이 ' + T + '개월입니다. 24개월 미만이면 계절 지수와 성장률을 계산하지 않습니다.' });

    // 파워트레인 비중
    var pts;
    var units = {};
    var ptEstimated = {};
    if (!powertrain || !powertrain.length) {
      pts = [ALL_PT];
      regions.forEach(function (r) {
        units[r] = {};
        ptEstimated[r] = {};
        brands.forEach(function (b) {
          units[r][b] = {};
          units[r][b][ALL_PT] = monthly[r][b].slice();
          ptEstimated[r][b] = months.map(function () { return false; });
        });
      });
      notes.push({ level: 'info', message: '파워트레인 자료가 없어 파워트레인 카드는 쓸 수 없습니다.' });
    } else {
      var ptSet = {};
      powertrain.forEach(function (row) { ptSet[row.powertrain] = true; });
      var order = ['BEV', 'PHEV', 'EREV', 'HEV', 'MHEV', 'ICE', 'FCEV'];
      pts = Object.keys(ptSet).sort(function (a, b) {
        var ia = order.indexOf(a);
        var ib = order.indexOf(b);
        if (ia < 0) ia = 99;
        if (ib < 0) ib = 99;
        return ia - ib || (a < b ? -1 : 1);
      });
      var nPt = pts.length;
      var ptPos = {};
      pts.forEach(function (p, i) { ptPos[p] = i; });

      // 분기 물량: [region][brand][quarter] -> number[nPt], 지역 합계는 [region][quarter]
      var qb = {};
      var qr = {};
      var unknownRegion = {};
      powertrain.forEach(function (row) {
        if (!regionSet[row.region]) {
          unknownRegion[row.region] = true;
          return;
        }
        var b = mapBrand(row.brand);
        var key = row.region;
        qb[key] = qb[key] || {};
        qb[key][b] = qb[key][b] || {};
        var v = (qb[key][b][row.quarter] = qb[key][b][row.quarter] || U.zeros(nPt));
        v[ptPos[row.powertrain]] += row.units;
        qr[key] = qr[key] || {};
        var w = (qr[key][row.quarter] = qr[key][row.quarter] || U.zeros(nPt));
        w[ptPos[row.powertrain]] += row.units;
      });
      if (Object.keys(unknownRegion).length) {
        notes.push({ level: 'warn', message: '파워트레인 자료의 지역 중 월별 판매에 없는 것은 뺐습니다: ' + Object.keys(unknownRegion).join(', ') });
      }

      var quartersNeeded = [];
      months.forEach(function (m) {
        var q = U.quarterOf(m);
        if (quartersNeeded.indexOf(q) < 0) quartersNeeded.push(q);
      });

      function toMix(v) {
        var s = U.sum(v);
        return s > 0 ? v.map(function (x) { return x / s; }) : null;
      }

      /* 분기 비중을 채웁니다. 그 분기 자료가 없으면 가장 가까운 분기, 브랜드 자료가 아예 없으면
         같은 분기 지역 전체 비중을 씁니다. 채운 분기의 달은 ptEstimated 로 표시합니다. */
      function mixSeries(list, fallback) {
        var mix = {};
        var est = {};
        var have = quartersNeeded.filter(function (q) { return list && list[q] && toMix(list[q]); });
        quartersNeeded.forEach(function (q) {
          if (list && list[q] && toMix(list[q])) {
            mix[q] = toMix(list[q]);
            est[q] = false;
            return;
          }
          est[q] = true;
          if (have.length) {
            var qi = U.monthIndex(U.quarterMonths(q)[0]);
            var best = have[0];
            have.forEach(function (h) {
              if (Math.abs(U.monthIndex(U.quarterMonths(h)[0]) - qi) < Math.abs(U.monthIndex(U.quarterMonths(best)[0]) - qi)) best = h;
            });
            mix[q] = toMix(list[best]);
          } else {
            mix[q] = fallback(q);
          }
        });
        return { mix: mix, est: est };
      }

      var totalEst = 0;
      var totalCells = 0;
      regions.forEach(function (r) {
        units[r] = {};
        ptEstimated[r] = {};
        var regional = mixSeries(qr[r], function () {
          var m = U.zeros(nPt);
          m[pts.indexOf('ICE') >= 0 ? pts.indexOf('ICE') : nPt - 1] = 1;
          return m;
        });
        if (!qr[r]) notes.push({ level: 'warn', message: r + ' 지역에 파워트레인 자료가 없어 전부 ' + (pts.indexOf('ICE') >= 0 ? 'ICE' : pts[nPt - 1]) + ' 로 두었습니다.' });
        brands.forEach(function (b) {
          var series = mixSeries(qb[r] && qb[r][b], function (q) { return regional.mix[q]; });
          var split = splitByMix(monthly[r][b], months, series.mix, nPt);
          units[r][b] = {};
          pts.forEach(function (p, i) { units[r][b][p] = split[i]; });
          ptEstimated[r][b] = months.map(function (m) { return series.est[U.quarterOf(m)]; });
          if (!(qb[r] && qb[r][b]) && U.sum(monthly[r][b]) > 0) {
            notes.push({ level: 'warn', message: r + ' / ' + b + ': 파워트레인 자료가 없어 지역 평균 비중을 썼습니다.' });
          }
          ptEstimated[r][b].forEach(function (e, t) {
            if (monthly[r][b][t] > 0) {
              totalCells++;
              if (e) totalEst++;
            }
          });
        });
      });
      var estQuarters = quartersNeeded.filter(function (q) {
        return regions.some(function (r) { return !(qr[r] && qr[r][q]); });
      });
      if (estQuarters.length) {
        notes.push({ level: 'info', message: '파워트레인 자료가 없는 분기는 가장 가까운 분기 비중으로 채웠습니다: ' + estQuarters.join(', ') });
      }
      if (totalCells) {
        notes.push({ level: 'info', message: '파워트레인 분해 중 추정으로 채운 비율: ' + (Math.round((totalEst / totalCells) * 1000) / 10) + '% (지역 x 브랜드 x 월 기준)' });
      }
    }

    var otherCount = 0;
    var seen = {};
    sales.forEach(function (r) {
      if (!keep[r.brand] && !seen[r.brand]) {
        seen[r.brand] = true;
        otherCount++;
      }
    });
    notes.unshift({
      level: 'info',
      message: '실적 ' + first + ' ~ ' + last + ' (' + T + '개월), 지역 ' + regions.length + '개, 관측 브랜드 ' + (brands.length - 1) + '개, 기타로 묶은 브랜드 ' + otherCount + '개, 파워트레인 ' + pts.join('/'),
    });

    return {
      months: months,
      regions: regions,
      brands: brands,
      powertrains: pts,
      countries: countries,
      units: units,
      countryUnits: countryUnits,
      ptEstimated: ptEstimated,
      notes: notes,
    };
  }

  sim.prep = {
    ALIASES: ALIASES,
    detectColumns: detectColumns,
    normalizeSales: normalizeSales,
    normalizePowertrain: normalizePowertrain,
    rankBrands: rankBrands,
    splitByMix: splitByMix,
    buildDataset: buildDataset,
  };
})(typeof window !== 'undefined' ? window : globalThis);
