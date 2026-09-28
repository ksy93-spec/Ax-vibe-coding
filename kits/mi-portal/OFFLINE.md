# 설치와 실행

## 0. 먼저 확인

명령 프롬프트에서:

```
node -v
```

`v20.19` 이상 또는 `v22.12` 이상이면 됩니다. Vite 8 의 요구 사항입니다.
버전이 낮으면 아래 "Node 버전이 낮을 때" 를 보세요.

## 1. 폴더 옮기기

`mi-portal` 폴더를 통째로 한글과 공백이 없는 경로에 둡니다. 예: `C:\work\mi-portal`

`vendor` 폴더가 빠지면 설치가 안 됩니다. 압축을 풀 때 함께 들어왔는지 확인하세요
(약 95MB, 파일 290개).

GitHub 에서 저장소 zip 을 받았다면 `C:\work` 처럼 짧은 경로에 푸세요. 다운로드 폴더에 그대로 풀면
저장소 이름 폴더가 두 겹으로 생겨 경로가 길어집니다. 폴더를 다른 곳으로 옮길 때 `node_modules` 는 빼고
옮긴 뒤 `install.bat` 을 다시 실행합니다. `node_modules` 안은 경로가 길어서 탐색기 복사가 실패합니다.

## 2. 설치

`install.bat` 을 더블클릭합니다. 인터넷에 접속하지 않습니다. 설치가 끝나면 검사, 테스트, 빌드를
한 번 돌려서 모두 통과하는지 보여 줍니다.

직접 하려면:

```
node tools/install-offline.cjs
```

`vendor/` 의 패키지를 이 PC 의 npm 캐시(`%LOCALAPPDATA%\npm-offline-cache`)에 넣고
`npm ci --offline` 으로 설치합니다. 캐시를 킷 폴더 밖에 두는 이유는 캐시 파일 이름이 길어서입니다.
그냥 `npm install` 이나 `npm ci` 를 치면 인터넷에 접속하려다 멈춥니다.

## 3. 개발

`dev.bat` 을 실행하고 `http://localhost:5173` 을 브라우저로 엽니다. `src/` 의 파일을 고치면
화면이 바로 바뀝니다. 개발 서버는 이 PC 안에서만 돕니다.

`src/routes/` 에 파일을 추가하면 개발 서버가 `src/routeTree.gen.ts` 를 자동으로 다시 만듭니다.
이 파일은 손으로 고치지 않습니다. 새 파일의 `createFileRoute('...')` 경로가 폴더 위치와 달라도
개발 서버나 빌드가 폴더 위치에 맞게 고쳐 씁니다.

## 4. 빌드와 배포

`build.bat` 을 실행합니다. 검사, 테스트, 빌드를 차례로 하고 `dist-single\` 폴더를 만듭니다.

```
dist-single\
  index.html                  포탈 전체 (약 2.7MB)
  fonts\                      글꼴 9종 (약 21MB, 파일 630개 정도)
  apps\nesting_calc\index.html  연결된 앱
```

이 폴더를 통째로 공유 폴더에 올리거나 각자 PC 로 복사합니다. `index.html` 을 더블클릭하면 열립니다.
`fonts` 폴더가 빠지면 글꼴만 맑은 고딕으로 바뀌고, `apps` 폴더가 빠지면 연결된 앱만 열리지 않습니다.
나머지는 그대로 동작합니다.

## 5. 업데이트

두 번째부터는 폴더를 통째로 옮기지 않고 바뀐 파일만 담은 zip 을 적용합니다. 방법은 README.md 의 "업데이트 받기" 에 있습니다.
사내에서 직접 고친 파일이 업데이트 zip 에도 들어 있으면 덮어써집니다. 적용 전에 zip 안 `UPDATE.md` 의 파일 목록을 보고,
겹치는 파일은 따로 복사해 두었다가 합치세요.

## 명령 모음

| 명령 | 하는 일 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run check` | 없는 패키지, 외부 주소, 금지된 import, 메뉴와 화면 파일 짝 검사 |
| `npm test` | `src/lib/mi/*.test.js` 계산 테스트 (Node 내장 테스트) |
| `npm run build` | 빌드와 타입 검사 |
| `npm run build:single` | 빌드 후 HTML 한 파일로 합치기 |
| `npm run verify` | check, test, build:single 을 차례로 |

## 확인 항목

- [ ] `install.bat` 끝에 "통과", "pass 25", "완료" 가 모두 나온다
- [ ] `dist-single\index.html` 을 더블클릭하면 대시보드가 뜨고 차트가 그려진다
- [ ] 윗줄의 가 단추로 "아주 크게" 를 고르면 메뉴, 표, 차트 글자가 모두 커진다
- [ ] 설정 > 글자 크기와 글꼴 에서 글꼴 카드 10개의 미리보기 글자 모양이 서로 다르다
- [ ] 왼쪽 메뉴로 수주 관리에 가서 새 수주를 추가하고, 새로고침해도 남아 있다
- [ ] "엑셀 내려받기" 한 파일이 엑셀에서 한글이 깨지지 않고 열린다
- [ ] 오른쪽 위 해 모양 단추로 어둡게 바꾸면 차트 색도 바뀐다
- [ ] 연결된 앱 > 면취수 계산기가 포탈 안에서 열린다

## 문제가 생기면

**`install.bat` 이 "vendor 에 없는 패키지가 있습니다" 로 멈춘다**
`vendor` 폴더가 일부만 들어왔거나 `package-lock.json` 이 바뀌었습니다. 메시지에 나온 패키지 이름을 확인하고
킷 폴더를 다시 옮기세요.
`package.json` 과 `package-lock.json` 은 손대지 마세요.

**`Cannot find module @rolldown/binding-win32-x64-msvc` 같은 오류**
다른 PC 에서 설치한 `node_modules` 를 복사해 왔습니다. `node_modules` 를 지우고 `install.bat` 을 다시 실행하세요.

**`npm run check` 에서 "설치되지 않은 패키지"**
사내 모델이 없는 패키지를 썼습니다. 오류 줄을 그대로 `prompts/40-fix-error.md` 에 넣어 다시 요청하세요.

**빌드한 파일을 열었더니 빈 화면**
F12 콘솔을 보세요. `React error #130` 이면 누군가 `echarts-for-react/lib/core` 를 import 했습니다.
`npm run check` 가 이걸 잡습니다. 그 밖의 오류는 콘솔 메시지를 `prompts/40-fix-error.md` 로 넘기세요.

**메뉴를 눌러도 화면이 안 바뀐다**
주소창이 `index.html#/orders` 처럼 `#` 뒤에 경로가 붙는지 보세요. 코드에서 `<a href="/orders">` 를 쓰면
이렇게 됩니다. `<Link to='/orders'>` 로 바꿔야 합니다.

**명령 프롬프트의 한글이 깨진다**
`.bat` 파일 첫머리에 `chcp 65001` 이 있어야 합니다. 킷의 `.bat` 파일에는 들어 있습니다.

## Node 버전이 낮을 때

1. 사내 표준 Node 를 올릴 수 있는지 확인합니다. 가장 깔끔합니다.
2. 사내 Node 버전을 알려 주시면 그 버전에서 도는 Vite 로 캐시를 다시 만들어 드립니다.
   Vite 6 은 Node 18 에서도 돕니다. 화면 코드는 그대로 씁니다.
