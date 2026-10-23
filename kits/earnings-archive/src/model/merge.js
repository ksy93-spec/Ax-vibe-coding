/* 읽은 자료를 회사 자료에 합칩니다. 원본 객체를 바꾸지 않고 새 객체를 돌려줍니다. DOM 을 쓰지 않습니다.
 * 전역 App.ea.merge.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var ea = (App.ea = App.ea || {});
  var C = ea.core;

  function clone(o) {
    return o === undefined ? undefined : JSON.parse(JSON.stringify(o));
  }

  function now() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  function emptyReport(companyId) {
    return { company: companyId, rev: 0, quarters: [] };
  }

  function newQuarter(company, period) {
    return {
      period: period,
      fiscalLabel: C.fiscalLabel(period, company && company.fyEnd),
      reportDate: '',
      currency: (company && company.currency) || 'USD',
      values: {},
      raw: {},
      source: '',
      status: '검증 필요',
      note: '',
      call: null,
      origin: 'inside',
      updatedAt: now(),
    };
  }

  function sortQuarters(qs) {
    return qs.sort(function (a, b) {
      return C.comparePeriod(b.period, a.period);
    });
  }

  /** 분기 하나를 넣거나 바꿉니다. */
  function putQuarter(report, quarter) {
    var r = clone(report) || emptyReport(quarter.company);
    var qs = (r.quarters || []).filter(function (q) {
      return q.period !== quarter.period;
    });
    qs.push(quarter);
    r.quarters = sortQuarters(qs);
    return r;
  }

  function removeQuarter(report, period) {
    var r = clone(report);
    r.quarters = (r.quarters || []).filter(function (q) {
      return q.period !== period;
    });
    return r;
  }

  /**
   * 원문을 여러 조각으로 나눠 받은 콜 요약 답을 하나로 합칩니다.
   * summary 와 date 는 처음 나온 값, 하이라이트와 Q&A 는 순서대로 잇고 같은 문장은 한 번만 남깁니다.
   */
  function joinCalls(parts) {
    var out = { date: '', summary: '', highlights: [], guidance: '', qa: [], sources: [] };
    var seenH = {};
    var seenQ = {};
    var guid = [];
    (parts || []).forEach(function (c) {
      if (!c) return;
      if (!out.date && c.date) out.date = c.date;
      if (!out.summary && c.summary) out.summary = c.summary;
      if (c.guidance && guid.indexOf(c.guidance) < 0) guid.push(c.guidance);
      (c.highlights || []).forEach(function (h) {
        var k = h.text.replace(/\s+/g, '');
        if (seenH[k]) return;
        seenH[k] = 1;
        out.highlights.push(h);
      });
      (c.qa || []).forEach(function (x) {
        var k = x.question.replace(/\s+/g, '');
        if (seenQ[k]) return;
        seenQ[k] = 1;
        out.qa.push(x);
      });
      (c.sources || []).forEach(function (s) {
        if (out.sources.indexOf(s) < 0) out.sources.push(s);
      });
    });
    out.guidance = guid.join('\n');
    return out;
  }

  /**
   * 콜 요약을 분기에 넣습니다. 분기가 없으면 새로 만듭니다.
   * opts.transcript: {source, url} 원문 출처 (원문 본문은 transcripts 파일에 따로 저장)
   */
  function applyCall(report, company, period, call, opts) {
    var r = clone(report) || emptyReport(company.id);
    var q = clone(C.quarterOf(r, period)) || newQuarter(company, period);
    var c = clone(call);
    if (opts && opts.transcript) c.transcript = opts.transcript;
    else if (q.call && q.call.transcript) c.transcript = q.call.transcript;
    q.call = c;
    q.origin = 'inside';
    q.updatedAt = now();
    return putQuarter(r, q);
  }

  /**
   * 누계(year-to-date) 값을 분기 값으로. 같은 회계연도 앞 분기들의 값이 자료에 있어야 합니다.
   * 매출, 영업이익 같은 손익(flow) 값에만 씁니다. parse.readNumbers 가 재무상태표 값은 ytd 로 보내지 않습니다.
   * @returns {{value: number|null, missing: string[]}} missing 은 값이 없는 앞 분기들
   */
  function ytdToQuarter(report, company, period, key, ytdValue) {
    var f = C.fiscalOf(period, company && company.fyEnd);
    var missing = [];
    var sum = 0;
    for (var k = 1; k < f.fq; k++) {
      var p = C.periodAdd(period, -k);
      var q = C.quarterOf(report, p);
      var v = q && q.values ? C.toNumber(q.values[key]) : null;
      if (v === null) missing.push(p);
      else sum += v;
    }
    if (missing.length) return { value: null, missing: missing };
    return { value: C.round(ytdValue - sum, 6), missing: [] };
  }

  /**
   * 숫자를 분기에 넣습니다. 이미 있는 값은 덮어씁니다. 누계 값은 분기 값으로 바꿔 넣고, 못 바꾸면 warnings 에 적습니다.
   * @returns {{report: object, warnings: string[]}}
   */
  function applyNumbers(report, company, period, numbers) {
    var warnings = [];
    var r = clone(report) || emptyReport(company.id);
    var q = clone(C.quarterOf(r, period)) || newQuarter(company, period);
    q.values = q.values || {};
    q.raw = q.raw || {};
    Object.keys(numbers.values || {}).forEach(function (k) {
      q.values[k] = numbers.values[k];
    });
    Object.keys(numbers.ytd || {}).forEach(function (k) {
      var res = ytdToQuarter(r, company, period, k, numbers.ytd[k]);
      if (res.value === null) {
        warnings.push(k + ' 는 누계 값인데 ' + res.missing.join(', ') + ' 자료가 없어 분기 값으로 바꾸지 못함');
      } else {
        q.values[k] = res.value;
        q.raw[k] = (numbers.raw && numbers.raw[k] ? numbers.raw[k] + ' ' : '') + '(누계에서 앞 분기를 빼서 계산)';
      }
    });
    Object.keys(numbers.raw || {}).forEach(function (k) {
      if (!q.raw[k]) q.raw[k] = numbers.raw[k];
    });
    if (numbers.currency) q.currency = numbers.currency;
    if (numbers.fiscalLabel) q.fiscalLabel = numbers.fiscalLabel;
    if (numbers.reportDate) q.reportDate = numbers.reportDate;
    if (numbers.source) q.source = numbers.source;
    q.origin = 'inside';
    q.updatedAt = now();
    return { report: putQuarter(r, q), warnings: warnings };
  }

  /* ---------- 바깥에서 만든 자료 묶음(ea-pack) 가져오기 ---------- */

  function same(a, b) {
    var strip = function (q) {
      var c = clone(q);
      delete c.updatedAt;
      delete c.origin;
      return JSON.stringify(c);
    };
    return strip(a) === strip(b);
  }

  /**
   * 묶음을 지금 자료와 비교해 분기마다 할 일을 정합니다.
   * - 없는 분기: 추가
   * - 내용이 같음: 그대로
   * - 사내에서 고친 분기(origin 'inside'): 남김 (화면에서 바꿀 수 있음)
   * - 바깥 자료끼리: 바꿈
   * @param {{reports: Array<{company: string, quarters: object[]}>}} pack
   * @param {Object<string, object>} reports 지금 회사별 자료
   * @param {object[]} companies
   * @returns {Array<{company: string, period: string, action: 'add'|'replace'|'keep'|'same'|'skip', reason: string, quarter: object}>}
   */
  function planPack(pack, reports, companies) {
    var rows = [];
    (pack.reports || []).forEach(function (rep) {
      var company = C.findCompany(companies, rep.company);
      (rep.quarters || []).forEach(function (q) {
        var period = C.normPeriod(q.period);
        if (!company) {
          rows.push({ company: rep.company, period: q.period, action: 'skip', reason: '회사 목록에 없는 회사', quarter: q });
          return;
        }
        if (!period) {
          rows.push({ company: company.id, period: q.period, action: 'skip', reason: '분기 표기를 읽지 못함', quarter: q });
          return;
        }
        var incoming = Object.assign({}, clone(q), { period: period, origin: 'outside' });
        var cur = C.quarterOf(reports[company.id], period);
        var row = { company: company.id, period: period, quarter: incoming };
        if (!cur) {
          row.action = 'add';
          row.reason = '새 분기';
        } else if (same(cur, incoming)) {
          row.action = 'same';
          row.reason = '내용이 같음';
        } else if (cur.origin === 'inside') {
          row.action = 'keep';
          row.reason = '사내에서 고친 분기라 남김';
        } else {
          row.action = 'replace';
          row.reason = '바깥 자료가 새로 고쳐짐';
        }
        rows.push(row);
      });
    });
    return rows;
  }

  /**
   * 정한 대로 적용합니다. action 이 add 나 replace 인 줄만 반영합니다.
   * @returns {Object<string, object>} 바뀐 회사의 새 자료만
   */
  function applyPack(rows, reports) {
    var changed = {};
    rows.forEach(function (row) {
      if (row.action !== 'add' && row.action !== 'replace') return;
      var base = changed[row.company] || reports[row.company] || emptyReport(row.company);
      var q = clone(row.quarter);
      q.updatedAt = q.updatedAt || now();
      changed[row.company] = putQuarter(base, q);
    });
    return changed;
  }

  /** 묶음의 환율은 비어 있는 칸만 채웁니다. 사내에서 넣은 환율을 덮지 않습니다. */
  function fillFx(fx, packFx) {
    var out = clone(fx) || { rev: 0, rates: {} };
    out.rates = out.rates || {};
    var added = 0;
    var rates = (packFx && packFx.rates) || {};
    Object.keys(rates).forEach(function (cur) {
      out.rates[cur] = out.rates[cur] || {};
      Object.keys(rates[cur]).forEach(function (p) {
        if (C.rateFor(out, cur, p) === null && C.toNumber(rates[cur][p])) {
          out.rates[cur][p] = C.toNumber(rates[cur][p]);
          added++;
        }
      });
    });
    return { fx: out, added: added };
  }

  /** 지금 자료를 묶음으로. 다른 사람에게 넘기거나 백업할 때 씁니다. */
  function makePack(reports, fx, companyIds) {
    return {
      type: 'ea-pack',
      createdAt: now(),
      fx: fx ? { rates: clone(fx.rates || {}) } : undefined,
      reports: companyIds
        .filter(function (id) {
          return reports[id] && reports[id].quarters && reports[id].quarters.length;
        })
        .map(function (id) {
          return { company: id, quarters: clone(reports[id].quarters) };
        }),
    };
  }

  ea.merge = {
    emptyReport: emptyReport,
    newQuarter: newQuarter,
    putQuarter: putQuarter,
    removeQuarter: removeQuarter,
    joinCalls: joinCalls,
    applyCall: applyCall,
    applyNumbers: applyNumbers,
    ytdToQuarter: ytdToQuarter,
    planPack: planPack,
    applyPack: applyPack,
    fillFx: fillFx,
    makePack: makePack,
  };
})(typeof window !== 'undefined' ? window : globalThis);
