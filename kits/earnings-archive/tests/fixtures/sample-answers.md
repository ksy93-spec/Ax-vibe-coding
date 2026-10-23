# 연습용 모델 답

`sample-transcript.txt` (가상 회사) 를 넣었을 때 사내 모델이 돌려줄 법한 답입니다. 자료 넣기 4번 칸에 붙여 넣어 흐름을 연습합니다.
연습 뒤에는 회사별 화면에서 그 분기를 지우거나, 관리 탭 "파일로 저장" 에서 되돌리기를 누릅니다. 실제 자료와 섞이지 않게 합니다.

회사는 1번에서 고른 회사로 들어갑니다. 아래 답의 `company` 를 1번에서 고른 회사 id 로 바꿔야 검사를 통과합니다
(예: 현대자동차를 골랐으면 `"hyundai"`).

## 콜 요약 답 (조각 하나로 했을 때)

```json
{
  "company": "hyundai",
  "period": "2026Q2",
  "callDate": "2026-07-24",
  "summary": "[연습용 가상 자료] 매출 6% 성장, 영업이익률 6.5%. 연간 가이던스 유지, 도매 목표 상향.",
  "highlights": [
    { "topic": "실적", "text": "매출 52.3조 원(전년 대비 +6%), 영업이익 3.4조 원, 영업이익률 6.5% 기록함" },
    { "topic": "지역", "text": "미국 하이브리드 판매 38% 증가, 미국 소매 판매 중 하이브리드 비중 21%" },
    { "topic": "지역", "text": "유럽 수요 부진으로 소형 2개 차종 생산 축소함" },
    { "topic": "전동화", "text": "2세대 배터리 플랫폼 4분기 양산, kWh 당 원가 약 15% 절감 전망. 보급형 트림에 LFP 적용" },
    { "topic": "관세·정책", "text": "분기 관세 비용 6,400억 원, 현지 조달과 가격 조정으로 절반가량 상쇄함" },
    { "topic": "SDV·전장", "text": "3개 차종 인포테인먼트, ADAS 도메인 제어기 OTA 시작. 27인치 필러 투 필러 디스플레이 콕핏 내년 출시, 디스플레이 모듈 공급사 확정" },
    { "topic": "주주환원", "text": "자사주 1조 원 추가 매입, 주당 중간배당 2,500원" }
  ],
  "guidance": "2026년 매출 성장률 5~6%, 영업이익률 6~7% 유지. 도매 판매 목표 410만 대로 상향(기존 400만 대)",
  "qa": [
    { "asker": "James Park", "firm": "Alpha Securities", "question": "하반기 관세 영향과 상쇄분 중 구조적인 몫은?", "answerer": "Maria Lopez, CFO", "answer": "상쇄분의 약 3분의 2가 철강, 배터리 모듈 현지 조달 같은 구조적 효과임. 하반기 관세 총비용 약 1.1조 원, 순영향은 상반기보다 작을 전망", "topic": "관세·정책" },
    { "asker": "Sophie Martin", "firm": "Beta Capital", "question": "유럽 추가 감산 가능성과 이익률 영향은?", "answerer": "Daniel Stone, CEO", "answer": "추가 감산 계획 없음. 유럽 재고 약 55일로 적정. 가이던스에 하반기 유럽 약세 반영됨", "topic": "지역" },
    { "asker": "Kenji Ito", "firm": "Gamma Research", "question": "새 콕핏 디스플레이의 대당 탑재량과 공급사 이원화 계획은?", "answerer": "Daniel Stone, CEO", "answer": "대당 디스플레이 탑재량 현재의 약 2배. 첫 출시는 단일 공급사, 다음 연식부터 2nd 소스 승인. 공급사 이름은 밝히지 않음", "topic": "SDV·전장" },
    { "asker": "Laura Chen", "firm": "Delta Partners", "question": "하이브리드 수익성과 미국 하이브리드 증설 계획은?", "answerer": "Maria Lopez, CFO", "answer": "하이브리드 이익률은 내연기관 대비 1%p 이내. 내년 미국 공장에 연 15만 대 하이브리드 설비 추가 계획", "topic": "전동화" },
    { "asker": "Peter Novak", "firm": "Epsilon Bank", "question": "향후 2년 자본 배분 방향은?", "answerer": "Maria Lopez, CFO", "answer": "순이익의 평균 35% 주주환원, 설비투자는 매출의 약 6% 유지. 추가 자사주 매입도 이 정책 안에 있음", "topic": "주주환원" }
  ]
}
```

## 숫자 답

```json
{
  "company": "hyundai",
  "period": "2026Q2",
  "fiscalLabel": "Q2 2026",
  "reportDate": "2026-07-24",
  "currency": "KRW",
  "values": [
    { "metric": "revenue", "value": 52.3, "unit": "trillion", "basis": "quarter", "text": "52.3 trillion won" },
    { "metric": "operatingIncome", "value": 3.4, "unit": "trillion", "basis": "quarter", "text": "3.4 trillion won" },
    { "metric": "netIncome", "value": 2.6, "unit": "trillion", "basis": "quarter", "text": "2.6 trillion won" },
    { "metric": "deliveries", "value": 1020000, "unit": "one", "basis": "quarter", "text": "1,020,000 units" }
  ]
}
```
