# 녹취록 한 번에 -> 콜 요약 + 숫자 + 센티먼트 JSON (기본)

자료 넣기 탭의 기본 방식입니다. 녹취록 전체(와 보도자료)를 붙여 넣고 "프롬프트 만들기" 를 누르면 이 템플릿이 채워진 프롬프트 하나가 나옵니다.
ChatGPT Enterprise 대화창에 한 번 붙여 넣고, 답(JSON 하나)을 자료 넣기 4번 칸에 한 번 붙여 넣으면 끝입니다.

- 녹취록 한 편은 보통 영문 6~10만 자로, ChatGPT Enterprise 에 한 번에 들어갑니다.
- 답이 중간에 끊기거나 모델이 "너무 길다" 고 하면 화면의 "나눠서 하기" 를 켭니다. 그때는 `10-call-summary.md`, `11-numbers.md`, `12-sentiment.md` 를 조각별로 씁니다.
- 숫자는 원문 단위 그대로 받아 도구가 바꿉니다. 부채비율, 영업이익률은 도구가 계산합니다.
- 센티먼트 점수는 직전 분기 점수와 비교해 매기게 합니다. 요인 이름과 설명은 관리 탭 "센티먼트 설정" 에서 고친 내용이 들어갑니다.

| 자리 | 넣을 것 |
| --- | --- |
| `{{opNote}}`, `{{delNote}}` | `11-numbers.md` 표와 같음 |
| `{{factors}}`, `{{scale}}`, `{{prev}}` | `12-sentiment.md` 표와 같음 |
| `{{release}}` | 보도자료 요약표. 없으면 "없음" |
| `{{text}}` | 녹취록 전체 |
| 나머지 | `10-call-summary.md` 표와 같음 |

## 템플릿

```text
너는 자동차 산업 실적 자료를 정리하는 애널리스트다.
아래 [원문]은 {{companyName}} 의 {{periodLabel}} 실적 컨퍼런스콜 녹취록이고, [보도자료]는 같은 분기 실적 보도자료다(없을 수 있음).
원문을 처음부터 끝까지 읽고 [출력 형식]의 JSON 하나만 답한다. JSON 앞뒤에 설명을 붙이지 않는다.

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
  "scores": [ { "factor": "volume", "score": 4, "direction": "하향", "reason": "중국 수요 부진으로 연간 판매 전망을 낮춤", "quote": "sales outlook lowered" } ]
}

[보도자료]
{{release}}

[원문]
{{text}}
```

이 문서의 템플릿과 `src/model/prompt.js` 는 같은 글이어야 합니다. 한쪽을 고치면 다른 쪽도 고치고 `node tests/run.cjs` 로 확인합니다.
