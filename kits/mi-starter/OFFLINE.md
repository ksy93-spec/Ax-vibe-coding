# 설치와 실행

## 0. 먼저 확인

명령 프롬프트에서:

```
node -v
```

`v20.19` 이상 또는 `v22.12` 이상이면 됩니다. 버전이 낮으면 아래 "Node 버전이 낮을 때" 를 보세요.

## 1. 폴더 옮기기

`mi-starter` 폴더를 통째로 한글과 공백이 없는 경로에 둡니다. 예: `C:\work\mi-starter`

`npm-cache` 폴더가 빠지면 설치가 안 됩니다. 압축을 풀 때 함께 들어왔는지 확인하세요 (약 90MB, 파일 330개 정도).

## 2. 설치

`install.bat` 을 더블클릭합니다. 인터넷에 접속하지 않습니다. 설치가 끝나면 검사, 테스트, 빌드를
한 번 돌려서 모두 통과하는지 보여 줍니다.

직접 하려면:

```
npm ci --offline --cache ./npm-cache
```

`--offline` 과 `--cache` 둘 다 있어야 합니다. 빠지면 인터넷에 접속하려다 멈춥니다.

## 3. 개발

`dev.bat` 을 실행하면 개발 서버가 뜹니다. 표시되는 주소(`http://localhost:5173`)를 브라우저로 열고,
`src/` 의 파일을 고치면 화면이 바로 바뀝니다. 개발 서버는 이 PC 안에서만 돕니다.

## 4. 빌드

`build.bat` 을 실행합니다. 검사, 테스트, 빌드를 차례로 하고 `dist-single\index.html` 한 파일을 만듭니다.
이 파일은 더블클릭으로 열리고, 포탈의 `apps\<이름>\index.html` 로 복사하면 포탈 안에 붙습니다.
포탈 등록 방법은 저장소의 `docs/app-integration.md` 4번을 보세요.

## 확인 항목

- [ ] `install.bat` 끝에 "통과", "pass 25", "완료" 가 모두 나온다
- [ ] `dist-single\index.html` 을 열면 판매, 수요예측, 경쟁사 거점, 수주 관리 탭이 보인다
- [ ] 차트 위에 마우스를 올리면 값이 나온다
- [ ] 수주 관리에서 "엑셀 내려받기" 한 파일이 엑셀에서 한글이 깨지지 않고 열린다

## 문제가 생기면

**`npm ci` 가 `ENOTCACHED` 로 실패한다**
`npm-cache` 폴더가 일부만 들어왔거나 `package-lock.json` 이 바뀌었습니다. 킷 폴더를 다시 통째로 옮기세요.
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
