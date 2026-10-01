# 디스플레이 수요 시뮬레이터 명세

## 1. 한 줄 요약

주요 지역(중국, 북미, 유럽, 한국, 일본)과 기타 지역의 OEM 별 월 M/S trend 로 실적 마지막 해 + 2년 12월까지 차량 판매를 전망하고,
외생변수(EV 보조금, CO2 규제, 자율주행 규제, 관세, 경기)를 범위와 함께 넣어 Worst / Base / Best 를 만든 뒤,
차량 디스플레이 TAM 과 자사 M/S, 전략·유지고객 수요를 연 단위로 보고하는 HTML 도구.

## 2. 쓰는 사람과 상황

분석가가 데이터와 외생변수를 넣고, 임원 보고서 한 장(인쇄, PDF)과 CSV 로 보고합니다.
임원 보고서는 순서가 정해져 있습니다: 디스플레이 TAM → 주요 지역 비중 → 자사 M/S → 전략·유지고객 비중 → 그 고객들의 수요 전망.

### 화면에 쓰는 말

사업부에서 쓰는 용어를 그대로 씁니다.

| 말 | 뜻 |
| --- | --- |
| 차량 TAM | 차량 판매 대수 |
| 디스플레이 TAM | 차량 판매 x 대당 디스플레이 (EA) |
| OEM M/S | 지역 차량 판매 중 그 OEM 비중 |
| 브랜드 내 자사 M/S | 그 OEM 이 쓰는 디스플레이 중 자사 공급 비중 (입력값) |
| 자사 M/S | 디스플레이 TAM 중 자사 물량 비중 (계산값) |
| Powertrain | BEV, PHEV, HEV, ICE |
| 주요 지역 / 기타 지역 | 주요 지역은 따로 보고, 나머지는 "기타 지역" 하나로 합침 |
| Trend | 외생변수 없이 M/S trend 만 이어 간 전망 |
| Worst / Base / Best | 외생변수를 반영한 세 시나리오 (4.4절) |
| 2025A / 2026E / 2027F | 실적 / 실적+전망 / 전망 연도 |
| 전략고객 / 유지고객 | OEM 고객 구분 (입력값) |
| Pull-forward | 시작 전 선구매(막차 수요). 시작 뒤 같은 물량이 빠짐 |

코드 안에서는 Trend 를 기준선(baseline), 외생변수를 충격 카드(card), 차량 TAM 을 TIV 라고도 씁니다.

## 3. 입력

### 3.1 월별 판매 CSV (필수)

| 표준 필드 | 알아보는 열 이름 (대소문자, 공백 무시) | 필수 | 예시 |
| --- | --- | --- | --- |
| month | Month, YYYYMM, Period, Date, 월, 기간, 년월 | 예 | 2026-08, 202608, 2026/8 |
| region | Region, Sales Region, 지역, 권역 | 예 | CN, North America, 북미 |
| country | Country, Sales Country, 국가 | 아니오 | DE, Germany, 독일 |
| brand | Brand, Sales Brand, Make, OEM, 브랜드 | 예 | Hyundai |
| units | Units, Volume, Sales Volume, Sales, Qty, 판매량 | 예 | 12,345 |

### 3.2 분기별 Powertrain CSV (선택)

quarter(2026-Q2, 2Q26 등. 월이면 그 분기로 합침), region, brand, powertrain(대문자로 정리), units.
월별 OEM 판매를 분기 비중으로 나눕니다(4.1).

### 3.3 디스플레이 가정 CSV (선택, 화면에서 직접 입력 가능)

| 표준 필드 | 알아보는 열 이름 | 예시 |
| --- | --- | --- |
| brand | Brand, Sales Brand, OEM, 고객사 | Hyundai |
| region | Region, 지역 (비우면 모든 지역) | CN |
| panels | Panels per vehicle, Displays, 대당 디스플레이 | 2.4 |
| share | Our share, 브랜드 내 자사 M/S, 공급 비중 | 25%, 25, 0.25 |
| tier | Tier, 고객 구분 | 전략고객, 유지고객, Strategic, Maintain |

브랜드 내 자사 M/S 와 고객 구분은 사내 자료입니다. 작업 파일(.json)과 브라우저 자동 저장에 들어가므로 사내 PC 밖으로 내보내지 않습니다.

## 4. 계산

### 4.1 실적 정리

- 관측 OEM 이 아닌 OEM 은 "기타", 주요 지역이 아닌 지역은 "기타 지역" 으로 합칩니다. 합계는 바뀌지 않습니다.
- 기본 주요 지역은 이름이 중국, 북미, 유럽, 한국, 일본으로 읽히는 지역입니다(NA, North America, 북미 모두 됨). 하나도 없으면 판매 상위 5개.
- 월별 OEM 합계를 분기 Powertrain 비중으로 나눕니다. 분기 비중을 가운데 달에 놓고 보간한 값으로 시작해,
  월 합계와 분기 Powertrain 합계를 둘 다 맞출 때까지 번갈아 비례 조정(IPF)합니다. 자료가 없는 분기는 가장 가까운 분기 비중을 씁니다.

### 4.2 Trend

판매(OEM i, Powertrain p, 지역 r, 월 h) = 차량 TAM(r, h) x Powertrain 비중(p | r, h) x Powertrain 안 OEM M/S(i | p, r, h)

- 전망 기간: 실적 마지막 해 + 2년 12월까지 (2026-08 실적이면 2028-12, 28개월). 1~3년으로 바꿀 수 있습니다.
- 차량 TAM: 최근 12개월 계절 조정 평균 x (1 + 연간 성장률)^경과연수 x 계절 지수. 성장률은 최근 12개월 / 직전 12개월(±30% 제한), 지역별로 덮어씀.
- M/S: 최근 N개월(기본 12) 월별 로그 M/S 의 기울기를 감쇠율 phi(기본 0.85)로 줄여 가며 이어 간 값을 softmax 합니다. 최근 3개월 평균이 출발점.
- 최근 N개월 판매가 없는 OEM, Powertrain 은 전망에서도 0 입니다.

### 4.3 외생변수 카드

| 대상 | 강도 단위 | 적용 |
| --- | --- | --- |
| 시장 TAM | % | 차량 TAM x (1 + 강도 x 반영률) |
| Powertrain 비중 | %p | 완전 반영 달에 그 달 Trend 비중 + 강도가 정확히 되도록 효용에 더함 |
| OEM M/S | 현재 M/S 대비 % | 완전 반영 달에 Trend M/S x (1 + 강도)가 정확히 되도록 효용에 더함. 같은 Powertrain 경쟁 OEM 몫에서 가져옴 |

- 강도는 범위 최소 / 예상 / 범위 최대 세 값 (숫자 순서). 반영률은 시작 월부터 즉시 / 선형 / S-curve 로 1 에 도달, 지속 또는 일정 기간 뒤 종료 · 반감기 소멸.
- 국가 한정: 지정 국가의 최근 12개월 지역 내 비중만큼 강도를 줄입니다.
- Pull-forward: 시작 전 K 개월 대상 물량 +pct%, 시작 후 K 개월에서 같은 물량을 뺍니다.
- 카드 여러 장은 효용에 합산되므로 M/S 합이 항상 100% 입니다.

### 4.4 Worst / Base / Best

사람이 시나리오를 따로 만들지 않습니다. 카드 목록 하나에서 자동으로 나옵니다 (`src/model/scenarios.js`).

- Base: 모든 카드를 예상값으로.
- Worst: 카드마다 범위 최소~최대 중 자사 기준 값을 가장 줄이는 값. 부정 요인은 크게, 긍정 요인은 작게 반영되는 셈.
- Best: 카드마다 자사 기준 값을 가장 늘리는 값.
- 자사 기준 값: 전망 기간 자사 디스플레이 물량 합계(차량 x 대당 디스플레이 x 브랜드 내 자사 M/S). 디스플레이 가정이 없으면 관측 OEM 차량 판매 합계.
- 긍정 / 부정: 카드 하나를 예상값으로 켰을 때 자사 기준 값이 늘면 긍정, 줄면 부정. 경쟁 OEM 을 누르는 카드(예: BYD 관세)는 긍정이 될 수 있습니다.
- 자사 기준이므로 개별 OEM 에서는 Worst 판매가 Best 보다 클 수 있습니다. 화면에서는 "Worst / Best" 로 나란히 적습니다.

### 4.5 연 단위

실적 월과 전망 월을 이어 달력 연도로 합칩니다. 열두 달이 다 있는 해만 씁니다.
실적만이면 A, 섞이면 E, 전망만이면 F. 2026-08 실적이면 2025A, 2026E, 2027F, 2028F.

### 4.6 디스플레이와 고객 구분

- 디스플레이 TAM = 차량 판매 x 대당 디스플레이, 자사 물량 = 디스플레이 TAM x 브랜드 내 자사 M/S.
- 가정은 (OEM, 지역) 행이 있으면 그것, 없으면 (OEM, 모든 지역) 행, 그것도 없으면 기본값.
- 고객 구분은 OEM 단위입니다. 지정하지 않은 OEM 과 "기타" 는 기타 고객.

### 4.7 지도

Natural Earth 1:110m (공공 저작물). 지역 → 나라는 국가 열 값(ISO2, ISO3, 영문, 한글)을 먼저 찾고 못 찾으면 지역 별칭을 씁니다.
기타 지역은 옅게 칠하고, 점은 그 안에서 판매가 가장 큰 나라에 둡니다.

## 5. 출력

### 5.1 월 단위 결과 CSV (`demand-sim_monthly_*.csv`)

한 행이 시나리오 x 지역 x OEM x 월. 열 이름과 순서는 바꾸지 않고, 새 열은 끝에만 더합니다.

| 열 | 내용 |
| --- | --- |
| scenario | Trend, Worst, Base, Best |
| region | 지역 또는 `전체` (기타 지역 포함) |
| brand | 관측 OEM 또는 `기타` |
| month | YYYY-MM (전망 월) |
| baseline_units, scenario_units | 판매 대수. baseline 은 Trend |
| p10_units, p50_units, p90_units | 빈 칸 (1판 호환용) |
| baseline_share, scenario_share | 지역 차량 TAM 대비 M/S (0~1) |
| region_tiv_baseline, region_tiv_scenario | 지역 차량 TAM |
| baseline_panels, scenario_panels | 디스플레이 TAM (EA) |
| our_panels_baseline, our_panels_scenario | 자사 물량 (EA) |
| customer_tier | strategic, maintain, other |

### 5.2 연 단위 결과 CSV (`demand-sim_annual_*.csv`)

scenario, region, brand, year(2025A 등), vehicles, ms, display_tam, our_panels, our_ms_in_brand, customer_tier.

### 5.3 작업 파일 (.json)

version 2: 관측 OEM, 주요 지역, 전망 설정, 외생변수, 디스플레이 가정, 보고서 제목. 판매 실적은 담지 않습니다. 1판 파일(scenarios[])도 읽습니다.

## 6. 화면

| 탭 | 내용 |
| --- | --- |
| 1. 데이터 | CSV, 열 지정, 주요 지역, 관측 OEM, 전망 설정, 디스플레이 가정과 고객 구분, 데이터 점검 |
| 2. 대시보드 | 연도(2025A~2028F) x 시나리오(Worst/Base/Best). 글로벌 KPI, 세계 지도, 지역 OEM M/S 도넛(상위 5 + 그 외), OEM 별 디스플레이 TAM 과 자사 물량, 지역 비교 |
| 3. 외생변수 | Worst / Base / Best 연도별 자사 물량, 외생변수 카드 표(자사 영향 긍정·부정, 시나리오별 반영값), 카드 편집 |
| 4. 상세 분석 | 지역 x OEM 의 월별 M/S trend 와 판매(실적, Trend, Worst, Base, Best), 연도별 표, 외생변수별 영향, OEM 별 표, Powertrain 비중 |
| 5. 임원 보고서 | 기준 연도 선택. ① 디스플레이 TAM 과 지역 ② 자사 M/S ③ 고객 구분 ④ 전략·유지고객 수요 전망 ⑤ 시나리오 가정. 인쇄, CSV |

색: OEM 색은 관측 OEM 순서 8위까지 `--viz-1..8`, 그 아래 회색. 시나리오는 Worst 주황, Base 파랑, Best 청록, 실적 검정, Trend 점선.

## 7. 예외 상황

| 상황 | 동작 |
| --- | --- |
| 필수 열을 못 찾음 | 열 지정 칸이 빨갛게 표시되고 계산하지 않음 |
| 주요 지역을 하나도 안 고름 | 막고 알림 |
| 판매가 없는 대상의 카드 | "계산 안 됨", 시나리오에서 빼고 알림 |
| 시작 월이 실적 기간 안 | "확인" 경고 (이중 계산 가능성) |
| 디스플레이 가정 없음 | 자사 기준을 관측 OEM 차량 판매로, 보고서는 차량 TAM 기준으로 |
| 작업 파일의 OEM 이 데이터에 없음 | 그 OEM 을 빼고 알림 |

## 8. 하지 않을 것

- 확률 기반 범위(몬테카를로)는 화면에서 쓰지 않습니다. 엔진(`engine.monteCarlo`)과 테스트는 남겨 둡니다.
- 시나리오를 사람이 따로 만드는 기능. Worst / Base / Best 셋뿐입니다.
- 가격, 재고, 공급 제약 모델링.
- OEM 카드가 Powertrain 비중까지 움직이는 교차 효과.
- 디스플레이 가정(대당 수, 자사 M/S)의 연도별 변화.

## 9. 합격 기준

`tests/index.html` (또는 `node tests/run.cjs`) 의 28개 테스트가 전부 통과해야 합니다.

- [ ] 카드가 없으면 결과가 Trend 와 같고, 모든 지역·월에서 M/S 합과 Powertrain 비중 합이 1
- [ ] OEM +10% 는 정확히 1.1배, Powertrain +3%p 는 정확히 +3%p, TAM +10% 는 1.1배
- [ ] Pull-forward 전후 두 구간 합계 동일
- [ ] 분기 비중 분해가 월 합계와 분기 합계를 둘 다 지킴
- [ ] 주요 지역 + 기타 지역 합이 입력 합과 같고, 기타 지역 나라가 지도에 잡힘
- [ ] 전망이 2028-12 까지, 연 단위가 2025A, 2026E, 2027F, 2028F 이고 합이 월 합과 같음
- [ ] 자사 기준 값이 Worst <= Base <= Best, 부정 요인은 Worst 에서 가장 크게
- [ ] 전략 + 유지 + 기타 고객 합이 전체와 같음

화면은 `index.html` 을 `file://` 로 열어 콘솔 오류가 없어야 합니다.
