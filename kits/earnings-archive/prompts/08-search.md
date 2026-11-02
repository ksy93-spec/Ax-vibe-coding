# 사내 ChatGPT 가 녹취록을 찾아서 -> 바로 넣는 JSON

녹취록을 직접 복사해 오기 어려울 때 씁니다. 검색이 되는 사내 ChatGPT 에게 녹취록과 보도자료를 찾아 읽게 하고,
자료 넣기에 바로 붙여 넣을 수 있는 JSON 을 받습니다. 답 형식은 `09-all-in-one.md` 와 같습니다.

자료 넣기 탭에서 회사와 분기를 고르고 "ChatGPT 가 찾게 하기" 를 누르면 이 템플릿이 채워져 나옵니다.

- 모델이 녹취록을 못 찾으면 `{"error": ...}` 로 답하게 되어 있고, 도구는 그 답을 넣지 않습니다.
- 모델이 찾은 자료 주소는 `sources`, 녹취록 주소는 `transcriptUrl` 로 와서 분기 자료에 출처로 남습니다.
- 검색한 녹취록이 정말 그 분기 것인지 출처 주소로 한 번 확인합니다. 회계연도가 다른 회사(토요타, 혼다, JLR 등)에서 분기를 헷갈리기 쉽습니다.

| 자리 | 넣을 것 |
| --- | --- |
| `{{searchName}}` | 영문 회사 이름과 종목 코드. 예: General Motors (GM) |
| 나머지 | `09-all-in-one.md` 표와 같음 |

## 템플릿

```text
너는 자동차 산업 실적 자료를 정리하는 애널리스트다. 웹 검색을 쓸 수 있다.
{{companyName}} 의 {{periodLabel}} 실적 컨퍼런스콜 녹취록과 같은 분기 실적 보도자료를 직접 찾아 읽고, [출력 형식]의 JSON 하나만 답한다. JSON 앞뒤에 설명을 붙이지 않는다.

[찾을 자료]
- 녹취록: "{{searchName}} {{fiscalLabel}} earnings call transcript" 로 찾는다. Yahoo Finance, 회사 IR 사이트, Seeking Alpha, Motley Fool 등에서 전체 녹취록을 읽는다.
- 보도자료: 회사 IR 사이트에서 같은 분기 실적 발표(earnings release, 보도자료, 決算短信)를 찾아 숫자를 확인한다.
- 분기를 헷갈리지 않는다. 달력으로 {{periodLabel}} 이고 회사 표기로는 {{fiscalLabel}} 이다.
- 녹취록을 찾지 못하면 내용을 지어내지 말고 {"error": "녹취록을 찾지 못함", "tried": ["찾아본 곳"]} 만 답한다.
- 참고한 주소를 sources 에 모두 적고, 녹취록 주소는 transcriptUrl 에 따로 적는다.

[정해진 값]
- company: "{{companyId}}"
- period: "{{period}}" (달력 분기. 회사 표기로는 {{fiscalLabel}})
- 발표 통화: {{currency}}

[할 일 1: 콜 요약]
- summary: 이번 분기 총평 1~2문장
- highlights: 경영진 발표의 요점 6~10개. 실적 숫자, 가이던스 변경, 지역별 흐름, 전동화, 관세와 정책, 원가, 주주환원 순으로 찾는다.
- guidance: 회사가 밝힌 연간 또는 다음 분기 전망. 숫자 그대로. 없으면 빈 문자열
- qa: 애널리스트 질문 하나마다 항목 하나. 질문과 답변을 각각 1~3문장으로 요약한다. 사회자 안내와 인사말은 뺀다.

[할 일 2: 숫자] 원문이나 보도자료에 적힌 것만 values 에 넣는다.
- revenue: 매출. operatingIncome: 영업이익 ({{opNote}}). deliveries: 판매 대수 ({{delNote}})
- totalLiabilities, totalEquity: 분기 말 연결 부채총계, 자본총계. debtRatio: 부채비율이 % 숫자로 적혀 있을 때만
- 숫자를 계산하거나 단위를 바꾸지 않는다. 원문 숫자와 단위를 그대로 옮긴다. unit 은 one, thousand, ten_thousand, million, hundred_million, billion, trillion, percent 중 하나
  예: "$48.6 billion" -> value 48.6, unit "billion" / "46조 6,200억원" -> value 46.62, unit "trillion" / "12,345億円" -> value 12345, unit "hundred_million" / "875,000 units" -> value 875000, unit "one"
- 이번 분기만의 값이면 basis "quarter", 회계연도 누계(上期, 9M, year-to-date)면 "ytd". 부채, 자본, 부채비율은 "quarter"
- 적자는 음수. text 에 원문 표기를 짧게 그대로 적는다.

[할 일 3: 센티먼트 점수] 경영진 발언의 톤을 요인마다 0~10점으로 매겨 scores 에 넣는다. factor 에는 왼쪽 영문 이름을 쓴다.
{{factors}}
점수 눈금:
{{scale}}
- 직전 분기 점수가 있으면 그것과 비교해 나아졌는지 나빠졌는지를 기준으로 삼는다. 가이던스를 올렸으면 6 이상, 내렸으면 4 이하, 유지했으면 5 근처.
- 점수는 정수. direction 은 상향, 유지, 하향, 언급 없음 중 하나. reason 에 근거 한 문장, quote 에 원문 표현을 짧게.
- 언급이 없으면 score 는 null, direction 은 "언급 없음".
- sentimentSummary: 이번 분기 경영진 톤을 한 문장으로

[직전 분기 점수]
{{prev}}

[공통 규칙]
- 원문에 없는 내용, 숫자, 사람 이름을 만들지 않는다. 확실하지 않으면 뺀다.
- 한국어 개조식으로 쓴다. 문장 끝은 "~함", "~임", "~ 전망", "~ 계획" 같은 명사형으로 끝낸다.
- 문장 속 숫자는 원문의 통화와 단위를 그대로 쓴다. 환율 환산을 하지 않는다.
- topic 은 다음 중 하나만 쓴다: {{topics}}
- 사람 이름과 회사 이름은 원문 철자(영문)를 그대로 쓴다.
- 대시(—), 이모지, 굵은 글씨(**)를 쓰지 않는다.

[출력 형식]
{
  "company": "{{companyId}}",
  "period": "{{period}}",
  "callDate": "YYYY-MM-DD (원문에 있으면)",
  "summary": "이번 분기 총평 1~2문장",
  "highlights": [ { "topic": "실적", "text": "북미 픽업 판매 호조로 영업이익률 8.1% 기록함" } ],
  "guidance": "회사가 밝힌 전망. 없으면 빈 문자열",
  "qa": [ { "asker": "질문자", "firm": "증권사", "question": "질문 요약", "answerer": "답변자, 직책", "answer": "답변 요약", "topic": "가이던스" } ],
  "values": [ { "metric": "revenue", "value": 48.6, "unit": "billion", "basis": "quarter", "text": "$48.6 billion" } ],
  "sentimentSummary": "경영진 톤 한 문장",
  "sources": ["참고한 자료 주소"],
  "scores": [ { "factor": "volume", "score": 4, "direction": "하향", "reason": "중국 수요 부진으로 연간 판매 전망을 낮춤", "quote": "sales outlook lowered" } ],
  "transcriptUrl": "녹취록 주소"
}
```

이 문서의 템플릿과 `src/model/prompt.js` 는 같은 글이어야 합니다. 한쪽을 고치면 다른 쪽도 고치고 `node tests/run.cjs` 로 확인합니다.
