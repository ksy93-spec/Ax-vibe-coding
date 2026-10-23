# 실적 보도자료 -> 숫자 JSON

도구의 **자료 넣기** 탭에서 "보도자료 숫자" 칸에 원문을 붙여 넣으면 아래 템플릿이 채워져 나옵니다.
보도자료의 손익 요약표(매출, 영업이익)와 재무상태표 요약(부채총계, 자본총계)만 복사해도 충분합니다. 전체 PDF 를 붙여 넣으면 사내 모델이 엉뚱한 표의 숫자를 고르기 쉽습니다.

부채비율은 모델에게 계산시키지 않습니다. 부채총계와 자본총계를 받아 도구가 `부채총계 / 자본총계 x 100` 으로 계산합니다.
원문에 부채비율만 적혀 있으면(국내 회사 보도자료에 흔함) 그 숫자를 `debtRatio` 로 받아 씁니다. 둘 다 있으면 계산 값이 우선입니다.

사내 모델에게 단위 환산을 시키지 않습니다. 모델은 원문 숫자와 단위(billion, 조, 億円 등)를 그대로 옮기고, 도구가 백만 단위로 바꿉니다.
환산 실수는 이 작업에서 가장 흔한 오류입니다.

일본 회사처럼 누계(上期, 9M)만 발표하는 경우 모델이 매출, 영업이익의 basis 를 "ytd" 로 적습니다. 도구가 같은 회계연도 앞 분기 값을 빼서 분기 값을 만듭니다.
앞 분기 자료가 없으면 그 지표는 넣지 않고 경고를 띄웁니다. 부채총계, 자본총계는 분기 말 잔액이라 누계 계산을 하지 않습니다.

| 자리 | 넣을 것 |
| --- | --- |
| `{{opNote}}` | 회사가 영업이익으로 쓰는 이름. 관리 탭 회사 목록의 "영업이익 이름" 에 적어 둔 것. 없으면 "회사가 공식 영업이익으로 쓰는 값. 조정(adjusted) 값이 아니라 공시 값" |
| 나머지 | `10-call-summary.md` 표와 같음 |

## 템플릿

```text
너는 자동차 산업 실적 자료를 정리하는 애널리스트다.
아래 [원문]은 {{companyName}} 의 {{periodLabel}} 실적 보도자료 또는 실적표다.
원문에서 숫자를 찾아 [출력 형식]의 JSON 하나만 답한다. JSON 앞뒤에 설명을 붙이지 않는다.

[정해진 값]
- company: "{{companyId}}"
- period: "{{period}}" (달력 분기. 회사 표기로는 {{fiscalLabel}})
- 발표 통화: {{currency}}

[찾을 숫자] (원문에 없는 것은 넣지 않는다)
- revenue: 매출 (Revenue, Net sales, 売上高, 매출액). 이번 분기 값
- operatingIncome: 영업이익 (Operating income, EBIT, Operating result, 営業利益). {{opNote}}
- totalLiabilities: 분기 말 연결 부채총계 (Total liabilities, 負債合計)
- totalEquity: 분기 말 연결 자본총계 (Total equity, 純資産合計). 비지배지분 포함 합계
- debtRatio: 원문에 부채비율(%)이 숫자로 적혀 있을 때만. 직접 계산하지 않는다. unit 은 "percent"

[규칙]
- 숫자를 계산하거나 단위를 바꾸지 않는다. 원문에 적힌 숫자와 단위를 그대로 옮긴다.
- unit 은 다음 중 하나: one, thousand, ten_thousand, million, hundred_million, billion, trillion, percent
  예: "$48.6 billion" -> value 48.6, unit "billion" / "46조 6,200억원" -> value 46.62, unit "trillion" / "12,345億円" -> value 12345, unit "hundred_million" / "1,234百万円" -> value 1234, unit "million" / "부채비율 152.3%" -> value 152.3, unit "percent"
- 매출과 영업이익: 원문이 이번 분기만의 값이면 basis 는 "quarter", 회계연도 시작부터 쌓인 누계(예: 上期, 9M, year-to-date)면 "ytd"
- 부채총계, 자본총계, 부채비율: 분기 말 값이므로 basis 는 "quarter"
- 적자는 음수로 적는다. 괄호 표기 (123) 은 -123
- text 에는 원문 표기를 짧게 그대로 적는다.

[출력 형식]
{
  "company": "{{companyId}}",
  "period": "{{period}}",
  "fiscalLabel": "회사가 부르는 분기 이름 (예: Q3 2026, FY2027 Q1)",
  "reportDate": "YYYY-MM-DD (발표일)",
  "currency": "{{currency}}",
  "values": [
    { "metric": "revenue", "value": 48.6, "unit": "billion", "basis": "quarter", "text": "$48.6 billion" }
  ]
}

[원문]
{{text}}
```

이 문서의 템플릿과 `src/model/prompt.js` 는 같은 글이어야 합니다. 한쪽을 고치면 다른 쪽도 고치고 `node tests/run.cjs` 로 확인합니다.
