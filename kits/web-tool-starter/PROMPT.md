# 사내 모델용 프롬프트

## 먼저 할 것

`.clinerules` 가 킷 루트에 있습니다. VS Code 에서 이 폴더를 열면 Cline 이 자동으로 읽습니다.
ChatGPT Enterprise 를 쓸 때는 프로젝트 지식 파일로 `types/app.d.ts` 와 `MANIFEST.md` 를 올려 두세요.

## Qwen 3.5-Cline

한 번에 한 파일, 한 기능입니다. 이 틀을 그대로 쓰세요.

```
파일: src/main.js
목표: <화면 하나 또는 함수 하나>

이미 있는 것 (새로 만들지 말 것):
- App.dom.h(tag, props, children) - 엘리먼트 생성
- App.createTable(mount, {columns, records, pageSize, onRowClick}) - 정렬/검색 되는 표
- App.csv.readFile(file, cb) - CSV 읽기. CP949 자동 판별됨
- App.csv.download(name, text) - BOM 붙여 내려받기
- App.ui.toast(msg, kind) / App.ui.modal({title, body, actions}) / App.ui.confirm(msg, cb)
- App.createStore(initial) - 상태 저장소
  전체 시그니처는 types/app.d.ts 에 있다.

할 일:
- <구체적으로 한 가지>

금지:
- src/lib/ 수정
- 새 hex 색상값
- 외부 라이브러리

완료 기준:
- <눈으로 확인 가능한 조건>
```

### 예시

```
파일: src/main.js
목표: 불러온 표에서 "부서" 열 기준으로 건수를 세어 요약 패널에 표시

이미 있는 것:
- store.get().records 에 객체 배열이 들어 있다
- App.dom.h 로 엘리먼트를 만든다
- 스타일은 .panel, .badge, .row 클래스를 쓴다

할 일:
- renderData() 안, 표 위에 요약 패널을 하나 추가한다
- 부서별 건수를 많은 순으로 badge 로 나열한다

금지:
- src/lib/ 수정, 새 hex 색상값, 외부 라이브러리

완료 기준:
- CSV 를 불러오면 표 위에 "생산1팀 52" 형태의 배지가 뜬다
- 비우기를 누르면 요약 패널도 같이 사라진다
```

## ChatGPT Enterprise

파일 전체를 붙여넣고 전체를 돌려받습니다. 부분 diff 를 받으면 적용하다 깨집니다.

```
아래는 폐쇄망에서 file:// 로 실행되는 사내 도구의 파일입니다.
빌드 단계가 없고 외부 라이브러리를 쓸 수 없습니다. ES 모듈도 쓸 수 없습니다.

사용 가능한 API:
[types/app.d.ts 내용 붙여넣기]

현재 파일:
[src/main.js 전체 붙여넣기]

요청: <변경 사항 하나>
제약:
- App.* 의 기존 시그니처를 바꾸지 말 것
- 색과 간격은 CSS 변수(var(--c-*), var(--sp-*), var(--text-*))만 쓸 것
- IIFE 구조와 'use strict' 를 유지할 것
출력: 수정된 src/main.js 전체. 설명은 코드 뒤에 세 줄 이내.
```

## 잘 안 되면

사내 모델이 같은 실수를 반복하면 프롬프트를 늘리지 말고 작업을 더 쪼개세요.
"표를 추가해줘" 대신 "표를 넣을 빈 div 를 만들어줘" 와 "그 div 에 App.createTable 을 붙여줘"
두 번으로 나누는 쪽이 빠릅니다.
