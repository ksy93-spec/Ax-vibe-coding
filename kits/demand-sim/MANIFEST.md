# demand-sim

디스플레이 수요 시뮬레이터. 주요 지역(중국, 북미, 유럽, 한국, 일본)과 기타 지역의 OEM 월 M/S trend 로 2년 뒤 12월까지 전망하고,
외생변수로 Worst / Base / Best 를 만들어 디스플레이 TAM, 자사 M/S, 전략·유지고객 수요를 연 단위 임원 보고서로 냅니다.
설계와 계산 방식은 `SPEC.md`, 타입은 `types/sim.d.ts` 에 있습니다.

## 실행 환경

- Node: 불필요 (선택: `node tests/run.cjs` 로 테스트할 때 18 이상, 바깥에서는 22.22.0 으로 확인)
- Python: 불필요 (선택: `serve.bat` 으로 로컬 서버를 열 때만)
- 브라우저: Chrome, Edge (Chromium 105 이상. 카드 편집 창 폭에 CSS `:has()` 를 씁니다). `file://` 로 직접 열립니다.
- 빌드 단계: 없음

## 반입 방식

C. npm 의존성이 0개입니다. 반입되는 것은 소스 텍스트와 글꼴 파일뿐입니다.

## 포함된 의존성

npm 패키지 없음. 아래는 코드가 아닌 자산입니다.

| 파일 | 출처 | 버전 | 라이선스(SPDX) | 원문 |
| --- | --- | --- | --- | --- |
| `assets/fonts/pretendard/` (woff2 92개, font.css) | Pretendard (Kil Hyung-jin), npm `pretendard@1.3.9` 의 공식 가변 분할 파일. `kits/web-tool-starter` 와 같은 파일 | 1.3.9 원본 그대로 | OFL-1.1 | `assets/fonts/pretendard/LICENSE.txt` (tarball 의 `package/dist/LICENSE.txt`) |

| `src/ui/worldmap-data.js` | Natural Earth 1:110m 행정 경계, npm `world-atlas@2.0.2` 의 `countries-110m.json` | 2.0.2 | 지도 자료: 공공 저작물(Natural Earth). 패키지: ISC | `assets/licenses/world-atlas-ISC.txt` |
| `src/model/countries.js` | 국가 ISO 코드와 영문/한글 이름, npm `i18n-iso-countries@7.14.0` | 7.14.0 | MIT | `assets/licenses/i18n-iso-countries-MIT.txt` |

지도와 국가표는 바깥에서 `scripts/build-worldmap.cjs` (저장소 루트, 킷에는 없음)로 만든 결과 파일입니다. 지도는 투영(Natural Earth 1)과 좌표 소수 1자리 반올림만 했고, 국가표는 코드와 이름만 뽑았습니다. 사내에서는 다시 만들 필요가 없습니다.
변환에 쓴 `topojson-client@3.1.0` (ISC), `d3-geo@3.1.1` (ISC) 는 바깥에서만 썼고 킷에 코드가 들어가지 않습니다.

글꼴은 고치지 않았습니다. 직접 서브셋한 파일은 OFL 예약 글꼴 이름 조항에 걸려 쓰지 않습니다.
나머지 코드는 이 저장소에서 작성했습니다. `src/lib/` 는 `kits/web-tool-starter` 의 검증된 파일을 그대로 가져왔습니다.

## 구성

| 경로 | 내용 | 사내에서 수정 |
| --- | --- | --- |
| `index.html` | 진입점. 스크립트 순서가 중요합니다 | 스크립트 추가할 때만 |
| `src/model/util.js` | 월 계산, 시드 난수, softmax | 아니오 |
| `src/model/prep.js` | CSV 열 인식, 기타 OEM · 기타 지역 묶기, Powertrain 분기 비중 분해 | `ALIASES` 에 열 이름 추가만 |
| `src/model/baseline.js` | Trend (TAM 계절성과 성장, M/S trend), 전망 종료 월 | 명세를 먼저 고친 뒤 |
| `src/model/annual.js` | 연 단위 합산 (A / E / F) | 명세를 먼저 고친 뒤 |
| `src/model/scenarios.js` | Worst / Base / Best 자동 계산 | 명세를 먼저 고친 뒤 |
| `src/model/shocks.js` | 카드 발효 곡선, 국가 가중치, 점검, 설명 문장 | 명세를 먼저 고친 뒤 |
| `src/model/engine.js` | 시뮬레이션, 몬테카를로, 기여도 | 명세를 먼저 고친 뒤 |
| `src/model/presets.js` | 예시 카드 | 예 (사내 표준 카드 추가) |
| `src/model/sample.js` | 예시 데이터, 디스플레이 가정, 고객 구분. OEM 이름은 실제지만 수치는 가상 | 아니오 |
| `src/model/geo.js` | 지역 값 -> 지도 나라, 지역 한글 이름 | `REGION_ALIASES` 에 별칭 추가만 |
| `src/model/display.js` | 디스플레이 TAM, 자사 물량, 고객 구분 합계 | 명세를 먼저 고친 뒤 |
| `src/model/countries.js` `src/ui/worldmap-data.js` | 자동 생성 자료 | 아니오 |
| `src/ui/*.js` | 화면 (데이터, 대시보드, 외생변수, 상세 분석, 임원 보고서 탭, 차트, 지도, 도넛, 보고서 막대) | 예 |
| `src/main.js` | 머리글과 탭 | 예 |
| `src/lib/` | DOM, CSV, 토스트/모달 | 아니오 |
| `assets/css/sim.css` | 이 도구 스타일 (토큰만 사용) | 예 |
| `assets/css/tokens.css` `app.css` | 디자인 토큰, 기본 컴포넌트 | 브랜드 색만 |
| `tests/` | 계산 엔진 합격 기준 28개 | 테스트를 지우지 말 것 |
| `types/sim.d.ts` `types/app.d.ts` | 타입 참조 | 아니오 |
| `prompts/` | 사내 모델에 붙여 넣을 프롬프트 | 예 |

## 이 킷이 대신 해결해 둔 것

- 점유율을 로그 척도(효용)에서 움직입니다. 카드를 여러 장 겹쳐도 점유율이 0~100% 를 벗어나지 않고 합이 100% 입니다.
- 분기에만 있는 파워트레인 자료를 월로 나눕니다. 월 합계와 분기 합계를 둘 다 지키고, 분기 경계에서 계단이 생기지 않게 보간합니다.
- 보조금 종료 같은 사건의 선구매와 반동(Pull-forward)을 물량 보존 조건으로 넣었습니다.
- Worst / Base / Best 를 사람이 따로 만들지 않습니다. 외생변수 범위에서 자사에 불리한 값, 유리한 값을 자동으로 골라 같은 카드 목록에서 세 시나리오가 나옵니다.
- 실적과 전망이 섞인 해(2026E)를 포함해 연 단위로 합칩니다.
- CP949 CSV, 엑셀용 BOM, 다운로드 파일명 한글 문제는 `src/lib/csv.js` 가 처리합니다.
- 작업(외생변수, 설정)은 브라우저에 자동 저장되고 `.json` 으로 주고받습니다. 판매 실적은 어디에도 저장하지 않습니다. 1판 작업 파일도 읽습니다.

## 사내에서 할 일

- [ ] 사내 CSV 를 넣어 열 이름이 자동으로 잡히는지 확인. 안 잡히면 `prompts/10-column-names.md`
- [ ] 실제 정책 일정으로 카드 작성. 반복해서 쓰는 카드는 `prompts/30-new-preset.md` 로 예시 카드에 추가
- [ ] 지역 TAM 성장률을 사내 전망과 맞출지 결정 (데이터 탭 5번 직접 입력)
- [ ] 데이터 탭 6번에 OEM 별 대당 디스플레이, 브랜드 내 자사 M/S, 전략·유지고객 넣기 (CSV 또는 직접 입력)
- [ ] 지도에 안 나오는 지역이 있으면 `src/model/geo.js` 의 `REGION_ALIASES` 에 별칭 추가

## 검증 기록

2026-10-01 (2026.10.01.3), 이 저장소에서 확인.

- `node tests/run.cjs`: 28/28 통과. 헤드리스 Chromium 에서 `tests/index.html` 을 `file://` 로 열어 28/28 통과
- `index.html` 을 `file://` 로 열어 예시 데이터 → 대시보드 → 예시 외생변수 6개 → 카드 수정 → 대시보드 2028F · Worst · 북미 → 상세 분석 → 임원 보고서 A4 PDF → 데이터 탭 → 다크 모드 → 새로 고침 뒤 외생변수 복원까지 진행. 콘솔 오류와 실패한 요청 0건, 1440px 에서 가로 스크롤 없음
- 연 단위 CSV 1,456행(4 시나리오 x 7 지역 x 13 OEM x 4년), 월 단위 CSV 10,192행 확인

2026-10-01 (2026.10.01.2) 기록:

2026-10-01 (2026.10.01.2), 이 저장소에서 확인.

- `node tests/run.cjs`: 23/23 통과. 헤드리스 Chromium 에서 `tests/index.html` 을 `file://` 로 열어 23/23 통과
- `index.html` 을 `file://` 로 열어 예시 데이터 → 한눈에 보기(지도, 북미 점 선택, 도넛 호버, 디스플레이 막대, 기간 3종) → 단계형 카드 편집(예시 카드, 새 브랜드 카드) → 상세 결과(가능 범위 500번) → 보고서(우리 디스플레이 표 포함) A4 PDF → 다크 모드 → 도움말까지 진행. 콘솔 오류와 실패한 요청 0건, 1440px 에서 가로 스크롤 없음
- 결과 CSV 17열(끝 네 열이 디스플레이) 확인

2026-10-01 (2026.10.01.1) 기록:

2026-10-01, 이 저장소에서 확인.

- `node tests/run.cjs`: 19/19 통과 (Node 22.22.0)
- 헤드리스 Chromium(Playwright 1.56.1)에서 `tests/index.html` 을 `file://` 로 열어 19/19 통과
- `index.html` 을 `file://` 로 열어 예시 데이터 불러오기, 예시 카드 3장 추가, 결과 탭 지역/브랜드 변경, 몬테카를로 500회(약 0.8초), 차트 호버, 보고서 탭, A4 PDF 인쇄, 다크 모드, 새로 고침 뒤 시나리오 복원까지 진행. 콘솔 오류와 실패한 요청 0건, 1440px 에서 가로 스크롤 없음, Pretendard 로드 확인
- 엔진을 일부러 망가뜨려(당겨쓰기 차감 제거, 브랜드 효용 공식 변경, S자 곡선을 선형으로) 해당 테스트가 실패하는 것 확인
