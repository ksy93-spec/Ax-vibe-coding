/* 사내 모델에 붙여 넣을 프롬프트를 만듭니다. DOM 을 쓰지 않습니다. 전역 App.ea.prompt.
 *
 * 원문이 길면 사내 모델의 컨텍스트가 무너집니다. 그래서
 *   1) 발표(prepared remarks)와 질의응답(Q&A)을 나누고
 *   2) 각 부분을 maxChars 글자 이하 조각으로 자른 뒤
 *   3) 조각마다 프롬프트를 하나씩 만듭니다.
 * 조각별 답은 화면에서 하나씩 붙여 넣고, merge.joinCalls 가 합칩니다.
 *
 * 아래 CALL_TEMPLATE, NUMBERS_TEMPLATE 은 prompts/10-call-summary.md, prompts/11-numbers.md 에 같은 글이 있습니다.
 * 한쪽을 고치면 다른 쪽도 고칩니다. tests/run.cjs 가 둘이 같은지 검사합니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var ea = (App.ea = App.ea || {});
  var C = ea.core;

  var DEFAULT_MAX = 24000;

  var CALL_TEMPLATE = [
    '너는 자동차 산업 실적 자료를 정리하는 애널리스트다.',
    '아래 [원문]은 {{companyName}} 의 {{periodLabel}} 실적 컨퍼런스콜 녹취록이다. {{partInfo}}',
    '원문을 읽고 [출력 형식]의 JSON 하나만 답한다. JSON 앞뒤에 설명을 붙이지 않는다.',
    '',
    '[정해진 값]',
    '- company: "{{companyId}}"',
    '- period: "{{period}}" (달력 분기. 회사 표기로는 {{fiscalLabel}})',
    '- 발표 통화: {{currency}}',
    '',
    '[할 일]',
    '{{task}}',
    '',
    '[규칙]',
    '- 원문에 없는 내용, 숫자, 사람 이름을 만들지 않는다. 확실하지 않으면 뺀다.',
    '- 한국어 개조식으로 쓴다. 문장 끝은 "~함", "~임", "~ 전망", "~ 계획" 같은 명사형으로 끝낸다.',
    '- 숫자는 원문의 통화와 단위를 그대로 쓴다. 예: "EBIT-adjusted 41억 달러", "영업이익 1조 2,000억 엔". 환율 환산을 하지 않는다.',
    '- topic 은 다음 중 하나만 쓴다: {{topics}}',
    '- 대시(—), 이모지, 굵은 글씨(**)를 쓰지 않는다.',
    '- 원문 문장을 길게 옮기지 않고 요약한다. 꼭 필요할 때만 짧게 큰따옴표로 인용한다.',
    '- 사람 이름과 회사 이름은 원문 철자(영문)를 그대로 쓴다.',
    '',
    '[출력 형식]',
    '{',
    '  "company": "{{companyId}}",',
    '  "period": "{{period}}",',
    '  "callDate": "YYYY-MM-DD (원문에 있으면)",',
    '  "summary": "이번 분기 총평 1~2문장",',
    '  "highlights": [ { "topic": "실적", "text": "북미 픽업 판매 호조로 영업이익률 8.1% 기록함" } ],',
    '  "guidance": "회사가 밝힌 연간 또는 다음 분기 전망. 숫자 그대로. 없으면 빈 문자열",',
    '  "qa": [ { "asker": "질문자 이름", "firm": "소속 증권사", "question": "질문 요약", "answerer": "답변자 이름, 직책", "answer": "답변 요약", "topic": "가이던스" } ]',
    '}',
    '',
    '[원문]',
    '{{text}}',
  ].join('\n');

  var TASK_ALL = [
    '- summary: 이번 분기 총평 1~2문장',
    '- highlights: 경영진 발표의 요점 6~10개. 실적 숫자, 가이던스 변경, 지역별 흐름, 전동화, 관세와 정책, 원가, 주주환원 순으로 찾는다.',
    '- guidance: 회사가 밝힌 전망 숫자. 없으면 빈 문자열',
    '- qa: 애널리스트 질문 하나마다 항목 하나. 질문과 답변을 각각 1~3문장으로 요약한다. 사회자 안내와 인사말은 뺀다.',
  ].join('\n');
  var TASK_PREPARED = [
    '- 이 조각은 경영진 발표 부분이다.',
    '- summary: 이번 분기 총평 1~2문장',
    '- highlights: 요점 6~10개. 실적 숫자, 가이던스 변경, 지역별 흐름, 전동화, 관세와 정책, 원가, 주주환원 순으로 찾는다.',
    '- guidance: 회사가 밝힌 전망 숫자. 없으면 빈 문자열',
    '- qa: 빈 배열 []',
  ].join('\n');
  var TASK_QA = [
    '- 이 조각은 질의응답 부분이다.',
    '- qa: 애널리스트 질문 하나마다 항목 하나. 질문과 답변을 각각 1~3문장으로 요약한다. 사회자 안내와 인사말은 뺀다.',
    '- 조각 첫머리에 앞 조각에서 이어지는 답변만 있고 질문이 없으면 그 부분은 뺀다.',
    '- summary 와 guidance 는 빈 문자열, highlights 는 빈 배열 []',
  ].join('\n');

  var NUMBERS_TEMPLATE = [
    '너는 자동차 산업 실적 자료를 정리하는 애널리스트다.',
    '아래 [원문]은 {{companyName}} 의 {{periodLabel}} 실적 보도자료 또는 실적표다.',
    '원문에서 숫자를 찾아 [출력 형식]의 JSON 하나만 답한다. JSON 앞뒤에 설명을 붙이지 않는다.',
    '',
    '[정해진 값]',
    '- company: "{{companyId}}"',
    '- period: "{{period}}" (달력 분기. 회사 표기로는 {{fiscalLabel}})',
    '- 발표 통화: {{currency}}',
    '',
    '[찾을 숫자] (원문에 없는 것은 넣지 않는다)',
    '- revenue: 매출 (Revenue, Net sales, 売上高, 매출액). 이번 분기 값',
    '- operatingIncome: 영업이익 (Operating income, EBIT, Operating result, 営業利益). {{opNote}}',
    '- totalLiabilities: 분기 말 연결 부채총계 (Total liabilities, 負債合計)',
    '- totalEquity: 분기 말 연결 자본총계 (Total equity, 純資産合計). 비지배지분 포함 합계',
    '- debtRatio: 원문에 부채비율(%)이 숫자로 적혀 있을 때만. 직접 계산하지 않는다. unit 은 "percent"',
    '',
    '[규칙]',
    '- 숫자를 계산하거나 단위를 바꾸지 않는다. 원문에 적힌 숫자와 단위를 그대로 옮긴다.',
    '- unit 은 다음 중 하나: one, thousand, ten_thousand, million, hundred_million, billion, trillion, percent',
    '  예: "$48.6 billion" -> value 48.6, unit "billion" / "46조 6,200억원" -> value 46.62, unit "trillion" / "12,345億円" -> value 12345, unit "hundred_million" / "1,234百万円" -> value 1234, unit "million" / "부채비율 152.3%" -> value 152.3, unit "percent"',
    '- 매출과 영업이익: 원문이 이번 분기만의 값이면 basis 는 "quarter", 회계연도 시작부터 쌓인 누계(예: 上期, 9M, year-to-date)면 "ytd"',
    '- 부채총계, 자본총계, 부채비율: 분기 말 값이므로 basis 는 "quarter"',
    '- 적자는 음수로 적는다. 괄호 표기 (123) 은 -123',
    '- text 에는 원문 표기를 짧게 그대로 적는다.',
    '',
    '[출력 형식]',
    '{',
    '  "company": "{{companyId}}",',
    '  "period": "{{period}}",',
    '  "fiscalLabel": "회사가 부르는 분기 이름 (예: Q3 2026, FY2027 Q1)",',
    '  "reportDate": "YYYY-MM-DD (발표일)",',
    '  "currency": "{{currency}}",',
    '  "values": [',
    '    { "metric": "revenue", "value": 48.6, "unit": "billion", "basis": "quarter", "text": "$48.6 billion" }',
    '  ]',
    '}',
    '',
    '[원문]',
    '{{text}}',
  ].join('\n');

  /** 질의응답이 시작되는 곳을 찾는 표지. 위에서부터 처음 맞는 곳에서 나눕니다. */
  var QA_MARKERS = [
    /^.{0,40}question[-\s]and[-\s]answer/im,
    /^.{0,40}questions?\s*(?:&|and)\s*answers?/im,
    /^.{0,20}Q\s*&\s*A\b/m,
    /(?:we will|we'll|let's|I would like to|I'd like to)\s+(?:now\s+)?(?:begin|open|start|move to|turn to|take)\s+(?:the\s+)?(?:call\s+(?:up\s+)?(?:to|for)\s+)?(?:your\s+)?questions?/i,
    /our\s+first\s+question\s+(?:comes|is)\s+from/i,
    /질의\s*응답/,
    /質疑応答/,
  ];

  /**
   * 녹취록을 발표와 질의응답으로 나눕니다. 표지를 못 찾으면 전부 발표로 봅니다.
   * @returns {{prepared: string, qa: string, found: boolean}}
   */
  function splitTranscript(text) {
    var s = String(text || '').replace(/\r\n?/g, '\n').trim();
    var best = -1;
    // 앞쪽 10% 안에서 찾은 표지는 사회자 안내("이후 질의응답이 있겠습니다")일 가능성이 커서 넘기고 다음 것을 찾습니다.
    for (var i = 0; i < QA_MARKERS.length && best < 0; i++) {
      var re = new RegExp(QA_MARKERS[i].source, QA_MARKERS[i].flags + 'g');
      var m;
      while ((m = re.exec(s))) {
        if (m.index > s.length * 0.1) {
          best = s.lastIndexOf('\n', m.index) + 1;
          break;
        }
        if (m[0] === '') re.lastIndex++;
      }
    }
    if (best < 0) return { prepared: s, qa: '', found: false };
    return { prepared: s.slice(0, best).trim(), qa: s.slice(best).trim(), found: true };
  }

  /**
   * 글을 maxChars 이하 조각으로. 빈 줄, 줄바꿈, 문장 끝 순서로 자를 곳을 찾습니다.
   * 조각을 이으면 원문과 같습니다 (자른 곳의 공백만 다를 수 있음).
   */
  function chunk(text, maxChars) {
    var max = Math.max(1000, maxChars || DEFAULT_MAX);
    var s = String(text || '').trim();
    var out = [];
    while (s.length > max) {
      var win = s.slice(0, max);
      var cut = win.lastIndexOf('\n\n');
      if (cut < max * 0.5) cut = win.lastIndexOf('\n');
      if (cut < max * 0.5) {
        var dot = Math.max(win.lastIndexOf('. '), win.lastIndexOf('다. '), win.lastIndexOf('? '));
        cut = dot > max * 0.5 ? dot + 1 : max;
      }
      out.push(s.slice(0, cut).trim());
      s = s.slice(cut).trim();
    }
    if (s) out.push(s);
    return out;
  }

  function fill(tpl, vars) {
    // 원문({{text}})은 마지막에 넣습니다. 원문 안에 {{ 같은 글자가 있어도 다시 바뀌지 않게 하려는 것입니다.
    var out = tpl;
    Object.keys(vars).forEach(function (k) {
      if (k === 'text') return;
      out = out.split('{{' + k + '}}').join(vars[k]);
    });
    return out.split('{{text}}').join(vars.text || '');
  }

  function baseVars(company, period) {
    return {
      companyId: company.id,
      companyName: company.name + (company.nameKo ? ' (' + company.nameKo + ')' : ''),
      period: period,
      periodLabel: C.periodLabel(period, true),
      fiscalLabel: C.fiscalLabel(period, company.fyEnd),
      currency: company.currency,
      topics: C.TOPICS.join(', '),
    };
  }

  /**
   * 콜 요약 프롬프트들. 원문이 짧으면 하나, 길면 여러 개.
   * @returns {{split: {found: boolean}, prompts: Array<{title: string, part: 'all'|'prepared'|'qa', chars: number, text: string}>}}
   */
  function buildCallPrompts(company, period, transcript, maxChars) {
    var max = maxChars || DEFAULT_MAX;
    var s = String(transcript || '').trim();
    var sp = splitTranscript(s);
    var pieces = [];
    if (s.length <= max) {
      pieces.push({ part: 'all', text: s });
    } else {
      chunk(sp.prepared, max).forEach(function (t) {
        pieces.push({ part: 'prepared', text: t });
      });
      chunk(sp.qa, max).forEach(function (t) {
        pieces.push({ part: 'qa', text: t });
      });
    }
    var n = pieces.length;
    var prompts = pieces.map(function (p, i) {
      var v = baseVars(company, period);
      v.partInfo = n > 1 ? '원문이 길어 ' + n + '개 조각으로 나눴고, 이것은 ' + (i + 1) + '번째 조각이다.' : '';
      v.task = p.part === 'all' ? TASK_ALL : p.part === 'prepared' ? TASK_PREPARED : TASK_QA;
      v.text = p.text;
      var label = p.part === 'all' ? '전체' : p.part === 'prepared' ? '발표' : '질의응답';
      return {
        title: (i + 1) + '/' + n + ' ' + label,
        part: p.part,
        chars: p.text.length,
        text: fill(CALL_TEMPLATE, v).replace(/ \n/g, '\n'),
      };
    });
    return { split: { found: sp.found }, prompts: prompts };
  }

  /** 숫자 프롬프트. 보도자료는 짧아서 나누지 않습니다. */
  function buildNumbersPrompt(company, period, text) {
    var v = baseVars(company, period);
    var notes = company.metricNotes || {};
    v.opNote = notes.operatingIncome ? '이 회사는 "' + notes.operatingIncome + '" 를 쓴다' : '회사가 공식 영업이익으로 쓰는 값. 조정(adjusted) 값이 아니라 공시 값';
    v.text = String(text || '').trim();
    return fill(NUMBERS_TEMPLATE, v);
  }

  ea.prompt = {
    DEFAULT_MAX: DEFAULT_MAX,
    CALL_TEMPLATE: CALL_TEMPLATE,
    NUMBERS_TEMPLATE: NUMBERS_TEMPLATE,
    TASK_ALL: TASK_ALL,
    TASK_PREPARED: TASK_PREPARED,
    TASK_QA: TASK_QA,
    splitTranscript: splitTranscript,
    chunk: chunk,
    buildCallPrompts: buildCallPrompts,
    buildNumbersPrompt: buildNumbersPrompt,
  };
})(typeof window !== 'undefined' ? window : globalThis);
