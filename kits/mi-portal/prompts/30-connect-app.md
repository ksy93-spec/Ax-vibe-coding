# 다른 사람이 만든 앱 붙이기

면취수 계산기, PSI, 판매 대시보드처럼 이미 따로 만든 앱을 포탈의 "연결된 앱" 에 넣습니다.
앱 코드를 포탈로 옮기지 않습니다. 앱을 HTML 한 파일로 빌드해서 포탈 폴더에 넣고 목록에 한 줄 추가합니다.
포탈은 그 파일을 iframe 으로 띄우므로 앱의 React 버전이나 라이브러리가 포탈과 달라도 됩니다.

## 사람이 하는 일

1. 앱 폴더에서 빌드 설정을 확인합니다. Vite 라면 `vite.config` 에 아래가 있어야 합니다.
   ```
   base: './',
   build: {
     assetsInlineLimit: 100_000_000,
     cssCodeSplit: false,
     rollupOptions: { output: { inlineDynamicImports: true } },
   },
   ```
   (Vite 8 은 `rolldownOptions: { output: { codeSplitting: false } }` 도 됩니다.)
2. 앱을 빌드하고 한 파일로 합칩니다.
   ```
   npm run build
   node C:\work\mi-portal\tools\inline-build.cjs dist C:\work\mi-portal\public\apps\<영문이름>
   ```
3. `public\apps\<영문이름>\index.html` 을 더블클릭해서 혼자서도 열리는지 봅니다.
4. 아래 프롬프트로 목록에 한 줄 추가하거나, 직접 `src/config/apps.ts` 에 적습니다.

```
src/config/apps.ts 의 portalApps 배열에 앱 하나를 추가한다. 다른 파일은 고치지 않는다.
- id: 〈영문 소문자와 - 만. 예: psi〉
- title: 〈예: 자동차 부품 PSI〉
- description: 〈한두 문장. 무엇을 계산하는지〉
- owner: 〈담당 부서나 이름〉
- kind: 'html'
- entry: 'apps/〈영문이름〉/index.html'
파일 전체를 준다.
```

사이드바와 앱 목록, 대시보드의 "연결된 앱" 에 자동으로 나타납니다.

## exe 프로그램 붙이기

HTML 이 아니라 PC 에 설치된 exe 라면 빌드할 것이 없습니다. 두 곳에 한 줄씩 적습니다.

1. `public\launcher\apps.ini` 에 `〈id〉 = 〈exe 경로〉` 를 추가합니다. 공유 폴더 경로도 됩니다.
2. 아래 프롬프트로 `src/config/apps.ts` 에 항목을 추가합니다.

```
src/config/apps.ts 의 portalApps 배열에 exe 앱 하나를 추가한다. 다른 파일은 고치지 않는다.
- id: 〈영문 소문자와 - 만〉
- kind: 'exe'
- title: 〈예: 면취수 계산기〉
- description: 〈한두 문장〉
- owner: 〈담당 부서나 이름〉
- launchId: 〈apps.ini 에 적은 id 와 같게〉
- location: 〈화면에 보여 줄 설치 위치 안내. 예: 'C:\\Tools\\Nesting\\Nesting.exe'〉
파일 전체를 준다.
```

빌드해서 배포한 뒤, 각 PC 에서 `launcher\register.bat` 을 다시 실행하면 새 목록이 적용됩니다.
`npm run check` 는 launchId 가 apps.ini 에 없으면 경고합니다.

## 앱이 포탈 테마를 따르게 하려면 (선택)

포탈은 밝게/어둡게가 바뀔 때 앱에 `postMessage({ type: 'portal-theme', theme: 'light' | 'dark' })` 를 보냅니다.
앱 쪽에서 받는 코드는 저장소의 `docs/app-integration.md` 에 있습니다.
