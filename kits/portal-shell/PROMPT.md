# 사내 모델용 프롬프트

## 먼저 할 것

`.clinerules` 가 킷 루트에 있습니다. VS Code 로 이 폴더를 열면 Cline 이 자동으로 읽습니다.
ChatGPT Enterprise 에는 `types/portal.d.ts` 와 `MANIFEST.md` 를 프로젝트 지식 파일로 올려 두세요.

## 가장 흔한 작업: 모듈 추가

포탈 코드를 고치는 게 아니라 데이터를 내보내는 스크립트를 만드는 일입니다.
이 점을 프롬프트 첫 줄에 적어야 사내 모델이 포탈 코드를 건드리지 않습니다.

```
작업: 포탈에 붙일 모듈 데이터 내보내기 스크립트 작성
파일: 새 파일 (예: scripts/export_내기능.py)

포탈 코드는 건드리지 않는다. data/ 아래에 결과만 만든다.

이미 있는 것:
- tools/portal_export.py 의 export_module(portal_dir, module_id, title, kpis=,
  charts=, table=, owner=, description=, format=, notes=)
  호출하면 data/<module_id>/data.js 를 만들고 modules.js 에 자동 등록한다.
  계약을 어기면 ContractError 를 낸다.

넣을 내용:
- kpis: <어떤 숫자 3~4개>
- charts: <line 또는 bar, 무엇의 무엇별 추이>
- table: <어떤 열>

금지:
- pandas 등 새 라이브러리 (openpyxl 은 xlsx-automation 킷에 있음)
- src/ 아래 파일 수정
- data.js 를 손으로 작성
- 자릿수가 다른 값을 한 차트에 넣는 것

완료 기준:
- 스크립트를 돌리면 data/<id>/data.js 가 생긴다
- index.html 을 새로 고치면 왼쪽 목록에 뜨고 느낌표가 없다
```

## 포탈 화면 자체를 손볼 때

```
파일: src/main.js
목표: <화면 한 군데>

이미 있는 것:
- App.createChart(mount, {type, title, x, series, format, height})
- App.renderKpis(mount, items, format)
- App.createTable(mount, {columns, records, pageSize})
- App.formatValue(v, format)
- 전체 시그니처는 types/portal.d.ts 에 있다

할 일:
- <한 가지>

금지:
- src/lib/ 와 src/registry.js 수정
- 새 hex 색상값, --viz-* 순서 변경
- 두 번째 y축 추가
- 표로 보기 버튼 제거

완료 기준:
- <눈으로 확인 가능한 조건>
- 콘솔에 에러가 없다
```

## 자주 나오는 실패

**포탈 코드를 고치려 든다.** "기능을 추가해줘" 라고 하면 `src/main.js` 에 화면을
직접 그리려고 합니다. "모듈로 추가한다" 를 프롬프트에 명시하세요.

**두 번째 y축을 제안한다.** 값의 자릿수가 다르면 거의 항상 이 제안이 나옵니다.
지수화하거나 차트를 나누는 게 맞습니다.

**data.js 를 손으로 쓴다.** 따옴표와 이스케이프에서 깨집니다.
`export_module` 을 쓰라고 명시하세요.

**차트 색을 직접 지정한다.** `stroke="#ff0000"` 같은 코드를 만듭니다.
계열 색은 `App.seriesVar(i)` 가 정합니다.
