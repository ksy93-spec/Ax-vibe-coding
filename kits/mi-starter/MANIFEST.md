# mi-starter

Market Intelligence 기능을 ChatGPT Enterprise 로 만들 때 쓰는 시작 템플릿과 오프라인 패키지 묶음.

패키지를 미리 받아 두는 것만으로는 부족합니다. ChatGPT 는 폐쇄망에서 패키지를 설치할 수 없고,
설치된 패키지의 버전별 사용법도 모릅니다. 그래서 이 킷은 세 가지를 같이 넣었습니다.

- 인터넷 없이 설치되는 npm 캐시 (윈도 x64, 리눅스 x64 바이너리 포함)
- 모든 패키지를 이미 연결해 둔 동작하는 앱 (판매, 수요예측, 경쟁사 거점, 수주 관리 예시 화면)
- ChatGPT 가 쓸 수 있는 것과 쓰면 안 되는 것을 적은 지침 (`PROMPT.md`) 과 그걸 기계적으로 확인하는 검사 (`npm run check`)

## 실행 환경

- Node: 20.19 이상 또는 22.12 이상. Vite 8 의 요구 사항입니다. `node -v` 로 확인하세요.
- OS: 윈도 x64, 리눅스 x64. macOS 와 ARM 용 바이너리는 캐시에 없습니다.
- 결과물: `dist-single/index.html` 한 파일 (약 4.3MB). 더블클릭으로 열리고 포탈에 앱 모듈로 붙습니다.

## 반입 방식

B. `npm-cache/` 폴더(90MB)에 모든 tarball 이 들어 있고 `npm ci --offline` 으로 설치합니다.

## 기능별로 무엇을 쓰나

| MI 기능 | 쓰는 것 | 템플릿 예시 |
| --- | --- | --- |
| 시장환경분석 (지표 추이, 증감) | ECharts 선/막대, `lib/format.js`, simple-statistics | `pages/Sales.jsx` |
| 경쟁사 Fab 현황 | ECharts 세계 지도, AG Grid | `pages/Fabs.jsx` |
| 자동차 수요예측 | `lib/forecast.js`, `lib/calendar.js`, ml-regression-multivariate-linear | `pages/Forecast.jsx` |
| 수주 관리 | AG Grid 편집, zod 검증, ExcelJS 가져오기/내보내기 | `pages/Orders.jsx` |
| 매출 관리 | AG Grid, Arquero 집계, ExcelJS | 수주 화면 + 판매 화면의 집계 |
| OEM 별 전략, 차종별 판매, 생산 | ECharts, Arquero 피벗 | `pages/Sales.jsx` |

수요예측은 JS 쪽에 믿을 만한 시계열 패키지가 없어서 `lib/forecast.js` 를 직접 작성했습니다.
이동평균, 지수평활, Holt, Holt-Winters, 직선 추세, 전년 동월 반복 중에서 최근 구간 검증 오차가
가장 작은 방법을 고릅니다. 테스트 12건이 있습니다. 경기 지표(GDP, 금리 등)를 넣는 회귀는
ml-regression-multivariate-linear 로 합니다.

## 패키지 목록

### 화면에 들어가는 것 (dependencies)

| 패키지 | 버전 | 라이선스 | 용도 | 고른 이유 |
| --- | --- | --- | --- | --- |
| react, react-dom | 19.3.0 | MIT | 화면 | ChatGPT 가 가장 잘 아는 UI 라이브러리 |
| echarts | 6.1.0 | Apache-2.0 | 차트, 지도 | 선, 막대, 지도, 히트맵, 기간 확대를 한 라이브러리로. 지도 때문에 Recharts 대신 골랐습니다 |
| echarts-for-react | 3.0.6 | MIT | ECharts 를 React 로 감싸기 | `esm/core` 경로만 씁니다 (아래 함정 참고) |
| ag-grid-community, ag-grid-react | 36.2.0 | MIT | 표 | 정렬, 필터, 편집, CSV 가 기본. 직접 짜야 할 코드가 적어 ChatGPT 오류가 줄어듭니다 |
| @ag-grid-community/locale | 36.2.0 | MIT | 표 한국어 문구 | 830개 문구 |
| exceljs | 4.4.0 | MIT | xlsx 읽기, 서식 있는 xlsx 쓰기 | 보고서용 서식(굵은 머리글, 숫자 형식, 틀 고정)을 넣을 수 있습니다 |
| papaparse | 5.7.0 | MIT | CSV | |
| arquero | 8.0.3 | BSD-3-Clause | 묶기, 합계, 피벗 | 차종 x 연도, OEM x 월 같은 표를 몇 줄로 만듭니다 |
| lodash-es | 4.18.1 | MIT | 잡다한 유틸 | ChatGPT 가 습관처럼 씁니다. 없으면 빌드가 깨져서 넣었습니다 |
| dayjs | 1.11.23 | MIT | 날짜 계산 | moment 대체 |
| simple-statistics | 7.12.0 | ISC | 평균, 분산, 회귀, 분위수 | |
| ml-regression-multivariate-linear | 2.0.4 | MIT | 다중 회귀 | 수요 = f(경기 지표) 같은 모형 |
| zod | 4.6.5 | MIT | 엑셀 업로드 행 검증 | 틀린 행을 한국어 사유와 함께 걸러 냅니다 |
| zustand | 5.0.15 | MIT | 여러 화면이 공유하는 상태 | |
| lucide-react | 1.48.0 | ISC | 아이콘 | ChatGPT 가 가장 많이 쓰는 아이콘 세트 |
| world-atlas, topojson-client | 2.0.2, 3.1.0 | ISC | 세계 지도 데이터 | Natural Earth 기반. 인터넷 없이 지도가 뜹니다 |
| @hyunbinseo/holidays-kr | 5.2027.2 | MIT | 한국 공휴일, 대체공휴일 | 2018~2027년 수록 |

### 빌드에만 쓰는 것 (devDependencies)

| 패키지 | 버전 | 라이선스 |
| --- | --- | --- |
| vite, @vitejs/plugin-react | 8.3.1, 6.1.1 | MIT |
| tailwindcss, @tailwindcss/vite | 4.3.3 | MIT |

테스트 도구는 넣지 않았습니다. Node 에 내장된 `node:test` 로 계산 로직을 테스트합니다.

## 넣지 않은 것

| 패키지 | 이유 |
| --- | --- |
| xlsx (SheetJS) 0.18.5 | 고위험 취약점 2건 (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9). 고친 0.20.x 는 npm 이 아니라 SheetJS 자체 배포처에만 있는데, 이 킷을 만든 환경에서는 그 주소가 막혀 받지 못했습니다. 사내에 승인된 판이 있으면 추가해도 됩니다 |
| Recharts, Chart.js | ECharts 와 역할이 겹칩니다. 차트 라이브러리가 둘이면 ChatGPT 가 섞어 써서 결과가 들쭉날쭉해집니다 |
| Highcharts, amCharts, Handsontable, AG Grid Enterprise | 상용 라이선스 |
| moment | 유지보수 종료 |
| Vitest | 이 조합에서 npm 10.9 설치가 내부 오류로 멈췄습니다. `node:test` 로 대체했습니다 |
| TanStack Table | 화면을 직접 짜야 하는 방식이라 ChatGPT 가 쓸 코드와 오류가 늘어납니다 |
| react-router | 화면 전환은 포탈이 맡고, 앱 안은 탭으로 충분합니다 |
| axios | `file://` 로 도는 앱에는 요청할 서버가 없습니다 |

## 보안과 라이선스 점검

- `npm audit`: 0건. ExcelJS 가 쓰는 `uuid` 8.3.2 에 중간 위험 1건(GHSA-w5hq-g745-h8pq)이 있어
  `overrides` 로 11.1.1 에 고정했습니다. 취약한 함수는 v3, v5, v6 이고 ExcelJS 는 v4 만 부르므로
  원래도 영향은 없었지만, 심사에서 설명할 일을 줄이려고 고정했습니다. 고정 후 ExcelJS 가 uuid 를
  부르는 경로(조건부 서식)를 실제로 돌려 확인했습니다.
- 라이선스: lock 파일의 216개 항목 모두 허용형입니다. 따로 설명이 필요한 것은 다음과 같습니다.
  - lightningcss (MPL-2.0): 빌드 도구에만 쓰입니다. 결과물에 보이는 `--lightningcss-light` 는 코드가 아니라 CSS 변수 이름입니다.
  - jszip (MIT 또는 GPL-3.0 중 선택): MIT 로 씁니다.
  - buffers: package.json 에 라이선스 표기가 없습니다. ExcelJS 의 Node 전용 경로에 딸린 패키지이고 브라우저 결과물에는 들어가지 않습니다.
  - big-integer (Unlicense), chainsaw 와 traverse (MIT/X11), pako (MIT AND Zlib), tslib (0BSD).

## 템플릿이 대신 해결해 둔 함정

ChatGPT 에게 맨땅에서 시키면 거의 확실히 부딪힐 것들입니다. 전부 이 킷을 만들면서 실제로 겪었습니다.

- `echarts-for-react/lib/core` 로 불러오면 Vite 8 빌드에서 화면이 통째로 빕니다 (React 오류 #130).
  README 와 ChatGPT 가 쓰는 경로가 바로 이것입니다. `esm/core` 로 바꿨습니다.
- 공휴일 패키지의 `isHoliday()` 는 Promise 를 돌려줘서 `if (isHoliday(d))` 가 항상 참입니다.
  `lib/calendar.js` 가 true/false 를 바로 돌려줍니다. 2028년 이후는 조용히 틀리지 않고 오류를 냅니다.
- world-atlas 지도를 그대로 그리면 러시아, 피지, 남극이 날짜변경선을 가로질러 화면에 줄무늬가 생깁니다.
- 그리드 칸의 기본 최소 폭 때문에 창을 줄여도 차트가 줄지 않았습니다. `Panel` 에서 막았습니다.
- 다운로드 파일명에 한글이 있으면 크로미움이 이름을 버리고 확장자 없는 파일로 저장합니다.
- 11,500 이 "1만" 으로 뭉개지던 표기를 "1.2만" 으로 고쳤습니다.
- Holt-Winters 초기값에 추세가 섞여 계절 예측이 한쪽으로 기울던 것을 고쳤습니다.
- AG Grid 33 부터 바뀐 모듈 등록과 테마 방식, zod 4 에서 바뀐 오류 메시지 방식을 반영했습니다.
- Tailwind 기본 색(gray-500 등)을 꺼서 다크 모드와 포탈 색이 어긋나지 않게 했습니다.

## 여러 사람이 같이 쓰는 관리 화면에 대해

수주 관리와 매출 관리는 여러 사람이 같은 데이터를 고치는 일입니다. `file://` 로 도는 앱은 고친 내용을
그 PC 의 브라우저에만 남기므로 다른 사람과 공유되지 않습니다. 지금 구조에서는 원본을 공유 폴더의
엑셀로 두고, 앱은 그 파일을 읽고 고쳐서 다시 내려받는 용도로 쓰는 게 안전합니다.
여러 사람이 동시에 고쳐야 한다면 사내 서버와 DB 가 필요합니다. 그건 이 킷의 범위 밖입니다.

## 결과물 크기

`dist-single/index.html` 약 4.3MB. JS 3.6MB 의 대부분은 ECharts, AG Grid, ExcelJS 이고,
CSS 0.8MB 는 대부분 한글 폰트입니다. 로컬 파일로 여는 데는 문제없는 크기입니다.
쓰지 않는 기능이 많으면 `src/lib/echarts.js` 의 차트 등록을 줄여 용량을 줄일 수 있습니다.

## 검증 기록

2026-09-27, 리눅스 x64, Node 22.22.2, npm 10.9.7.

- 레지스트리를 존재하지 않는 주소로 돌려 놓고 `npm ci --offline` 으로 캐시만 써서 설치. 리눅스 174개, 윈도(`--os=win32 --cpu=x64`) 170개 패키지 설치 성공
- 오프라인 설치본에서 `npm run check` 통과, `npm test` 25건 통과, `npm run build:single` 성공
- 헤드리스 Chromium 에서 `file://` 로 네 화면 확인: 차트 렌더, 표 정렬과 필터, 수요예측 모형 선택과 영업일 계산,
  지도 거점 필터, 수주 셀 편집과 금액 재계산, 엑셀 내려받기, 잘못된 행을 섞은 엑셀 가져오기(2행 통과, 2행 사유와 함께 제외),
  다크 모드, 1280/900/390px 에서 가로 스크롤 없음, 창 크기를 바꿔도 차트가 따라감, 콘솔 에러 없음
- `npm run check` 에 설치 안 된 패키지, 금지 경로, 외부 주소, Tailwind 기본 색, 보이지 않는 문자를 일부러 넣어 10건 모두 잡는 것 확인

윈도에서는 설치(바이너리 해석)까지만 확인했고, 실제 윈도 PC 에서 빌드를 돌려 보지는 못했습니다.
