# 설치와 실행

설치 없이 먼저 보려면 `demo\index.html` 을 더블클릭합니다.
킷 폴더 맨 위의 `index.html` 은 개발용 원본입니다. 더블클릭하면 이 안내만 나오고 화면은 뜨지 않습니다.
화면을 보려면 `demo\index.html`, 직접 고친 뒤에는 `build.bat` 으로 만든 `dist-single\index.html` 을 엽니다.
빌드된 파일이 몇 초 안에 뜨지 않으면 화면에 오류 문구와 브라우저 정보가 나옵니다. Chrome 또는 Edge 111 이상이 필요합니다.

## 0. 먼저 확인

명령 프롬프트에서:

```
node -v
```

`v20.19` 이상 또는 `v22.12` 이상이면 됩니다. 버전이 낮으면 아래 "Node 버전이 낮을 때" 를 보세요.

## 1. 폴더 옮기기

`mi-starter` 폴더를 통째로 한글과 공백이 없는 경로에 둡니다. 예: `C:\work\mi-starter`

`vendor` 폴더가 빠지면 설치가 안 됩니다. 압축을 풀 때 함께 들어왔는지 확인하세요
(약 86MB, 파일 165개).

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

`dev.bat` 을 실행하면 개발 서버가 뜹니다. 표시되는 주소(`http://localhost:5173`)를 브라우저로 열고,
`src/` 의 파일을 고치면 화면이 바로 바뀝니다. 개발 서버는 이 PC 안에서만 돕니다.

## 4. 빌드

`build.bat` 을 실행합니다. 검사, 테스트, 빌드를 차례로 하고 `dist-single\index.html` 과 글꼴 폴더 `dist-single\fonts` 를 만듭니다.
`fonts` 폴더가 없으면 맑은 고딕으로 보입니다. 포탈에 붙일 때는 `index.html` 만 옮기면 포탈의 글꼴을 씁니다.
이 파일은 더블클릭으로 열리고, 포탈의 `apps\<이름>\index.html` 로 복사하면 포탈 안에 붙습니다.
포탈 등록 방법은 저장소의 `docs/app-integration.md` 4번을 보세요.

## 확인 항목

- [ ] `install.bat` 끝에 "통과", "pass 25", "완료" 가 모두 나온다
- [ ] `dist-single\index.html` 을 열면 판매, 수요예측, 경쟁사 거점, 수주 관리 탭이 보인다
- [ ] 차트 위에 마우스를 올리면 값이 나온다
- [ ] 수주 관리에서 "엑셀 내려받기" 한 파일이 엑셀에서 한글이 깨지지 않고 열린다

## 문제가 생기면

**`install.bat` 이 "vendor 에 없는 패키지가 있습니다" 로 멈춘다**
`vendor` 폴더가 일부만 들어왔거나 `package-lock.json` 이 바뀌었습니다. 메시지에 나온 패키지 이름을 확인하고
킷 폴더를 다시 옮기세요.
`package-lock.json` 은 손대지 마세요.

**`Cannot find module @rolldown/binding-win32-x64-msvc` 같은 오류**
다른 PC 에서 설치한 `node_modules` 를 복사해 왔습니다. `node_modules` 를 지우고 `install.bat` 을 다시 실행하세요.

**`npm run check` 에서 "설치되지 않은 패키지"**
ChatGPT 가 없는 패키지를 썼습니다. 오류 줄을 ChatGPT 에 붙여넣고 설치된 패키지로 바꿔 달라고 하세요.
설치된 목록은 `PROMPT.md` 에 있습니다.

**빌드한 파일을 열었더니 빈 화면**
F12 콘솔을 보세요. `React error #130` 이면 누군가 `echarts-for-react/lib/core` 를 import 했습니다.
`npm run check` 가 이걸 잡습니다.

**명령 프롬프트의 한글이 깨진다**
`.bat` 파일 첫머리에 `chcp 65001` 이 있어야 합니다. 킷의 `.bat` 파일에는 들어 있습니다.

## Node 버전이 낮을 때

이 킷의 Vite 8 은 Node 20.19 이상이 필요합니다. 사내 Node 가 더 낮다면 두 가지 방법이 있습니다.

1. 사내 표준 Node 를 올릴 수 있는지 확인합니다. 가장 깔끔합니다.
2. 사내 Node 버전을 알려 주시면, 그 버전에서 도는 Vite 로 캐시를 다시 만들어 드립니다.
   Vite 6 은 Node 18 에서도 돕니다. 템플릿 코드는 거의 그대로 쓸 수 있습니다.
