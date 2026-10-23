/* 사내 모델 답(JSON)을 읽고 검사합니다. DOM 을 쓰지 않습니다. 전역 App.ea.parse.
 *
 * 사내 모델은 JSON 앞뒤에 설명을 붙이거나, ```json 울타리를 치거나, 마지막 쉼표를 남기거나, 둥근 따옴표를 씁니다.
 * lenientJson 이 이런 흔한 실수를 고쳐서 읽고, 그래도 안 되면 몇째 줄 몇째 글자에서 막혔는지 알려 줍니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var ea = (App.ea = App.ea || {});
  var C = ea.core;

  /**
   * @returns {{ok: true, value: any, fixed: string[]} | {ok: false, error: string}}
   */
  function lenientJson(text) {
    var fixed = [];
    var s = String(text || '').replace(/^﻿/, '').trim();
    if (!s) return { ok: false, error: '붙여 넣은 내용이 없습니다.' };

    var fence = /```(?:json|JSON)?\s*([\s\S]*?)```/.exec(s);
    if (fence) {
      s = fence[1].trim();
      fixed.push('``` 울타리를 걷어냄');
    }
    var start = s.search(/[{[]/);
    if (start < 0) return { ok: false, error: '{ 로 시작하는 JSON 을 찾지 못했습니다.' };
    var open = s[start];
    var close = open === '{' ? '}' : ']';
    var end = s.lastIndexOf(close);
    if (end < start) return { ok: false, error: '닫는 ' + close + ' 를 찾지 못했습니다. 답이 중간에 끊겼을 수 있습니다.' };
    if (start > 0 || end < s.length - 1) fixed.push('JSON 앞뒤 설명 문장을 걷어냄');
    s = s.slice(start, end + 1);

    var r = tryParse(s);
    if (r.ok) return { ok: true, value: r.value, fixed: fixed };

    var t = s.replace(/[“”„‟]/g, '"').replace(/[‘’]/g, "'");
    if (t !== s) fixed.push('둥근 따옴표를 곧은 따옴표로');
    var t2 = t.replace(/,\s*([}\]])/g, '$1');
    if (t2 !== t) fixed.push('마지막 쉼표를 지움');
    r = tryParse(t2);
    if (r.ok) return { ok: true, value: r.value, fixed: fixed };
    return { ok: false, error: r.error };
  }

  function tryParse(s) {
    try {
      return { ok: true, value: JSON.parse(s) };
    } catch (e) {
      var m = /position (\d+)/.exec(e.message);
      var where = '';
      if (m) {
        var pos = +m[1];
        var before = s.slice(0, pos);
        var line = before.split('\n').length;
        var col = pos - before.lastIndexOf('\n');
        where = ' (' + line + '번째 줄 ' + col + '번째 글자 근처: "' + s.slice(Math.max(0, pos - 20), pos + 20).replace(/\n/g, ' ') + '")';
      }
      return { ok: false, error: 'JSON 문법 오류' + where };
    }
  }

  function str(v) {
    if (v === null || v === undefined) return '';
    if (Array.isArray(v)) return v.map(str).filter(Boolean).join('\n');
    return String(v).trim();
  }

  function normTopic(t, warnings, where) {
    var s = str(t);
    if (!s) return '기타';
    if (C.TOPICS.indexOf(s) >= 0) return s;
    var loose = s.replace(/[\s·.,/]/g, '');
    for (var i = 0; i < C.TOPICS.length; i++) {
      if (C.TOPICS[i].replace(/[\s·.,/]/g, '') === loose) return C.TOPICS[i];
    }
    warnings.push(where + ' 주제 "' + s + '" 는 목록에 없어 기타로 넣음');
    return '기타';
  }

  var METRIC_ALIASES = {
    revenue: ['revenue', 'revenues', 'sales', 'netsales', 'totalrevenue', 'totalrevenues', '매출', '매출액', '売上高', '売上収益', '営業収益'],
    operatingIncome: ['operatingincome', 'operatingprofit', 'ebit', 'operatingresult', '영업이익', '営業利益'],
    adjOperatingIncome: ['adjoperatingincome', 'adjustedoperatingincome', 'adjustedebit', 'ebitadjusted', 'adjustedoperatingprofit', 'adjustedebitda', '조정영업이익'],
    netIncome: ['netincome', 'netprofit', 'netincomeattributable', 'profitattributable', '순이익', '당기순이익', '지배순이익', '純利益', '当期利益'],
    deliveries: ['deliveries', 'unitsales', 'wholesales', 'retailsales', 'vehiclesales', '판매대수', '판매', '販売台数'],
  };
  function normMetric(k) {
    var s = String(k || '').toLowerCase().replace(/[\s_\-()]/g, '');
    for (var key in METRIC_ALIASES) {
      if (key.toLowerCase() === s || METRIC_ALIASES[key].indexOf(s) >= 0) return key;
    }
    return null;
  }

  /**
   * 회사와 분기를 확인합니다. 화면에서 고른 값(ctx.company, ctx.period)이 있으면 그것과 맞는지 봅니다.
   */
  function resolveTarget(obj, ctx, errors, warnings) {
    var companies = (ctx && ctx.companies) || [];
    var company = null;
    if (obj.company) {
      company = C.findCompany(companies, obj.company);
      if (!company) errors.push('company "' + obj.company + '" 를 회사 목록에서 찾지 못함');
    }
    if (ctx && ctx.company) {
      var chosen = C.findCompany(companies, ctx.company);
      if (company && chosen && company.id !== chosen.id) {
        errors.push('답의 회사(' + company.id + ')가 고른 회사(' + chosen.id + ')와 다름');
      }
      company = company || chosen;
    }
    if (!company && !errors.length) errors.push('company 가 없음');

    var period = obj.period ? C.normPeriod(obj.period) : null;
    if (obj.period && !period) errors.push('period "' + obj.period + '" 를 읽지 못함 (예: 2026Q3)');
    if (ctx && ctx.period) {
      if (period && period !== ctx.period) {
        warnings.push('답의 분기(' + period + ')가 고른 분기(' + ctx.period + ')와 달라 고른 분기로 넣음');
      }
      period = ctx.period;
    }
    if (!period && !errors.length) errors.push('period 가 없음');
    return { company: company, period: period };
  }

  /**
   * 컨퍼런스콜 요약 답을 검사합니다.
   * @returns {{ok: boolean, errors: string[], warnings: string[], company: object|null, period: string|null, call: object|null}}
   */
  function readCall(obj, ctx) {
    var errors = [];
    var warnings = [];
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return { ok: false, errors: ['JSON 객체({ ... })가 아님'], warnings: warnings, company: null, period: null, call: null };
    }
    var t = resolveTarget(obj, ctx, errors, warnings);

    var highlights = [];
    (Array.isArray(obj.highlights) ? obj.highlights : []).forEach(function (h, i) {
      var text = typeof h === 'string' ? str(h) : str(h && (h.text || h.content));
      if (!text) {
        warnings.push('highlights[' + i + '] 내용이 비어 뺌');
        return;
      }
      highlights.push({ topic: normTopic(h && h.topic, warnings, 'highlights[' + i + ']'), text: text });
    });

    var qa = [];
    (Array.isArray(obj.qa) ? obj.qa : []).forEach(function (x, i) {
      if (!x || typeof x !== 'object') return;
      var item = {
        asker: str(x.asker),
        firm: str(x.firm),
        question: str(x.question || x.q),
        answerer: str(x.answerer),
        answer: str(x.answer || x.a),
        topic: normTopic(x.topic, warnings, 'qa[' + i + ']'),
      };
      if (!item.question || !item.answer) {
        warnings.push('qa[' + i + '] 질문이나 답변이 비어 뺌');
        return;
      }
      qa.push(item);
    });

    var call = {
      date: normDate(obj.callDate || obj.date, warnings),
      summary: str(obj.summary),
      highlights: highlights,
      guidance: str(obj.guidance),
      qa: qa,
      sources: (Array.isArray(obj.sources) ? obj.sources : obj.source ? [obj.source] : []).map(str).filter(Boolean),
    };
    if (!call.summary && !highlights.length && !qa.length && !call.guidance) {
      errors.push('summary, highlights, guidance, qa 가 모두 비어 있음');
    }
    return {
      ok: !errors.length,
      errors: errors,
      warnings: warnings,
      company: t.company,
      period: t.period,
      call: errors.length ? null : call,
    };
  }

  function normDate(v, warnings) {
    var s = str(v);
    if (!s) return '';
    var m = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/.exec(s);
    if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
    warnings.push('날짜 "' + s + '" 를 YYYY-MM-DD 로 읽지 못해 비움');
    return '';
  }

  /**
   * 숫자 답을 검사하고 저장 단위(금액 백만, 대수 천 대)로 바꿉니다.
   * values 는 배열 [{metric, value, unit, basis, text}] 또는 객체 {revenue: {value, unit}} 둘 다 받습니다.
   * basis 가 'ytd'(누계)인 값은 ytd 에 따로 담고, 분기 값으로 바꾸는 일은 merge.ytdToQuarter 가 합니다.
   */
  function readNumbers(obj, ctx) {
    var errors = [];
    var warnings = [];
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return { ok: false, errors: ['JSON 객체({ ... })가 아님'], warnings: warnings };
    }
    var t = resolveTarget(obj, ctx, errors, warnings);
    var currency = str(obj.currency).toUpperCase() || (t.company && t.company.currency) || '';
    if (t.company && currency && currency !== t.company.currency) {
      warnings.push('통화 ' + currency + ' 가 회사 기본 통화 ' + t.company.currency + ' 와 다름. 분기 자료에 ' + currency + ' 로 적음');
    }
    if (currency && C.CURRENCIES.indexOf(currency) < 0) warnings.push('통화 ' + currency + ' 는 환율 표에 없는 통화');

    var list = [];
    var src = obj.values || obj.numbers || [];
    if (Array.isArray(src)) list = src;
    else if (typeof src === 'object') {
      Object.keys(src).forEach(function (k) {
        var v = src[k];
        list.push(typeof v === 'object' && v !== null ? Object.assign({ metric: k }, v) : { metric: k, value: v });
      });
    }

    var values = {};
    var ytd = {};
    var raw = {};
    list.forEach(function (x, i) {
      var key = normMetric(x && x.metric);
      if (!key) {
        warnings.push('values[' + i + '] 지표 "' + (x && x.metric) + '" 를 몰라 뺌');
        return;
      }
      var kind = key === 'deliveries' ? 'count' : 'money';
      var unit = x.unit;
      if (!unit) {
        unit = kind === 'count' ? 'one' : 'million';
        warnings.push(key + ' 단위가 없어 ' + (kind === 'count' ? '대' : '백만') + ' 으로 봄');
      }
      var n = C.toStoreUnit(x.value, unit, kind);
      if (n === null) {
        warnings.push(key + ' 값 "' + x.value + '" 또는 단위 "' + x.unit + '" 를 읽지 못해 뺌');
        return;
      }
      var basis = str(x.basis).toLowerCase();
      if (basis === 'ytd' || basis === 'cumulative' || basis === '누계') ytd[key] = n;
      else values[key] = n;
      if (x.text) raw[key] = str(x.text);
    });
    if (!Object.keys(values).length && !Object.keys(ytd).length) errors.push('읽은 숫자가 하나도 없음');

    return {
      ok: !errors.length,
      errors: errors,
      warnings: warnings,
      company: t.company,
      period: t.period,
      numbers: errors.length ? null : {
        currency: currency,
        fiscalLabel: str(obj.fiscalLabel),
        reportDate: normDate(obj.reportDate, warnings),
        source: str(obj.source),
        values: values,
        ytd: ytd,
        raw: raw,
      },
    };
  }

  /** 답 종류 짐작. 숫자와 콜 요약이 한 답에 같이 와도 됩니다. */
  function detect(obj) {
    if (!obj || typeof obj !== 'object') return [];
    if (obj.type === 'ea-pack') return ['pack'];
    var kinds = [];
    if (obj.values || obj.numbers) kinds.push('numbers');
    if (obj.highlights || obj.qa || obj.summary || obj.guidance) kinds.push('call');
    return kinds;
  }

  ea.parse = {
    lenientJson: lenientJson,
    readCall: readCall,
    readNumbers: readNumbers,
    normMetric: normMetric,
    detect: detect,
  };
})(typeof window !== 'undefined' ? window : globalThis);
