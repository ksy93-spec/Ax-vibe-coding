// 회사 하나의 분기 실적과 컨퍼런스콜 요약. 금액은 발표 통화 백만 단위, 판매 대수는 천 대.
// 자동 생성 파일입니다. 손으로 고칠 때는 JSON 문법(큰따옴표, 마지막 쉼표 없음)을 지키세요.
(window.EA_FILES = window.EA_FILES || []).push({
 "kind": "report",
 "data": {
  "company": "tesla",
  "rev": 5,
  "quarters": [
   {
    "period": "2026Q3",
    "fiscalLabel": "Q3 2026",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 28046,
     "operatingIncome": 718,
     "deliveries": 486.532
    },
    "raw": {
     "revenue": "Total revenues $28,046 million (정확한 값 28,046 유지)",
     "operatingIncome": "Operating income $718M",
     "deliveries": "486,532"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/0001318605/000162828026066738/exhibit9914.htm https://www.sec.gov/Archives/edgar/data/0001318605/000162828026066775/tsla-20260930.htm",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. Q3 2026 figures read via search summaries that also cited third-party pages; total assets 157,517 / stockholders' equity 89,289 reported there but not confirmed from filing, left null 콜 요약과 센티먼트는 사내 ChatGPT 역할로 시험한 예시. 녹취록 원문을 열지 못해 검색 요약(일부 2차 자료)으로 만들었으므로 원문 대조 필요.",
    "call": {
     "date": "2026-10-21",
     "summary": "매출 $28.05 billion으로 전년 동기와 비슷했고 Income from operations는 $718 million으로 부진했으나 자동차 총마진(크레딧 제외)은 18.1%로 개선됨. 배터리 공급이 판매량 제약 요인이며 로보택시, Optimus, 자체 칩 공장 등 AI 투자 확대 기조임.",
     "highlights": [
      {
       "topic": "실적",
       "text": "매출 $28.05 billion으로 전년 동기와 비슷한 수준이며 시장 예상 $28.06 billion과 유사함"
      },
      {
       "topic": "실적",
       "text": "Income from operations $718 million, 영업이익률 2.6%로 직전 분기 1.4%보다 개선, 전년 동기 5.8%보다 낮음"
      },
      {
       "topic": "실적",
       "text": "Total deliveries 486,532대로 전년 동기 대비 2.1% 감소했으나 시장 예상 상회, 에너지 저장장치 13.7 GWh 설치"
      },
      {
       "topic": "실적",
       "text": "자동차 총마진(크레딧 제외) 18.1%로 직전 분기 16.3%에서 상승, non-GAAP EPS $0.48"
      },
      {
       "topic": "가이던스",
       "text": "자본지출 Q3 $4.73 billion, 잉여현금흐름 $1.53 billion, 현금 및 투자자산 $45.4 billion 보유함"
      },
      {
       "topic": "전동화",
       "text": "신규 북미 인도분의 FSD 장착률 75% 초과, 활성 FSD 구독 1.74 million 수준으로 보도됨"
      },
      {
       "topic": "기타",
       "text": "Robotaxi 누적 무인 주행 거리 약 2 million 마일, Cybercab은 Austin 운행 중이며 연말 전 다른 도시 확대 계획"
      },
      {
       "topic": "공급망·원가",
       "text": "배터리 공급이 분기 중 자동차 판매량 증가의 제약 요인이라고 밝힘"
      },
      {
       "topic": "공급망·원가",
       "text": "Vaibhav Taneja가 원자재 가격과 금리 변화가 원가 부담과 역풍을 키운다는 취지로 언급한 것으로 요약됨"
      },
      {
       "topic": "기타",
       "text": "Terafab은 2027년 상반기 장비 시운전 계획, Musk는 2028년 3분기경 양산 목표를 언급함"
      }
     ],
     "guidance": "2026년 자본지출 가이던스 more than $25 billion을 Q3 주주서한에서 갱신하지 않은 것으로 보도됨(일부 자료는 약 $20 billion으로 하향했다고 하여 불일치). 2026년 말 전 Cybercab 고객 인도 및 도시 확대 계획. 판매량·매출·이익률 수치 가이던스는 확인하지 못함",
     "qa": [
      {
       "asker": "",
       "firm": "",
       "question": "Cybercab 운영이 Austin을 넘어 어떻게 확대되는지와 Austin 밖 규제 경로, NHTSA 안전 검토 상황 질문함",
       "answerer": "Elon Musk",
       "answer": "Austin에 한정될 근본적 이유가 없다고 답함. Dallas 등 연말 전 확대 계획이 요약 자료에 언급됨",
       "topic": "전동화"
      },
      {
       "asker": "",
       "firm": "Wolfe Research",
       "question": "Robotaxi 수익화 시점 질문함",
       "answerer": "Elon Musk",
       "answer": "Robotaxi 사업이 2027년 2분기에 재무적으로 눈에 띄고 같은 해 후반 더 커질 수 있다고 답한 것으로 Zacks가 요약함",
       "topic": "기타"
      },
      {
       "asker": "",
       "firm": "Deutsche Bank",
       "question": "TeraFab 자본지출과 Optimus 설계 변경 관련 질문함",
       "answerer": "Elon Musk",
       "answer": "유용한 칩을 양산 수준으로 만드는 것이 2028년 3분기경이라는 목표를 밝히고 Optimus 증산은 완만하고 다소 불규칙한 곡선이며 1년 안팎 걸린다고 답함",
       "topic": "기타"
      }
     ],
     "sources": [
      "https://www.fool.com/earnings/call-transcripts/2026/10/22/tesla-tsla-q3-2026-earnings-call-transcript/",
      "https://finance.yahoo.com/markets/stocks/articles/tesla-tsla-q3-2026-earnings-075846970.html",
      "https://www.investing.com/news/transcripts/earnings-call-transcript-tesla-beats-q3-2026-estimates-as-stock-slips-after-hours-93CH-4964365",
      "https://www.benzinga.com/news/26/10/62515021/tesla-q3-2026-earnings-call-transcript",
      "https://evwire.com/p/tesla-tsla-q3-2026-earnings-call-full-transcript",
      "https://singjupost.com/transcript-tesla-tsla-q3-2026-earnings-call/",
      "https://www.zacks.com/stock/news/3017138/tsla-q3-earnings-call-highlights-autonomy-and-expansion-plans",
      "https://electrek.co/2026/10/21/tesla-tsla-q3-2026-financial-results/",
      "https://electrek.co/2026/10/21/tesla-battery-supply-limiting-sales-prices-falling/?extended-comments=1",
      "https://www.sec.gov/Archives/edgar/data/0001318605/000162828026064366/exhibit991111111.htm"
     ],
     "transcript": {
      "source": "사내 ChatGPT 검색",
      "url": "https://www.fool.com/earnings/call-transcripts/2026/10/22/tesla-tsla-q3-2026-earnings-call-transcript/",
      "stored": false
     }
    },
    "origin": "inside",
    "updatedAt": "2026-11-02 05:08:53",
    "sentiment": {
     "model": {
      "volume": {
       "score": null,
       "direction": "언급 없음",
       "reason": "판매량 수치 전망은 확인하지 못함",
       "quote": ""
      },
      "revenue": {
       "score": null,
       "direction": "언급 없음",
       "reason": "매출 수치 전망은 확인하지 못함",
       "quote": ""
      },
      "profit": {
       "score": null,
       "direction": "언급 없음",
       "reason": "이익률 가이던스는 확인하지 못함",
       "quote": ""
      },
      "capex": {
       "score": 5,
       "direction": "유지",
       "reason": "연간 자본지출 가이던스를 Q3 주주서한에서 갱신하지 않은 것으로 보도됨",
       "quote": "more than $25 billion"
      },
      "supply": {
       "score": 3,
       "direction": "하향",
       "reason": "배터리 공급이 판매량 증가의 제약 요인이라고 밝힘",
       "quote": "battery availability continued to be the limiting factor"
      },
      "materialsFx": {
       "score": 3,
       "direction": "하향",
       "reason": "원자재 가격과 금리 변화가 원가 부담을 키운다고 언급한 것으로 요약됨",
       "quote": "commodity price increases and interest rate changes continue to add to our cost"
      },
      "demandPrice": {
       "score": 7,
       "direction": "상향",
       "reason": "승용차 백로그가 4년 내 최대이고 FSD 장착률이 75%를 넘음",
       "quote": "largest backlog for our passenger vehicles in four years"
      },
      "tariffPolicy": {
       "score": 5,
       "direction": "유지",
       "reason": "관세 환급이 에너지 마진에 기여했으나 중국산 셀 관세 부담도 보도되어 상쇄됨",
       "quote": ""
      }
     },
     "manual": {},
     "summary": "배터리 공급 제약과 이익 부진을 인정하면서도 백로그, FSD, Robotaxi, Optimus 등 AI 사업 확대에 낙관적인 톤임",
     "scoredAt": "2026-11-02 05:08:53"
    }
   },
   {
    "period": "2026Q2",
    "fiscalLabel": "Q2 2026",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 28240,
     "operatingIncome": 398,
     "deliveries": 480.126
    },
    "raw": {
     "revenue": "Total revenues were $28.24B",
     "operatingIncome": "Income from operations was $398M",
     "deliveries": "480,126"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/0001318605/000162828026049213/exhibit991.htm https://www.sec.gov/Archives/edgar/data/0001318605/000162828026049270/tsla-20260630.htm",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. revenue rounded",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2026Q1",
    "fiscalLabel": "Q1 2026",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 22387,
     "operatingIncome": 941,
     "deliveries": 358.023
    },
    "raw": {
     "revenue": "Total revenues 22,387",
     "operatingIncome": "941",
     "deliveries": "358,023"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/0001318605/000162828026026673/tsla-20260331.htm https://www.sec.gov/Archives/edgar/data/1318605/000162828026022956/exhibit9911111.htm",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전.",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2025Q4",
    "fiscalLabel": "Q4 2025",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 24901,
     "operatingIncome": 1409,
     "deliveries": 418
    },
    "raw": {
     "revenue": "revenues of $24.901 billion",
     "operatingIncome": "operating income decreased 11% YoY to $1.4B",
     "deliveries": "delivered over 418,000 vehicles"
    },
    "source": "https://assets-ir.tesla.com/tesla-contents/IR/TSLA-Q4-2025-Update.pdf https://www.sec.gov/Archives/edgar/data/1318605/000162828026003952/tsla-20251231.htm",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. deliveries rounded (FY2025 1,636,129 total); operating income 1,409 from Q4 statements (search summary), unverified to the unit",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2025Q3",
    "fiscalLabel": "Q3 2025",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 28095,
     "operatingIncome": 1624,
     "deliveries": 497.099
    },
    "raw": {
     "revenue": "28,095",
     "operatingIncome": "1,624",
     "deliveries": "497,099 vehicles delivered in Q3 2025"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000162828025045861/exhibit991.htm",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전.",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2025Q2",
    "fiscalLabel": "Q2 2025",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 22496,
     "operatingIncome": 923,
     "deliveries": 384.122
    },
    "raw": {
     "revenue": "22,496",
     "operatingIncome": "923"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000162828025035806/tsla-20250630.htm https://electrek.co/2025/07/02/tesla-tsla-deliveries-q2-2025/",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전.",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2025Q1",
    "fiscalLabel": "Q1 2025",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 19335,
     "operatingIncome": 399,
     "deliveries": 336.681
    },
    "raw": {
     "revenue": "19,335",
     "operatingIncome": "Income from operations | 399 | 1171"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000162828025018911/tsla-20250331.htm https://driveteslacanada.ca/news/tesla-delivers-384122-vehicles-in-q2-2025-energy-continues-to-shine/",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전.",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2024Q4",
    "fiscalLabel": "Q4 2024",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 25707,
     "operatingIncome": 1583,
     "deliveries": 495.57
    },
    "raw": {
     "revenue": "25,707",
     "operatingIncome": "1,583",
     "deliveries": "Tesla delivers 495,570 cars globally in Q4"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000162828025002993/exhibit991.htm https://cnevpost.com/2025/01/02/tesla-global-deliveries-q4-2024/",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전.",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2024Q3",
    "fiscalLabel": "Q3 2024",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 25182,
     "operatingIncome": 2717,
     "deliveries": 462.89
    },
    "raw": {
     "revenue": "25,182",
     "operatingIncome": "2,717"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000162828025002993/exhibit991.htm https://longportapp.cn/news/259927383",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전.",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2024Q2",
    "fiscalLabel": "Q2 2024",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 25500,
     "operatingIncome": 1605,
     "deliveries": 443.956
    },
    "raw": {
     "revenue": "25,500",
     "operatingIncome": "1,605",
     "deliveries": "443,956 vehicles"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000162828025002993/exhibit991.htm https://www.sec.gov/Archives/edgar/data/1318605/000162828024030714/exhibit991.htm",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전.",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2024Q1",
    "fiscalLabel": "Q1 2024",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 21301,
     "operatingIncome": 1171,
     "deliveries": 387
    },
    "raw": {
     "revenue": "21,301",
     "operatingIncome": "1,171",
     "deliveries": "delivered approximately 387,000 vehicles"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000162828025002993/exhibit991.htm",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. deliveries rounded",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2023Q4",
    "fiscalLabel": "Q4 2023",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 25167,
     "operatingIncome": 2064,
     "deliveries": 484
    },
    "raw": {
     "revenue": "25,167",
     "operatingIncome": "2,064",
     "deliveries": "delivered over 484,000 vehicles"
    },
    "source": "https://electrek.co/wp-content/uploads/sites/3/2024/01/TSLA-Q4-2023-Update.pdf https://www.sec.gov/Archives/edgar/data/1318605/000095017024000282/tsla-ex99_1.htm",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. deliveries rounded (over 484,000)",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2023Q3",
    "fiscalLabel": "Q3 2023",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 23350,
     "operatingIncome": 1764,
     "deliveries": 435.059
    },
    "raw": {
     "revenue": "23,350",
     "operatingIncome": "1,764"
    },
    "source": "https://electrek.co/wp-content/uploads/sites/3/2024/01/TSLA-Q4-2023-Update.pdf https://www.marklines.com/en/news/295491",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전.",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2023Q2",
    "fiscalLabel": "Q2 2023",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 24927,
     "operatingIncome": 2399,
     "deliveries": 466.14
    },
    "raw": {
     "revenue": "24,927",
     "operatingIncome": "2,399"
    },
    "source": "https://electrek.co/wp-content/uploads/sites/3/2024/01/TSLA-Q4-2023-Update.pdf https://www.cnbc.com/2023/10/02/tesla-tsla-q3-2023-vehicle-delivery-and-production-numbers.html",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전.",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2023Q1",
    "fiscalLabel": "Q1 2023",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 23329,
     "operatingIncome": 2664,
     "deliveries": 422.875
    },
    "raw": {
     "revenue": "23,329",
     "operatingIncome": "2,664"
    },
    "source": "https://electrek.co/wp-content/uploads/sites/3/2024/01/TSLA-Q4-2023-Update.pdf https://benzinga.com/z/35068972",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. 보충: quarterly table",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2022Q4",
    "fiscalLabel": "Q4 2022",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 24318,
     "operatingIncome": 3901,
     "deliveries": 405.278
    },
    "raw": {
     "revenue": "24,318",
     "operatingIncome": "3,901",
     "deliveries": "record 405,278 vehicle deliveries"
    },
    "source": "https://electrek.co/wp-content/uploads/sites/3/2024/01/TSLA-Q4-2023-Update.pdf",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전.",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2022Q3",
    "fiscalLabel": "Q3 2022",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 21454,
     "operatingIncome": 3700,
     "deliveries": 343.83
    },
    "raw": {
     "revenue": "Total $ 21,454",
     "operatingIncome": "$3.7B GAAP operating income; 17.2% operating margin"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000095017022019867/tsla-20220930.htm https://www.cnbc.com/2023/10/02/tesla-tsla-q3-2023-vehicle-delivery-and-production-numbers.html",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. operating income rounded",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2022Q2",
    "fiscalLabel": "Q2 2022",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 16900,
     "operatingIncome": 2464,
     "deliveries": 254.695
    },
    "raw": {
     "revenue": "Total revenue grew 42% YoY in Q2 to $16.9B",
     "operatingIncome": "2,464 (six-month 6,067)"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000095017022012936/tsla-20220630.htm https://benzinga.com/z/35068972",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. revenue rounded 보충: quarterly table",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2022Q1",
    "fiscalLabel": "Q1 2022",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 18756,
     "operatingIncome": 3603,
     "deliveries": 310.048
    },
    "raw": {
     "revenue": "Total revenues $18,756",
     "operatingIncome": "Income from operations 3,603"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000095017022006034/tsla-20220331.htm https://insideevs.com/news/577387/tesla-q1-2022-deliveries/",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전.",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2021Q4",
    "fiscalLabel": "Q4 2021",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 17700,
     "operatingIncome": 2613,
     "deliveries": 308.6
    },
    "raw": {
     "revenue": "Total revenue grew 65% YoY in Q4 to $17.7B",
     "operatingIncome": "575 594 1,312 2,004 2,613"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000156459022002476/tsla-ex991_209.htm https://insideevs.com/news/577387/tesla-q1-2022-deliveries/",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. revenue rounded; stockholders' equity 30,189 excludes NCI 보충: Prior record cited in Q1 2022 coverage",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2021Q3",
    "fiscalLabel": "Q3 2021",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 13757,
     "operatingIncome": 2004,
     "deliveries": 241.3
    },
    "raw": {
     "revenue": "Total revenues 13,757",
     "operatingIncome": "575 594 1,312 2,004 2,613"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000156459021051307/tsla-ex991_85.htm https://www.sec.gov/Archives/edgar/data/1318605/000156459021049874/tsla-ex991_6.htm https://electrek.co/2021/10/02/tesla-tsla-q3-2021-deliveries/",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. stockholders' equity 27,053 excludes NCI 보충: Tesla 8-K ex99.1; 232,025 Model3/Y + 9,275 S/X.",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2021Q2",
    "fiscalLabel": "Q2 2021",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "operatingIncome": 1312,
     "revenue": 11958,
     "deliveries": 201.25
    },
    "raw": {
     "operatingIncome": "575 594 1,312 2,004 2,613",
     "revenue": "Total revenues $11,958 million, +98% YoY"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000156459021002645/tsla-ex991_99.htm https://cleantechnica.com/2021/07/26/teslas-11-958-billion-in-revenue-is-accelerating-our-transition-to-sustainability/ https://insideevs.com/news/516922/tesla-q2-2021-deliveries/",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. revenue not confirmed in searches; stockholders' equity 24,804 excludes NCI",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2021Q1",
    "fiscalLabel": "Q1 2021",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 10389,
     "operatingIncome": 594,
     "deliveries": 184.8
    },
    "raw": {
     "revenue": "Total revenues $18,756 $10,389",
     "operatingIncome": "575 594 1,312 2,004 2,613"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000095017022006034/tsla-20220331.htm https://www.sec.gov/Archives/edgar/data/1318605/000156459021002645/tsla-ex991_99.htm https://electrive.com/2021/07/03/tesla-built-and-delivered-over-200000-bevs-during-q2",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. stockholders' equity 23,017 excludes NCI 보충: Tesla release figure (rounded to 100)",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2020Q4",
    "fiscalLabel": "Q4 2020",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 10744,
     "operatingIncome": 575,
     "deliveries": 180.57
    },
    "raw": {
     "revenue": "2020-10-01 to 2020-12-31: $10,744 million",
     "operatingIncome": "INCOME FROM OPERATIONS 575 594 1,312 2,004 2,613"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000156459021004599/Financial_Report.xlsx https://www.sec.gov/Archives/edgar/data/1318605/000156459021002645/tsla-ex991_99.htm https://insideevs.com/news/463594/tesla-q4-deliveries-2020-record/ https://www.cnbc.com/2021/01/02/tesla-tsla-q4-2020-vehicle-delivery-and-production-numbers.html",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. stockholders' equity 22,225 excludes NCI so totalEquity left null 보충: FY2020 499,550 consistent.",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2020Q3",
    "fiscalLabel": "Q3 2020",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 8771,
     "operatingIncome": 809,
     "deliveries": 139.3
    },
    "raw": {
     "revenue": "Total revenues 8,771",
     "operatingIncome": "record level of $809M, 9.2% operating margin"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000156459020047108/tsla-ex991_57.htm https://insideevs.com/news/463594/tesla-q4-deliveries-2020-record/",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. 보충: From trade coverage (InsideEVs) of Q4 2020 record; Tesla own release not seen.",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2020Q2",
    "fiscalLabel": "Q2 2020",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 6036,
     "operatingIncome": 327,
     "deliveries": 90.65
    },
    "raw": {
     "revenue": "Total revenues ... 6,036",
     "operatingIncome": "Q2-2020: 327",
     "deliveries": "delivered approximately 90,650 vehicles"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000156459020031568/tsla-ex991_24.htm",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. deliveries are Tesla's rounded press-release figure (approximate)",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   },
   {
    "period": "2020Q1",
    "fiscalLabel": "Q1 2020",
    "reportDate": "",
    "currency": "USD",
    "values": {
     "revenue": 5985,
     "operatingIncome": 283,
     "deliveries": 88.4
    },
    "raw": {
     "revenue": "Total revenues 6,303 7,384 5,985 6,036 8,771",
     "operatingIncome": "Q1-2020: 283"
    },
    "source": "https://www.sec.gov/Archives/edgar/data/1318605/000156459020033670/Financial_Report.xlsx https://www.sec.gov/Archives/edgar/data/1318605/000156459020014992/tsla-ex991_6.htm https://electrek.co/2020/04/02/tesla-delivery-production-q1-2020/",
    "status": "검증 필요",
    "note": "웹 검색으로 회사 문서 인용을 확인한 값. 원문 대조 전. 보충: Tesla quarterly production and deliveries release (8-K ex99.1).",
    "call": null,
    "origin": "outside",
    "updatedAt": "2026-11-02 00:00:00"
   }
  ],
  "savedAt": "2026-11-02 05:08:53"
 }
});
