# 사내 앱을 포탈에 붙이는 법

면취수 계산기, PSI(적정재고), 판매/생산 대시보드처럼 사내에서 이미 만든 앱을 포탈에 연결하는 절차입니다.

## 요약

**node_modules 는 포탈로 옮기지 않습니다.** 각 앱은 자기 폴더에서 빌드만 하고,
빌드 결과를 HTML 파일 하나로 합쳐 포탈의 `apps/<앱이름>/` 에 넣습니다.
포탈은 그 파일을 화면 안에 띄웁니다.

앱마다 React 버전이나 차트 라이브러리가 달라도 서로 섞이지 않습니다.
앱 하나가 깨져도 다른 앱과 포탈은 그대로 돕니다.

## 왜 node_modules 를 그대로 옮기면 안 되나

실제로 빌드해서 확인한 것들입니다.

1. **빌드 결과가 더블클릭으로 안 열립니다.** Vite 로 만든 앱을 기본 설정으로 빌드하면
   `<script type="module" crossorigin src="/assets/...">` 가 나옵니다. `file://` 로 열면
   브라우저가 JS 와 CSS 를 모두 막아서 빈 화면이 됩니다. 흔히 권하는 `base: './'` 로 바꿔도
   `crossorigin` 속성 때문에 똑같이 막힙니다.
2. **node_modules 는 설치한 OS 에 묶여 있습니다.** Vite 8 은 `@rolldown/binding-linux-x64-gnu`,
   Vite 5~7 은 `@esbuild/win32-x64` 같은 OS 전용 바이너리를 설치합니다. 다른 OS 에서 설치한
   node_modules 를 옮겨 오면 빌드가 실패합니다. 같은 클라우드 PC 안에서만 옮기면 문제없습니다.
3. **앱들을 한 프로젝트로 합치면 버전이 충돌합니다.** 한 앱은 React 18, 다른 앱은 React 19 를
   쓰면 package.json 하나로 합칠 수 없습니다. 앱별로 따로 빌드하면 이 문제가 생기지 않습니다.
4. **용량.** 앱 하나의 node_modules 는 보통 수백 MB 입니다. 합친 빌드 결과는 앱 하나에 수백 KB 입니다.
   예시 면취수 계산기는 React 포함 221KB 한 파일입니다.

## 앱 종류별 연결 방식

| 앱의 형태 | 연결 방식 | 예 |
| --- | --- | --- |
| 입력받아 계산하는 화면 (React, Vue 등) | 앱 모듈 | 면취수 계산기, PSI 시뮬레이션 |
| 정해진 숫자를 모아 보여주는 화면 | 데이터 모듈 또는 앱 모듈 | 판매/생산 대시보드 |
| 서버가 도는 앱 (express, Next.js 등) | 링크 연결 | DB 를 직접 읽는 대시보드 |
| 파이썬이나 엑셀로 숫자를 뽑는 작업 | 데이터 모듈 | 월간 실적 집계 |

대시보드는 둘 다 됩니다. 이미 React 로 만든 화면이 있으면 앱 모듈로 붙이는 게 빠르고,
숫자만 있으면 데이터 모듈로 내보내는 게 가볍습니다. 데이터 모듈은 포탈의 개요 화면에
지표가 같이 모인다는 장점이 있습니다.

어느 쪽인지 모르겠으면 `kits/asset-inventory` 를 돌려 보세요. "포탈 연결 방식" 열에 판정이 나옵니다.

## 앱 모듈로 붙이는 절차

작업 전에 앱 폴더를 통째로 복사해 원본을 남겨 두세요. 클라우드 PC 에 git 이 없으면 이게 유일한 되돌리기 수단입니다.

### 1. 빌드 설정 추가 (Vite)

앱 폴더의 `vite.config.js` (또는 `.ts`) 에 세 줄을 넣습니다.

```js
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    assetsInlineLimit: 100_000_000,                              // 이미지와 폰트를 안에 넣음
    cssCodeSplit: false,                                         // CSS 를 한 파일로
    rollupOptions: { output: { inlineDynamicImports: true } },   // 지연 로딩 조각도 한 파일로
  },
});
```

Vite 5, 6, 7, 8 모두 이 설정으로 됩니다. Vite 8 에서는 `inlineDynamicImports` 가 폐기 예정이라는
경고가 나오지만 동작합니다. 경고가 거슬리면 Vite 8 에서만 마지막 줄을
`rolldownOptions: { output: { codeSplitting: false } }` 로 바꾸세요.

새 패키지를 설치하지 않습니다. 설정 파일만 고칩니다.

### 2. 빌드

```
npm run build
```

`dist/` 폴더가 생깁니다. 이 단계는 node_modules 가 있는 그 PC 에서 해야 합니다.

### 3. 한 파일로 합치기

```
node C:\portal\tools\inline-build.cjs dist C:\portal\apps\psi
```

`C:\portal\apps\psi\index.html` 이 생깁니다. Node 표준 모듈만 쓰는 도구라 설치할 것이 없습니다.

설정이 빠져서 JS 가 여러 조각으로 나뉘어 있으면 도구가 멈추고 어느 조각이 문제인지 알려 줍니다.
1번으로 돌아가 설정을 확인하세요.

이 단계에서 `apps\psi\index.html` 을 더블클릭해 앱이 열리는지 먼저 확인하세요.

### 4. 포탈에 등록

```python
import sys
sys.path.insert(0, r"C:\portal\tools")
from portal_export import export_module

export_module(
    portal_dir=r"C:\portal",
    module_id="psi",
    title="부품 PSI",
    owner="홍길동",
    description="부품별 생산, 판매, 재고 계획과 적정재고 미달 품목",
    app_entry="apps/psi/index.html",
)
```

`data/modules.js` 에 자동으로 등록됩니다. 포탈을 새로 고치면 왼쪽 목록에 나오고,
개요 화면에 "앱" 배지와 "열기" 버튼이 붙습니다.

파이썬이 없으면 `data/psi/data.js` 를 직접 써도 됩니다.

```js
window.__PORTAL__ = window.__PORTAL__ || {};
window.__PORTAL__["psi"] = {
  "title": "부품 PSI",
  "owner": "홍길동",
  "app": { "entry": "apps/psi/index.html" }
};
```

그리고 `data/modules.js` 목록에 `"psi"` 를 넣습니다.

### 5. 앱을 고친 뒤

2번과 3번만 다시 하면 됩니다. 4번은 한 번만 하면 됩니다.
앱 폴더의 `package.json` 에 한 줄로 묶어 두면 편합니다.

```json
"scripts": {
  "build": "vite build",
  "build:portal": "vite build && node C:/portal/tools/inline-build.cjs dist C:/portal/apps/psi"
}
```

## 앱의 현황 숫자를 개요에 띄우기

PSI 처럼 "지금 적정재고 미달 품목이 몇 개인지" 를 포탈 첫 화면에 보여주고 싶으면,
앱 모듈에 지표 카드를 같이 넣습니다.

```python
export_module(
    portal_dir=r"C:\portal", module_id="psi", title="부품 PSI",
    app_entry="apps/psi/index.html",
    kpis=[
        {"label": "적정재고 미달", "value": 12, "unit": "품목", "tone": "bad"},
        {"label": "과잉재고", "value": 5, "unit": "품목", "tone": "warn"},
    ],
)
```

숫자는 앱이 아니라 앱이 읽는 데이터(엑셀, CSV)에서 파이썬으로 계산해 넣는 게 안정적입니다.
앱 화면은 iframe 안에 있어서 포탈이 그 안의 값을 직접 읽지 못합니다.

## 포탈의 화면 전환을 앱에도 적용하기

포탈의 "화면 전환" 버튼을 누르면 포탈이 안에 띄운 앱에 `postMessage({ type: 'portal-theme', theme: 'dark' })`
를 보냅니다. 앱이 이걸 받아 자기 `<html>` 에 `data-theme` 을 붙이면 같이 바뀝니다.
`kits/mi-starter` 로 만든 앱은 `src/lib/theme.js` 에 이미 들어 있습니다. 다른 앱은 이 몇 줄을 넣으면 됩니다.

```js
window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'portal-theme') {
    document.documentElement.setAttribute('data-theme', e.data.theme);
  }
});
```

앱의 CSS 가 `[data-theme='dark']` 를 보고 색을 바꾸도록 되어 있어야 효과가 있습니다.

## 서버가 필요한 앱

express, Next.js 처럼 서버가 도는 앱은 `file://` 로 열리지 않습니다. 사내 서버에 띄워 둔 주소가 있다면
그 주소를 `app_entry` 에 넣으면 포탈 안에 띄워집니다.

```python
export_module(portal_dir=r"C:\portal", module_id="sales", title="판매 대시보드",
              app_entry="http://사내서버주소:3000/")
```

서버가 꺼져 있으면 그 화면만 비고 나머지는 그대로입니다.

## 확인하지 못한 것

Vite 5~8 과 React 조합은 실제로 빌드해서 확인했습니다. 다음은 시험하지 않았습니다.

- **Create React App (react-scripts)**: `package.json` 에 `"homepage": "."` 를 넣으면 상대 경로로
  빌드되고, 모듈이 아닌 일반 스크립트로 나오는 것으로 알려져 있습니다. 그대로 열리는지 먼저
  확인하고, 안 되면 `inline-build.cjs` 를 거치세요.
- **Webpack 직접 설정, Vue CLI, Angular**: 결과물에 `type="module"` 이 있으면 `inline-build.cjs`
  로 처리됩니다. 조각이 여러 개면 각 도구의 "한 번들로 합치기" 설정이 필요합니다.

사내 앱이 이 중 하나로 나오면 조사 결과를 가져와 주세요. 설정을 맞춰 드리겠습니다.

## 문제가 생기면

**앱을 더블클릭하면 빈 화면이다**
F12 콘솔에 `CORS policy` 가 보이면 3번(inline-build)을 거치지 않은 파일입니다.

**inline-build 가 "JS 가 여러 조각으로 나뉘어 있습니다" 로 멈춘다**
1번 설정이 빠졌거나, 설정 파일을 고친 뒤 다시 빌드하지 않았습니다.

**이미지나 아이콘이 안 보인다**
`assetsInlineLimit` 설정이 빠졌습니다. inline-build 가 "/assets/ 로 시작하는 절대 경로" 경고를 냅니다.

**`npm run build` 가 `Cannot find module @rolldown/binding-...` 또는 `@esbuild/...` 로 실패한다**
node_modules 가 다른 OS 에서 설치된 것입니다. 원래 설치한 PC 에서 빌드하세요.

**포탈 안에서는 앱이 비는데 새 창으로는 열린다**
`app_entry` 경로를 확인하세요. 포탈 폴더 기준 상대 경로여야 합니다 (`apps/psi/index.html`).
