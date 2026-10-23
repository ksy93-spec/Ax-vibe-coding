/* 계산과 검사 로직의 합격 기준. tests/index.html 을 브라우저로 열거나 node tests/run.cjs 로 돌립니다.
 * 사내에서 src/model/ 을 고치면 이 파일이 전부 통과해야 합니다. 테스트를 지우거나 기대값을 바꾸지 마세요.
 * 회사와 숫자는 시험용으로 만든 가상 값입니다.
 */
(function (global) {
  'use strict';
  var App = global.App;
  var C = App.ea.core;
  var F = App.ea.files;
  var P = App.ea.parse;
  var M = App.ea.merge;
  var PR = App.ea.prompt;
  var tests = (App.tests = App.tests || []);

  function test(name, fn) {
    tests.push({ name: name, fn: fn });
  }
  function ok(cond, msg) {
    if (!cond) throw new Error(msg || '조건이 거짓입니다');
  }
  function eq(a, b, msg) {
    if (a !== b) throw new Error((msg || '값이 다릅니다') + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b));
  }
  function near(a, b, tol, msg) {
    if (!(Math.abs(a - b) <= tol)) throw new Error((msg || '값이 다릅니다') + ': ' + a + ' vs ' + b);
  }

  var COMPANIES = [
    { id: 'acme', name: 'Acme Motors', nameKo: '애크미', group: 'OEM', ticker: 'ACM', currency: 'USD', fyEnd: 12, aliases: ['Acme'] },
    { id: 'kmot', name: 'K Motor', nameKo: '케이모터', group: 'OEM', ticker: '000000.KS', currency: 'KRW', fyEnd: 12, aliases: [] },
    { id: 'jparts', name: 'J Parts', nameKo: '제이부품', group: 'Tier1', ticker: '0000.T', currency: 'JPY', fyEnd: 3, aliases: ['ジェイ'] },
  ];
  var FX = { rates: { KRW: { '2026Q2': 1400 }, JPY: { '2026Q2': 150, '2026Q3': 160 } } };

  /* ---------- 단위와 환율 ---------- */

  test('단위: 조, 억, 億円, billion 을 백만으로', function () {
    eq(C.toStoreUnit(46.62, 'trillion', 'money'), 46620000);
    eq(C.toStoreUnit('2,850', '억', 'money'), 285000);
    eq(C.toStoreUnit(12345, '億円', 'money'), 1234500);
    eq(C.toStoreUnit('48.6', 'bn', 'money'), 48600);
    eq(C.toStoreUnit(1234, '百万円', 'money'), 1234);
    eq(C.toStoreUnit(5, 'parsec', 'money'), null, '모르는 단위는 null');
  });

  test('단위: 대수는 천 대로', function () {
    eq(C.toStoreUnit(875000, 'one', 'count'), 875);
    eq(C.toStoreUnit('991,885', 'units', 'count'), 991.885);
    eq(C.toStoreUnit(85, '만', 'count'), 850);
  });

  test('숫자 읽기: 쉼표, 괄호 음수, 유니코드 마이너스', function () {
    eq(C.toNumber('1,234.5'), 1234.5);
    eq(C.toNumber('(120)'), -120);
    eq(C.toNumber('−3.2'), -3.2);
    eq(C.toNumber('abc'), null);
    eq(C.toNumber(''), null);
  });

  test('환율: USD 는 1, 표에 없으면 missing, 분기별 환율 덮어쓰기 우선', function () {
    var a = C.toMusd(1400000, 'KRW', '2026Q2', FX);
    eq(a.value, 1000);
    eq(a.source, 'table');
    var b = C.toMusd(1400000, 'KRW', '2026Q3', FX);
    eq(b.value, null);
    eq(b.source, 'missing');
    var c = C.toMusd(1400000, 'KRW', '2026Q3', FX, 1000);
    eq(c.value, 1400);
    eq(c.source, 'override');
    eq(C.toMusd(500, 'USD', '2026Q3', null).value, 500);
  });

  /* ---------- 분기 ---------- */

  test('분기 표기 정규화', function () {
    eq(C.normPeriod('2026Q3'), '2026Q3');
    eq(C.normPeriod('2026 q3'), '2026Q3');
    eq(C.normPeriod('Q3 2026'), '2026Q3');
    eq(C.normPeriod('3Q26'), '2026Q3');
    eq(C.normPeriod('2026년 3분기'), '2026Q3');
    eq(C.normPeriod('FY2026'), null);
  });

  test('분기 더하기와 범위', function () {
    eq(C.periodAdd('2026Q1', -1), '2025Q4');
    eq(C.periodAdd('2025Q4', 1), '2026Q1');
    eq(C.periodAdd('2026Q3', -4), '2025Q3');
    eq(C.periodRange('2025Q3', '2026Q2').join(','), '2025Q3,2025Q4,2026Q1,2026Q2');
    eq(C.lastClosedPeriod(new Date(2026, 9, 23)), '2026Q3');
    eq(C.lastClosedPeriod(new Date(2026, 0, 5)), '2025Q4');
  });

  test('회계연도 표기: 3월 결산 회사의 4~6월은 다음 해 회계연도 1분기', function () {
    eq(C.fiscalLabel('2026Q2', 3), 'FY2027 Q1');
    eq(C.fiscalLabel('2026Q1', 3), 'FY2026 Q4');
    eq(C.fiscalLabel('2026Q4', 3), 'FY2027 Q3');
    eq(C.fiscalLabel('2026Q3', 12), 'Q3 2026');
  });

  /* ---------- 분기 표 ---------- */

  test('분기 표: MUSD 환산, 영업이익률, 전년 동기 대비는 발표 통화 기준', function () {
    var rep = {
      company: 'kmot',
      quarters: [
        { period: '2025Q2', values: { revenue: 1000000, operatingIncome: 50000, deliveries: 900 } },
        { period: '2026Q2', values: { revenue: 1400000, operatingIncome: 70000, deliveries: 990 } },
      ],
    };
    var fx = { rates: { KRW: { '2026Q2': 1400, '2025Q2': 1000 } } };
    var t = C.table(rep, COMPANIES[1], fx);
    eq(t[0].period, '2026Q2', '최근 분기가 먼저');
    eq(t[0].musd.revenue, 1000);
    eq(t[1].musd.revenue, 1000, '전년 매출도 환율이 달라 1000 MUSD');
    near(t[0].yoy.revenue, 40, 1e-9, 'USD 로는 0% 지만 원화로 40% 성장');
    near(t[0].opMargin, 5, 1e-9);
    near(t[0].yoy.deliveries, 10, 1e-9);
  });

  test('분기 표: 환율이 없으면 missingFx 표시', function () {
    var rep = { company: 'kmot', quarters: [{ period: '2026Q3', values: { revenue: 1000 } }] };
    var t = C.table(rep, COMPANIES[1], FX);
    eq(t[0].musd.revenue, null);
    ok(t[0].missingFx);
  });

  test('증감률: 이전 값이 0 이하면 계산하지 않음', function () {
    eq(C.growth(10, -5), null);
    eq(C.growth(10, 0), null);
    near(C.growth(15, 10), 50, 1e-9);
  });

  test('회사 찾기: id, 이름, 한글, 별칭, 대소문자와 공백 무시', function () {
    eq(C.findCompany(COMPANIES, 'ACME').id, 'acme');
    eq(C.findCompany(COMPANIES, 'acme motors').id, 'acme');
    eq(C.findCompany(COMPANIES, '케이모터').id, 'kmot');
    eq(C.findCompany(COMPANIES, 'ジェイ').id, 'jparts');
    eq(C.findCompany(COMPANIES, 'nobody'), null);
  });

  /* ---------- 데이터 파일 ---------- */

  test('데이터 파일: 쓰고 다시 읽으면 같음', function () {
    var data = { company: 'acme', rev: 3, quarters: [{ period: '2026Q2', values: { revenue: 1 } }] };
    var text = F.toText('report', data);
    ok(text.indexOf('window.EA_FILES') > 0);
    var back = F.fromText(text);
    eq(back.kind, 'report');
    eq(JSON.stringify(back.data), JSON.stringify(data));
    eq(F.pathOf('report', 'acme'), 'reports/acme.js');
  });

  test('데이터 파일: 같은 파일이 두 번 오면 rev 큰 쪽', function () {
    var c = F.collect([
      { kind: 'report', data: { company: 'acme', rev: 2, quarters: [] } },
      { kind: 'report', data: { company: 'acme', rev: 5, quarters: [1] } },
      { kind: 'report', data: { company: 'acme', rev: 4, quarters: [] } },
      { kind: 'fx', data: { rev: 1, rates: {} } },
    ]);
    eq(c.reports.acme.rev, 5);
    ok(c.fx);
    eq(c.companies, null);
  });

  test('작업본: rev 가 파일보다 클 때만 앞선 것으로 봄', function () {
    var base = { rev: 3 };
    ok(F.isAhead({ rev: 4 }, base));
    ok(!F.isAhead({ rev: 3 }, base), '파일이 따라왔으면 작업본은 버림');
    ok(!F.isAhead(null, base));
    eq(F.bump({ rev: 3 }, base).rev, 4);
    eq(F.bump({ rev: 4 }, base).rev, 5, '저장 안 된 작업본을 또 고치면 계속 오름');
  });

  /* ---------- 사내 모델 답 읽기 ---------- */

  test('JSON 읽기: 울타리, 앞뒤 설명, 마지막 쉼표, 둥근 따옴표', function () {
    var r = P.lenientJson('아래는 결과입니다.\n```json\n{“a”: [1, 2,], "b": "x",}\n```\n도움이 되길');
    ok(r.ok, r.error);
    eq(r.value.a.length, 2);
    ok(r.fixed.length >= 2);
  });

  test('JSON 읽기: 고칠 수 없으면 줄과 글자 위치를 알려 줌', function () {
    var r = P.lenientJson('{\n "a": 1\n "b": 2\n}');
    ok(!r.ok);
    ok(/줄/.test(r.error), r.error);
  });

  test('JSON 읽기: 닫는 괄호가 없으면 끊긴 답으로 봄', function () {
    var r = P.lenientJson('{"a": [1, 2');
    ok(!r.ok);
    ok(/끊겼/.test(r.error), r.error);
  });

  test('콜 요약 검사: 주제 정리, 빈 항목 제외, 날짜 형식', function () {
    var r = P.readCall({
      company: 'Acme',
      period: 'Q2 2026',
      callDate: '2026/7/22',
      summary: '요약',
      highlights: [{ topic: '관세 정책', text: '관세 비용 줄어듦' }, { topic: '신사업', text: '로봇' }, { topic: '실적', text: '' }, '문자열 하이라이트'],
      qa: [{ asker: 'A', question: '질문', answer: '답' }, { question: '답 없음' }],
    }, { companies: COMPANIES });
    ok(r.ok, r.errors.join());
    eq(r.company.id, 'acme');
    eq(r.period, '2026Q2');
    eq(r.call.date, '2026-07-22');
    eq(r.call.highlights.length, 3);
    eq(r.call.highlights[0].topic, '관세·정책', '띄어쓰기만 다른 주제는 맞춰 줌');
    eq(r.call.highlights[1].topic, '기타');
    eq(r.call.highlights[2].topic, '기타');
    eq(r.call.qa.length, 1);
    ok(r.warnings.length >= 3);
  });

  test('콜 요약 검사: 고른 회사와 답의 회사가 다르면 오류', function () {
    var r = P.readCall({ company: 'kmot', period: '2026Q2', summary: 'x' }, { companies: COMPANIES, company: 'acme', period: '2026Q2' });
    ok(!r.ok);
    ok(/다름/.test(r.errors[0]));
  });

  test('콜 요약 검사: 고른 분기가 우선이고 경고를 남김', function () {
    var r = P.readCall({ company: 'acme', period: '2026Q1', summary: 'x' }, { companies: COMPANIES, company: 'acme', period: '2026Q2' });
    ok(r.ok);
    eq(r.period, '2026Q2');
    eq(r.warnings.length, 1);
  });

  test('콜 요약 검사: 내용이 모두 비면 오류', function () {
    var r = P.readCall({ company: 'acme', period: '2026Q2', highlights: [], qa: [] }, { companies: COMPANIES });
    ok(!r.ok);
  });

  test('숫자 검사: 원문 단위를 저장 단위로, 지표 이름 별칭, 누계 분리', function () {
    var r = P.readNumbers({
      company: 'kmot',
      period: '2026Q2',
      currency: 'KRW',
      values: [
        { metric: 'Revenue', value: 46.62, unit: 'trillion', text: '46조 6,200억원' },
        { metric: '영업이익', value: '28,509', unit: '억' },
        { metric: 'deliveries', value: 991885, unit: 'units' },
        { metric: 'netIncome', value: 3.1, unit: 'trillion', basis: 'ytd' },
        { metric: 'ebitda margin', value: 9, unit: 'one' },
      ],
    }, { companies: COMPANIES });
    ok(r.ok, r.errors.join());
    eq(r.numbers.values.revenue, 46620000);
    eq(r.numbers.values.operatingIncome, 2850900);
    eq(r.numbers.values.deliveries, 991.885);
    eq(r.numbers.ytd.netIncome, 3100000);
    eq(r.numbers.raw.revenue, '46조 6,200억원');
    ok(r.warnings.some(function (w) { return /ebitda margin/.test(w); }));
  });

  test('숫자 검사: 객체 형태 values 도 받음', function () {
    var r = P.readNumbers({ company: 'acme', period: '2026Q2', values: { revenue: { value: 48.6, unit: 'billion' }, netIncome: 1200 } }, { companies: COMPANIES });
    ok(r.ok);
    eq(r.numbers.values.revenue, 48600);
    eq(r.numbers.values.netIncome, 1200, '단위가 없으면 백만으로 보고 경고');
    ok(r.warnings.length === 1);
  });

  test('답 종류 짐작', function () {
    eq(P.detect({ values: [] }).join(), 'numbers');
    eq(P.detect({ highlights: [] }).join(), 'call');
    eq(P.detect({ values: [], qa: [] }).join(), 'numbers,call');
    eq(P.detect({ type: 'ea-pack' }).join(), 'pack');
  });

  /* ---------- 합치기 ---------- */

  test('조각별 콜 요약 합치기: 순서 유지, 같은 문장 한 번', function () {
    var c = M.joinCalls([
      { date: '2026-07-22', summary: '총평', highlights: [{ topic: '실적', text: 'A' }], guidance: 'G', qa: [], sources: ['s1'] },
      { date: '', summary: '', highlights: [{ topic: '실적', text: 'A ' }], guidance: '', qa: [{ question: 'Q1', answer: 'x' }], sources: ['s1'] },
      { summary: '', highlights: [], guidance: 'G', qa: [{ question: 'Q2', answer: 'y' }, { question: 'Q1', answer: 'z' }] },
    ]);
    eq(c.summary, '총평');
    eq(c.highlights.length, 1);
    eq(c.qa.map(function (x) { return x.question; }).join(), 'Q1,Q2');
    eq(c.guidance, 'G');
    eq(c.sources.length, 1);
  });

  test('콜 요약 넣기: 없는 분기는 새로 만들고 숫자는 그대로 둠', function () {
    var rep = { company: 'acme', rev: 1, quarters: [{ period: '2026Q1', values: { revenue: 10 }, origin: 'outside' }] };
    var call = { summary: 's', highlights: [], qa: [], guidance: '' };
    var r1 = M.applyCall(rep, COMPANIES[0], '2026Q2', call, { transcript: { source: 'Yahoo Finance' } });
    eq(r1.quarters.length, 2);
    eq(r1.quarters[0].period, '2026Q2', '최근 분기가 먼저');
    eq(r1.quarters[0].call.transcript.source, 'Yahoo Finance');
    eq(r1.quarters[0].status, '검증 필요');
    var r2 = M.applyCall(r1, COMPANIES[0], '2026Q1', call);
    eq(r2.quarters[1].values.revenue, 10);
    eq(r2.quarters[1].origin, 'inside');
    eq(rep.quarters.length, 1, '원본은 그대로');
  });

  test('누계를 분기로: 3월 결산 회사의 2분기(7~9월) 누계에서 1분기를 뺌', function () {
    var rep = { company: 'jparts', quarters: [{ period: '2026Q2', values: { revenue: 400 } }] };
    var res = M.applyNumbers(rep, COMPANIES[2], '2026Q3', { values: {}, ytd: { revenue: 900, netIncome: 50 }, raw: {} });
    eq(C.quarterOf(res.report, '2026Q3').values.revenue, 500);
    eq(C.quarterOf(res.report, '2026Q3').values.netIncome, undefined, '앞 분기 순이익이 없어 넣지 않음');
    eq(res.warnings.length, 1);
    ok(/2026Q2/.test(res.warnings[0]));
  });

  test('누계를 분기로: 회계연도 1분기는 누계가 곧 분기 값', function () {
    var res = M.applyNumbers(null, COMPANIES[2], '2026Q2', { values: {}, ytd: { revenue: 400 }, raw: {} });
    eq(C.quarterOf(res.report, '2026Q2').values.revenue, 400);
    eq(res.report.company, 'jparts');
  });

  test('묶음 가져오기: 새 분기 추가, 같으면 그대로, 사내 수정은 남김, 바깥끼리는 바꿈', function () {
    var reports = {
      acme: { company: 'acme', rev: 2, quarters: [
        { period: '2026Q1', values: { revenue: 1 }, origin: 'inside', updatedAt: 'x' },
        { period: '2025Q4', values: { revenue: 2 }, origin: 'outside', updatedAt: 'y' },
        { period: '2025Q3', values: { revenue: 3 }, origin: 'outside' },
      ] },
    };
    var pack = { type: 'ea-pack', reports: [
      { company: 'Acme', quarters: [
        { period: '2026Q2', values: { revenue: 9 } },
        { period: '2026Q1', values: { revenue: 99 } },
        { period: '2025Q4', values: { revenue: 22 } },
        { period: '2025Q3', values: { revenue: 3 } },
        { period: '2025H1', values: {} },
      ] },
      { company: 'ghost', quarters: [{ period: '2026Q2' }] },
    ] };
    var rows = M.planPack(pack, reports, COMPANIES);
    var act = rows.map(function (r) { return r.period + ':' + r.action; }).join(',');
    eq(act, '2026Q2:add,2026Q1:keep,2025Q4:replace,2025Q3:same,2025H1:skip,2026Q2:skip');
    var changed = M.applyPack(rows, reports);
    var qs = changed.acme.quarters;
    eq(qs.length, 4);
    eq(C.quarterOf(changed.acme, '2026Q1').values.revenue, 1);
    eq(C.quarterOf(changed.acme, '2025Q4').values.revenue, 22);
    eq(C.quarterOf(changed.acme, '2026Q2').origin, 'outside');
  });

  test('묶음 환율은 빈 칸만 채움', function () {
    var r = M.fillFx({ rev: 1, rates: { JPY: { '2026Q2': 150 } } }, { rates: { JPY: { '2026Q2': 999, '2026Q3': 160 }, EUR: { '2026Q3': 0.9 } } });
    eq(r.fx.rates.JPY['2026Q2'], 150);
    eq(r.fx.rates.JPY['2026Q3'], 160);
    eq(r.fx.rates.EUR['2026Q3'], 0.9);
    eq(r.added, 2);
  });

  /* ---------- 프롬프트 ---------- */

  function fakeTranscript(prepLen, qaLen) {
    var prep = 'Operator: Good morning and welcome to the Acme Motors second quarter earnings call.\n\n';
    while (prep.length < prepLen) prep += 'CEO: Revenue grew in North America and margins improved this quarter.\n\n';
    var qa = 'Question-and-Answer Session\n\nOperator: Our first question comes from Jane Doe with Example Securities.\n\n';
    while (qa.length < qaLen) qa += 'Analyst: Can you talk about tariffs?\n\nCFO: We expect lower tariff costs next year.\n\n';
    return prep + qa;
  }

  test('녹취록 나누기: 질의응답 표지에서 나눔', function () {
    var t = fakeTranscript(3000, 3000);
    var sp = PR.splitTranscript(t);
    ok(sp.found);
    ok(/^Question-and-Answer/.test(sp.qa));
    ok(sp.prepared.indexOf('Question-and-Answer') < 0);
  });

  test('녹취록 나누기: 앞머리 사회자 안내의 Q&A 언급은 무시', function () {
    var t = 'Operator: After the remarks there will be a question-and-answer session.\n\n' + fakeTranscript(3000, 3000);
    var sp = PR.splitTranscript(t);
    ok(sp.prepared.indexOf('Operator: After the remarks') === 0, '앞머리가 발표 쪽에 남음');
    ok(/^Question-and-Answer/.test(sp.qa));
  });

  test('조각 자르기: 최대 길이를 넘지 않고 이으면 원문 글자가 모두 있음', function () {
    var t = fakeTranscript(9000, 9000);
    var parts = PR.chunk(t, 4000);
    ok(parts.length >= 5);
    parts.forEach(function (p) { ok(p.length <= 4000, '조각 길이 ' + p.length); });
    eq(parts.join('').replace(/\s/g, ''), t.replace(/\s/g, ''));
  });

  test('콜 프롬프트: 짧으면 하나, 길면 발표와 질의응답 조각으로', function () {
    var co = COMPANIES[0];
    var short = PR.buildCallPrompts(co, '2026Q2', fakeTranscript(2000, 2000), 24000);
    eq(short.prompts.length, 1);
    eq(short.prompts[0].part, 'all');
    var long = PR.buildCallPrompts(co, '2026Q2', fakeTranscript(30000, 30000), 20000);
    ok(long.prompts.length >= 4);
    eq(long.prompts[0].part, 'prepared');
    eq(long.prompts[long.prompts.length - 1].part, 'qa');
    ok(/1\/\d+ 발표/.test(long.prompts[0].title));
    var p = long.prompts[0].text;
    ok(p.indexOf('"acme"') > 0 && p.indexOf('2026Q2') > 0 && p.indexOf('관세·정책') > 0);
    ok(p.indexOf('{{') < 0, '채우지 않은 자리표시가 남지 않음');
  });

  test('프롬프트: 원문 안의 {{ }} 는 바꾸지 않음', function () {
    var p = PR.buildCallPrompts(COMPANIES[0], '2026Q2', 'CEO said {{period}} literally.', 24000).prompts[0].text;
    ok(p.indexOf('CEO said {{period}} literally.') > 0);
  });

  test('숫자 프롬프트: 회사 지표 이름과 부품사 판매 대수 안내', function () {
    var p = PR.buildNumbersPrompt(Object.assign({}, COMPANIES[0], { metricNotes: { adjOperatingIncome: 'EBIT-adjusted' } }), '2026Q2', 'Revenue $1 billion');
    ok(p.indexOf('EBIT-adjusted') > 0);
    ok(p.indexOf('Revenue $1 billion') > 0);
    var q = PR.buildNumbersPrompt(COMPANIES[2], '2026Q2', 'x');
    ok(q.indexOf('부품사라 넣지 않는다') > 0);
    ok(q.indexOf('FY2027 Q1') > 0);
  });
})(typeof window !== 'undefined' ? window : globalThis);
