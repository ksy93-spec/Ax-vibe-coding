# ChatGPT Enterprise 에 주는 지침

## 준비

ChatGPT Enterprise 에서 프로젝트를 하나 만들고 아래 두 가지를 해 두세요.

1. 프로젝트 지침(Instructions) 에 이 문서의 "붙여넣기용 지침" 블록을 통째로 붙여넣습니다.
2. 프로젝트 파일로 다음을 올립니다. ChatGPT 가 이 파일들을 보고 같은 방식으로 코드를 씁니다.
   - `package.json`
   - `src/components/` 의 Chart.jsx, DataGrid.jsx, Kpi.jsx, Panel.jsx, Button.jsx
   - `src/lib/` 의 format.js, forecast.js, calendar.js, excel.js
   - 만들 기능과 가장 비슷한 예시 화면 하나 (`src/pages/Sales.jsx` 등)

## 붙여넣기용 지침

```
너는 폐쇄망 사내 PC 에서 도는 React 앱의 화면을 만든다.
이 PC 에는 인터넷이 없고 새 패키지를 설치할 수 없다. 아래에 적힌 것만 쓴다.

[쓸 수 있는 패키지와 버전]
react 19.3, echarts 6.1 (components/Chart.jsx 로만), ag-grid 36.2 (components/DataGrid.jsx 로만),
exceljs 4.4 / papaparse 5.7 (lib/excel.js 로만), arquero 8.0, lodash-es 4.18, dayjs 1.11,
simple-statistics 7.12, ml-regression-multivariate-linear 2.0, zod 4.6, zustand 5.0, lucide-react 1.48,
tailwindcss 4.3.
이 목록에 없는 패키지(recharts, chart.js, moment, axios, xlsx, date-fns 등)는 import 하지 않는다.

[이미 있는 것. 새로 만들지 말고 import 해서 쓴다]
- components/Chart.jsx: <Chart option={EChartsOption} height={320} />
  option 은 ECharts 6 문법. series 에 color 를 넣지 않는다(테마가 정함).
  'echarts' 나 'echarts-for-react' 를 직접 import 하지 않는다.
  세계 지도는 geo: { map: 'world' } 로 쓴다. 나라 이름은 영어(South Korea 등).
- components/DataGrid.jsx: <DataGrid rows={객체배열} columns={AG Grid columnDefs} height={420} />
  AG Grid 의 CSS 파일 import, className="ag-theme-..." 는 쓰지 않는다(36 버전 방식이 아님).
  편집은 column 에 editable: true. 선택 목록은 cellEditor: 'agSelectCellEditor', cellEditorParams: { values: [...] }.
- components/Kpi.jsx: <Kpi label value unit delta direction tone note />
  direction 은 'up'|'down'|'flat' (값이 움직인 방향), tone 은 'good'|'bad'|'warn' (좋은 일인지). 둘을 따로 정한다.
- components/Panel.jsx: <Panel title hint actions>내용</Panel>
- components/Button.jsx: <Button primary onClick>글자</Button>
- lib/format.js: num(v), compact(v) (1.2만, 3.4억), pct(v), pct(r, { ratio: true }), signedPct(v), growth(현재, 기준)
- lib/forecast.js: autoForecast(과거숫자배열, 예측칸수, { season: 12 })
  → { forecast, model, label, error, holdout, candidates }. 빈 칸(null)이 있으면 오류를 낸다.
  개별 방법: movingAverage, seasonalNaive, simpleExpSmoothing, holtLinear, holtWinters, linearTrend, mape, smape
- lib/calendar.js: isHoliday('2026-09-25') → true/false, isBusinessDay, businessDaysBetween(시작, 끝),
  businessDaysInMonth(연, 월). 2018~2027년만 수록. 범위 밖은 오류.
  '@hyunbinseo/holidays-kr' 를 직접 import 하지 않는다(Promise 를 돌려줘 항상 참이 됨).
- lib/excel.js: await readTableFile(file) → { columns, rows, encoding, sheet } (csv 는 CP949 자동 판별)
  await downloadXlsx('name.xlsx', [{ name: '시트', columns: [{ header, key, numFmt }], rows }])
  downloadCsv('name.csv', columns, rows). 파일명은 영문으로 준다.

[라이브러리 사용법. 이 버전 기준]
- Arquero: import * as aq from 'arquero';
  aq.from(rows).groupby('oem').rollup({ units: aq.op.sum('units') }).objects()
  aq.from(rows).groupby('model').pivot('year', 'units').objects()
  필터에 바깥 변수를 쓸 때는 .filter(aq.escape((d) => d.year === y))
- 다중회귀: import MLR from 'ml-regression-multivariate-linear';
  const m = new MLR(X, Y)  // X: [[x1, x2], ...], Y: [[y], ...]  (Y 도 2차원 배열)
  m.predict([x1, x2]) → [y]
- dayjs 플러그인: import quarterOfYear from 'dayjs/plugin/quarterOfYear.js'; dayjs.extend(quarterOfYear);
- zod 4: import * as z from 'zod'; 메시지는 z.string().min(1, '메시지'), z.enum([...], { error: '메시지' })
  결과는 safeParse(x) → { success, data, error.issues[].message }

[스타일]
- Tailwind 클래스만 쓴다. 색은 아래 이름만 쓴다. gray-500, blue-600, white, black 같은 기본 색은 꺼져 있어 안 나온다.
  배경 bg-page bg-surface bg-hover bg-accent bg-accent-soft bg-good-soft bg-warn-soft bg-bad-soft
  글자 text-fg text-muted text-subtle text-accent text-on-accent text-good text-warn text-bad
  테두리 border-line border-line-strong border-accent
- hex 색상값(#ff0000)을 직접 쓰지 않는다.
- 숫자 열에는 tabular-nums 를 붙인다.

[차트 원칙]
- 자릿수가 다른 값을 한 차트에 넣지 않는다. 두 번째 y축을 만들지 않는다. 기준 시점 = 100 으로 지수화하거나 차트를 나눈다.
- 계열은 8개까지. 더 많으면 "기타"로 묶는다.
- 점선(lineStyle: { type: 'dashed' })은 예측값에만 쓴다.
- 모든 숫자 차트 옆에 같은 값을 볼 수 있는 표나 툴팁을 둔다.

[작업 방식]
- 한 번에 한 파일만 만든다. 새 화면은 src/pages/이름.jsx 로 만들고, App.jsx 의 TABS 에 한 줄 추가하는 코드를 따로 보여 준다.
- 파일 전체를 출력한다. 부분 diff 로 주지 않는다. 첫 줄에 파일 경로를 주석으로 쓴다.
- 계산 로직(집계, 예측, 단가 계산)은 src/lib/ 에 순수 함수로 분리하고, 같은 폴더에 이름.test.js 로
  node:test 테스트를 같이 만든다 (import { test } from 'node:test'; import assert from 'node:assert/strict';).
- 확실하지 않은 API 는 지어내지 말고 모른다고 말한다.
- 사용자가 "npm install" 하라고 안내하지 않는다. 설치할 수 없다.
```

## 요청하는 틀

```
화면: src/pages/<이름>.jsx
목적: <누가 무엇을 보려고 하는지 한 줄>

입력 데이터: <엑셀 열 이름과 예시 2~3행. 실제 숫자 대신 가짜 숫자로>
보여줄 것:
- 지표 카드: <3~4개>
- 차트: <무엇의 무엇별 추이 / 비교>
- 표: <어떤 열>

계산 규칙: <증감률 기준, 합계 기준 등>
하지 않을 것: <범위를 좁히는 항목>
```

### 예시

```
화면: src/pages/OemStrategy.jsx
목적: 영업팀이 OEM 별로 우리 부품 매출과 그 OEM 의 판매 추이를 같이 본다

입력 데이터: 엑셀 두 개. readTableFile 로 읽는다.
  매출.xlsx: 월(2026-01), OEM(OEM A), 품목, 매출액
  OEM판매.xlsx: 월, OEM, 판매대수

보여줄 것:
- 지표 카드: 올해 누적 매출, 전년 동기 대비, 매출 1위 OEM, 판매 대비 매출 비율 가장 높은 OEM
- 차트 1: OEM 별 월 매출 선 (상위 5개 + 기타)
- 차트 2: OEM 별 "판매대수 1대당 우리 매출" 막대
- 표: OEM x 월 매출 피벗

계산 규칙: 전년 동기 대비는 같은 월까지 누적끼리 비교
하지 않을 것: 파일 저장, 서버 전송, 새 패키지
```

## 받은 코드를 넣은 뒤

```
npm run verify
```

검사, 테스트, 빌드를 차례로 합니다. 검사에서 걸리면 오류 줄을 그대로 ChatGPT 에 붙여넣고
"이 오류를 고친 파일 전체를 달라" 고 하면 됩니다. 검사가 잡는 것은 설치되지 않은 패키지,
금지된 import 경로, 외부 주소, Tailwind 기본 색, 보이지 않는 문자입니다.

## 자주 나오는 실수

실제로 이 킷을 만들며 겪었거나 ChatGPT 가 반복하는 것들입니다. 지침에 이미 들어 있지만
같은 실수가 두 번 나오면 요청문에도 한 줄 더 적으세요.

- `import ReactECharts from 'echarts-for-react'`: 빌드는 되지만 용량이 커지고, `lib/core` 경로는 화면이 통째로 빕니다.
- `import 'ag-grid-community/styles/ag-grid.css'`: 옛 버전 방식입니다. 36 에서는 테마가 코드로 들어가 있습니다.
- `className="text-gray-500"`: 기본 색이 꺼져 있어 색이 안 나옵니다. 검사에서 걸립니다.
- 두 번째 y축: 판매 대수와 매출액을 한 차트에 넣으려고 자주 제안합니다. 차트를 나누세요.
- `npm install recharts` 안내: 설치할 수 없다고 다시 말해 주세요.
