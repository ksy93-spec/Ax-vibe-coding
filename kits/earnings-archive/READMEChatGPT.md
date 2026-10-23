# ChatGPT Enterprise 로 이 도구 고치기

사내 ChatGPT Enterprise(폐쇄망)로 작은 변경을 할 때 쓰는 안내서입니다. 앞부분은 사람이 읽고, "모델에게 줄 설명" 절은 ChatGPT 에 그대로 붙여 넣습니다.

## 1. 사람이 먼저 알아 둘 것

사내 ChatGPT 는 저장소 파일을 직접 열지 못하고, 코드를 실행해 보지도 못한다고 가정합니다. 인터넷 검색도 안 됩니다.
그래서 모델이 아는 것은 우리가 붙여 넣은 글이 전부입니다. 아래 세 가지만 지키면 대부분 한 번에 됩니다.

1. 대화를 열 때마다 이 문서의 "2. 모델에게 줄 설명" 블록을 먼저 붙여 넣습니다.
   프로젝트 기능이 있으면 지침(Instructions)에 한 번 넣어 두고, `SPEC.md`, `types/ea.d.ts` 를 프로젝트 파일로 올려 둡니다.
2. 한 번에 파일 하나만 고치게 합니다. 고칠 파일 전체를 붙여 넣고, 고친 파일 전체를 받습니다.
   두 파일을 고쳐야 하는 변경은 대화를 두 번(또는 요청을 두 번)으로 나눕니다. "6. 자주 하는 변경" 표에 순서를 적었습니다.
3. 받은 파일로 바꾼 뒤 반드시 "7. 확인하는 법" 대로 확인합니다. 모델은 실행을 못 해 봤기 때문에 확인은 사람이 합니다.

파일을 바꾸기 전에 킷 폴더를 통째로 복사해 두세요(`earnings-archive_backup_날짜`). 잘못되면 그 폴더로 되돌립니다.
`data/` 폴더는 쌓인 자료라서 코드 변경과 상관없이 따로 한 번 더 복사해 두면 안전합니다.

### 붙여 넣을 파일 크기

가장 큰 파일도 2만 3천 자 정도라 한 번에 붙여 넣을 수 있습니다. 대화가 길어지면 모델이 앞에서 받은 파일을 잊으니, 파일 하나 고칠 때마다 새 대화를 엽니다.

| 파일 | 글자 수 |
| --- | --- |
| `src/ui/view-admin.js` | 약 23,000 |
| `src/ui/view-import.js` | 약 19,000 |
| `assets/css/ea.css` | 약 17,000 |
| `src/model/core.js`, `src/ui/view-edit.js`, `src/model/prompt.js`, `src/ui/view-company.js`, `src/ui/state.js`, `src/model/parse.js`, `src/model/merge.js` | 약 10,000~13,500 |
| 나머지 | 1만 자 이하 |

## 2. 모델에게 줄 설명

아래 블록을 통째로 복사해 대화 첫머리(또는 프로젝트 지침)에 붙여 넣습니다.

```
너는 사내 HTML 도구 "주요 고객 실적 자료" 의 유지보수 개발자다. 이 도구는 인터넷이 없는 사내 PC 에서
index.html 을 더블클릭해 file:// 로 연다. 완성차 13곳과 부품사 4곳의 분기 실적(매출, 영업이익, 영업이익률, 부채비율)과
실적 컨퍼런스콜 요약(하이라이트, 가이던스, Q&A)을 쌓고 보여 준다.

[구조]
- 빌드 없음. index.html 이 <script src> 로 파일을 순서대로 읽는다. 순서: data/companies.js, data/fx.js,
  src/lib/*.js, src/model/*.js, src/ui/*.js, src/main.js.
- 모든 파일은 (function (global) { 'use strict'; ... })(window) 형태이고 전역 객체 App 에 기능을 붙인다.
  src/model/ 파일만 마지막 줄이 })(typeof window !== 'undefined' ? window : globalThis); 이다 (테스트용).
- src/model/  계산과 검사. DOM(document) 을 쓰지 않는다.
    core.js    App.ea.core    지표 목록(METRICS), 주제 목록(TOPICS), 단위 환산, 분기 계산, 환율 환산, derive(), table()
    files.js   App.ea.files   data/*.js 파일 형식, 판 번호(rev)
    parse.js   App.ea.parse   사내 모델 답(JSON) 읽기와 검사, 지표 이름 별칭(METRIC_ALIASES)
    merge.js   App.ea.merge   분기 자료 합치기, 누계를 분기로, 자료 묶음 가져오기
    prompt.js  App.ea.prompt  콜 요약, 숫자 프롬프트 템플릿, 녹취록 나누기
- src/ui/  화면.
    state.js   App.data       자료 읽기, 작업본(localStorage), 저장. 화면은 자료를 이 API 로만 읽고 쓴다
    format.js  App.f          숫자 표기(musd, pct, pp, num), 로고, 버튼, 입력 칸
    chart.js   App.chart      columns(세로 막대), bars(가로 막대)
    view-overview.js  한눈에 보기 탭     view-company.js  회사별 탭     view-edit.js  분기 편집 화면
    view-import.js    자료 넣기 탭       view-search.js   찾기 탭       view-admin.js 관리 탭
- src/main.js  머리글, 탭, 화면 이동. 탭 화면은 App.views.<탭 id> = function (main, route) 로 그린다.
  화면 이동은 App.go({ tab: 'company', company: 'gm', period: '2026Q2' }).
- src/lib/  DOM 헬퍼 App.dom.h(tag, props, children), 토스트와 모달 App.ui.toast / modal / confirm, CSV App.csv.

[자료]
- 분기는 달력 분기 문자열 '2026Q3' (7~9월). 3월 결산 회사도 달력 분기로 맞추고, 회사 표기는 fiscalLabel 에 둔다.
- 분기 자료 values 의 키: revenue, operatingIncome, totalLiabilities, totalEquity (발표 통화 백만 단위),
  debtRatio (% 숫자, 원문에 비율만 있을 때).
- 화면 숫자는 App.ea.core.derive(quarter, company, fx) 가 만든다.
    musd.revenue, musd.operatingIncome  백만 달러 (분기 평균 환율로 나눔)
    opMargin   영업이익 / 매출 x 100
    debtRatio  부채총계 / 자본총계 x 100. 둘 중 하나라도 없으면 values.debtRatio
- 전년 대비는 발표 통화 기준이다. App.ea.core.table(report, company, fx) 가 yoy, opMarginPrev, debtRatioPrev 를 붙인다.
- 자료를 바꿀 때는 App.data.putReport(companyId, report) / putCompanies(list) / putFx(fx) 만 쓴다.

[금지]
- 외부 라이브러리, CDN, 원격 폰트나 이미지, npm, import/export, <script type="module">, fetch
- src/lib/ 수정
- tests/model.test.js 의 테스트를 지우거나 기대값을 바꾸는 것
- 저장 단위 바꾸기 (금액은 발표 통화 백만, 비율은 %)
- CSS 에 새 색 값(#hex, rgb) 쓰기. var(--c-*), var(--sp-*), var(--text-*), var(--viz-*) 변수만 쓴다
- 요청받지 않은 파일이나 함수를 고치거나, 이름을 바꾸거나, 정리하는 것

[답하는 방식]
- 내가 붙여 넣은 파일 하나만 고친다. 고친 파일 전체를 코드 블록 하나로 준다. 일부만 주거나 "... 기존과 같음" 으로 줄이지 않는다.
- 코드 블록 첫 줄 위에 파일 경로를 적는다.
- 코드 뒤에 무엇을 바꿨는지 세 줄 이내로 적는다.
- 다른 파일도 고쳐야 하면 코드를 쓰기 전에 어느 파일을 왜 고쳐야 하는지 먼저 말한다.
- 확신이 없으면 코드를 쓰지 말고 무엇이 필요한지 묻는다.
```

## 3. 요청 양식

설명 블록을 붙여 넣은 다음, 아래 양식의 〈 〉를 채워 보냅니다. 그 아래에 고칠 파일 전체를 붙입니다.

```
아래 파일 하나만 고친다.

[고칠 파일]
〈경로. 예: src/ui/view-company.js〉

[바꿀 것]
〈무엇을 어떻게. 화면 위치, 표시 형식까지. 예: 회사별 분기 표에서 "부채비율" 줄 아래에 "자본총계 (백만 발표 통화)" 줄을 더한다.
값은 d.quarter.values.totalEquity, 표기는 App.f.num.〉

[바꾸면 안 되는 것]
〈예: 다른 줄의 순서, 표 아래 차트〉

[완료 기준]
〈예: 자료가 없는 회사에서도 오류 없이 "-" 로 나온다〉

--- 파일 전체 ---
〈붙여 넣기〉
```

요청을 쓸 때 요령:

- "예쁘게", "보기 좋게" 대신 무엇을 어디에 어떤 형식으로 둘지 적습니다. 모델이 알아서 정하게 두면 다른 부분까지 손댑니다.
- 함수 이름이나 변수 이름을 알면 적습니다. 이 문서 "4. 모듈별 설명" 에서 찾을 수 있습니다.
- 받은 코드가 이상하면 고치라고 이어서 말하지 말고, 오류 문구를 들고 새 대화에서 "8. 막혔을 때" 양식으로 다시 시킵니다.

## 4. 모듈별 설명

### src/model/core.js (App.ea.core)

| 이름 | 하는 일 | 고칠 일 |
| --- | --- | --- |
| `METRICS` | 분기 자료 지표 목록. key, label, kind('money' 또는 'pct'), flow(손익이면 true, 분기 말 잔액이면 false) | 지표를 더할 때 (6-H) |
| `TOPICS` | 하이라이트와 Q&A 주제 목록. 프롬프트에 그대로 들어감 | 주제를 더할 때 (6-C) |
| `CURRENCIES` | 통화 선택 목록 | 통화를 더할 때 |
| `toStoreUnit(value, unit, kind)` | billion, 조, 億円 같은 단위를 백만으로 | 거의 없음 |
| `normPeriod(s)` | 'Q3 2026', '3Q26', '2026년 3분기' 를 '2026Q3' 으로 | 거의 없음 |
| `fiscalLabel(period, fyEnd)` | 달력 분기를 회사 회계연도 표기로 (제안값) | 거의 없음 |
| `toMusd(value, currency, period, fx, override)` | 백만 발표 통화를 백만 달러로 | 아니오 |
| `derive(quarter, company, fx)` | 한 분기의 화면용 숫자 (musd, opMargin, debtRatio) | 새 계산 지표를 더할 때 |
| `table(report, company, fx)` | 회사의 분기 목록 (최근부터) + 전년 대비 | 새 비교 값을 더할 때 |

### src/model/parse.js (App.ea.parse)

| 이름 | 하는 일 | 고칠 일 |
| --- | --- | --- |
| `METRIC_ALIASES` | 모델 답의 지표 이름을 우리 key 로 맞추는 별칭 (소문자, 띄어쓰기 없이) | 모델이 다른 이름을 쓸 때 별칭만 더함 (6-D) |
| `lenientJson(text)` | 설명 문장, ``` 울타리, 마지막 쉼표를 걷고 JSON 읽기 | 아니오 |
| `readCall(obj, ctx)` | 콜 요약 답 검사 | 아니오 |
| `readNumbers(obj, ctx)` | 숫자 답 검사, 단위 환산 | 아니오 |

### src/model/prompt.js (App.ea.prompt)

| 이름 | 하는 일 | 고칠 일 |
| --- | --- | --- |
| `CALL_TEMPLATE`, `TASK_ALL`, `TASK_PREPARED`, `TASK_QA` | 콜 요약 프롬프트 글 | 문구를 바꿀 때 (6-E) |
| `NUMBERS_TEMPLATE` | 숫자 프롬프트 글 | 문구를 바꿀 때 (6-E) |
| `DEFAULT_MAX` | 조각 최대 글자 수 기본값 24000 | 사내 모델 답이 자주 끊기면 줄임 |
| `QA_MARKERS` | 녹취록에서 질의응답이 시작되는 줄을 찾는 표지 | 나누기가 잘 안 되는 녹취록 형식이 있을 때 |

`{{companyName}}` 처럼 중괄호 두 개로 싼 자리는 도구가 채웁니다. 자리 이름을 바꾸거나 지우지 않습니다.

### src/ui/state.js (App.data)

화면에서 자료를 읽고 쓰는 유일한 길입니다. 이 파일은 고치지 않는 것이 원칙입니다.

| 이름 | 하는 일 |
| --- | --- |
| `companies()`, `company(id)` | 회사 목록, 회사 하나 |
| `report(id)`, `reports()` | 회사 자료 `{ company, rev, quarters: [...] }` |
| `fx()` | 환율 표 `{ rates: { KRW: { '2026Q2': 1380 } } }` |
| `putReport(id, report)`, `putCompanies(list)`, `putFx(fx)` | 고친 자료를 작업본에 넣고 화면을 다시 그림 |
| `dirty()` | 파일로 저장 안 된 것 목록 |

### 화면 파일

| 파일 | 화면 | 주로 고치는 곳 |
| --- | --- | --- |
| `src/ui/view-overview.js` | 한눈에 보기 | `card()` 카드 안 항목, `compareTable()` 표 열, `views.overview` 안 `App.chart.bars(...)` 비교 차트 |
| `src/ui/view-company.js` | 회사별 | `quarterTable()` 의 `defs` 배열 (표 줄), `detail()` 안 `App.chart.columns(...)` (차트), `quarterDetail()` (콜 요약 보기) |
| `src/ui/view-edit.js` | 분기 편집 | `METRICS` 를 돌며 입력 줄을 만듦. 지표를 더하면 저절로 줄이 생김 |
| `src/ui/view-import.js` | 자료 넣기 | 안내 문구, `previewNumbers()` |
| `src/ui/view-search.js` | 찾기 | 찾는 범위 |
| `src/ui/view-admin.js` | 관리 | `exportCsv()` 의 열 (`cols`, `recs.push`), 회사 고치기 창 `editCompany()` |
| `assets/css/ea.css` | 스타일 | 변수만 씀 |

표기 함수(App.f): `musd(v)` 백만 달러, `pct(v, signed)` 퍼센트, `pp(v)` 퍼센트 포인트 차이, `num(v, digits)` 일반 숫자. 값이 없으면 모두 "-" 를 돌려줍니다.

## 5. 코드 없이 화면에서 하는 일

코드를 고치기 전에 화면에서 되는지 먼저 봅니다.

| 하고 싶은 것 | 어디서 |
| --- | --- |
| 회사 추가, 이름, 종목 코드, 통화, 회계연도 바꾸기 | 관리 탭 > 회사 목록 > 회사 추가 / 고치기 |
| 로고 넣기 | 관리 탭 > 회사 목록 > 고치기 > 로고 바꾸기 (SVG, PNG 200KB 이하) |
| 회사가 영업이익으로 쓰는 이름(EBIT 등) 적기 | 같은 창의 "영업이익 이름" |
| 회사 순서 바꾸기 | 관리 탭 > 회사 목록 > 위 / 아래 |
| 환율 넣기, 통화 더하기 | 관리 탭 > 환율 |
| 숫자, 하이라이트, Q&A 고치기 | 회사별 탭 > 분기 > 편집 |
| 분기 지우기 | 회사별 탭 > 분기 > 삭제 |

## 6. 자주 하는 변경

| | 변경 | 고칠 파일 (순서대로, 파일마다 요청 한 번) | 확인 |
| --- | --- | --- | --- |
| A | 한눈에 보기 카드에 항목 더하기, 빼기 | `src/ui/view-overview.js` 의 `card()` | 한눈에 보기 |
| B | 회사별 표에 줄 더하기, 빼기, 순서 바꾸기 | `src/ui/view-company.js` 의 `quarterTable()` 안 `defs` | 회사별 |
| C | 하이라이트 주제 더하기 (예: "자율주행") | `src/model/core.js` 의 `TOPICS` (맨 끝 '기타' 앞에 넣기). 프롬프트에는 저절로 들어감 | tests/index.html, 자료 넣기 프롬프트 |
| D | 모델이 지표 이름을 다르게 써서 "지표를 몰라 뺌" 경고가 남 | `src/model/parse.js` 의 `METRIC_ALIASES` 에 별칭 더하기 | tests/index.html, 자료 넣기 검사 |
| E | 프롬프트 문구 바꾸기 | 1) `src/model/prompt.js` 2) `prompts/10-call-summary.md` 또는 `prompts/11-numbers.md` 의 같은 블록을 똑같이 | tests/index.html, 자료 넣기 프롬프트 |
| F | 색, 글자 크기, 간격 | `assets/css/ea.css` (변수만). 회사 전체 색은 `assets/css/tokens.css` 의 `--c-accent` 세 개만 | 화면 |
| G | CSV 내보내기 열 바꾸기 | `src/ui/view-admin.js` 의 `exportCsv()` | 관리 탭 CSV |
| H | 새 지표 더하기 (예: 순이익, 순이익률) | 1) `src/model/core.js` 의 `METRICS` 에 `{ key: 'netIncome', label: '순이익', kind: 'money', flow: true }`, 비율이면 `derive()` 에 계산 추가 2) `src/model/parse.js` 의 `METRIC_ALIASES` 에 별칭 3) `src/model/prompt.js` 의 `NUMBERS_TEMPLATE` [찾을 숫자] 에 한 줄 4) 같은 줄을 `prompts/11-numbers.md` 에 5) 보일 화면 파일 (A, B) | 단계마다 tests/index.html |
| I | 녹취록 나누기가 엉뚱한 곳에서 됨 | `src/model/prompt.js` 의 `QA_MARKERS` 에 그 녹취록의 질의응답 시작 줄 형식을 더함 | 자료 넣기 3번 안내 문구 |

H 처럼 여러 파일을 고칠 때는 1번 파일을 고치고 확인한 다음 2번으로 넘어갑니다. 한꺼번에 다섯 파일을 붙여 넣지 않습니다.

### 자료 파일을 손으로 고칠 때

`data/reports/<회사 id>.js` 는 아래처럼 생겼고, `push(` 와 마지막 `);` 사이가 JSON 입니다.

```
(window.EA_FILES = window.EA_FILES || []).push({
 "kind": "report",
 "data": { "company": "gm", "rev": 3, "quarters": [ ... ] }
});
```

- 문자열은 큰따옴표, 마지막 항목 뒤에는 쉼표를 두지 않습니다.
- 손으로 고친 뒤에는 `rev` 를 1 올립니다. 그래야 다른 사람 브라우저에 남은 옛 작업본보다 새 것으로 봅니다.
- 화면이 "자료를 읽는 중..." 에서 멈추면 이 파일의 JSON 문법이 깨진 것입니다. F12 콘솔에 파일 이름과 줄이 나옵니다.
  ChatGPT 에는 그 파일 전체를 주고 "JSON 문법 오류만 고치고 내용은 바꾸지 마라" 고 시킵니다.

## 7. 확인하는 법

사내 PC 에 Node 가 없어도 브라우저만으로 확인합니다.

1. `tests/index.html` 을 Chrome 이나 Edge 로 엽니다. 맨 위에 "37/37 통과" 처럼 전부 통과해야 합니다.
   `src/model/` 을 고쳤는데 실패가 나오면, 실패한 줄의 이름과 빨간 문구를 그대로 "8. 막혔을 때" 양식에 넣습니다.
   (H 처럼 일부러 동작을 바꾼 변경이면 테스트를 고쳐야 할 수도 있습니다. 이때는 ChatGPT 에 맡기지 말고 바깥 저장소 담당에게 넘깁니다.)
2. `index.html` 을 열고 F12 > Console 에 빨간 오류가 없는지 봅니다.
3. 고친 화면을 직접 눌러 봅니다. 자료가 있는 회사와 없는 회사를 둘 다 봅니다.
4. 자료 넣기 탭에서 `tests/fixtures/sample-transcript.txt` 와 `tests/fixtures/sample-answers.md` 로 한 번 넣어 봅니다(연습용 가상 자료).
   끝나면 관리 탭 "파일로 저장" 에서 "되돌리기" 로 지웁니다.

## 8. 막혔을 때

```
아래 오류를 고친다. 앞의 설명 블록 규칙을 따른다.

[어디서]
〈tests/index.html 의 실패 항목 이름 / 콘솔 오류 / 어떤 탭에서 무엇을 눌렀을 때〉

[오류 문구 그대로]
〈붙여 넣기〉

[최근에 바꾼 파일과 바꾼 내용]
〈예: src/ui/view-company.js, 표에 자본총계 줄을 더함 (아래에 전체 붙임)〉

할 일:
- 원인을 한두 줄로 말하고, 고칠 파일 하나를 전체로 준다.
- 테스트가 실패했으면 테스트가 아니라 코드를 고친다.
- 원인이 src/lib/ 나 types/ 에 있다고 보이면 코드를 쓰지 말고 그렇게 말한다.
```

두 번 시켜도 안 되면 백업 폴더로 되돌리고, 오류 문구와 무엇을 하려 했는지만 정리해 바깥 저장소 담당에게 넘깁니다.
넘길 때 고객 숫자, 녹취록, 사내 시스템 이름은 지웁니다.
