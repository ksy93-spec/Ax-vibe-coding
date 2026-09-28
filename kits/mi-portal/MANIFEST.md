# mi-portal 반입 목록

## 요약

| 항목 | 값 |
| --- | --- |
| 원본 템플릿 | satnaing/shadcn-admin 2.2.1, 커밋 e16c87f (2026-06-11), MIT. 바꾼 내용은 NOTICE.md |
| 실행 환경 | Node 20.19 이상 또는 22.12 이상, npm 10 이상 |
| 지원 OS | 윈도 x64, 리눅스 x64 (vendor 에 두 OS 의 네이티브 바이너리가 들어 있음) |
| 반입 방식 | B. `vendor/` 의 tarball 290개 (약 95MB, 파일 이름 48자 이하) 를 `tools/install-offline.cjs` 가 npm 캐시에 넣고 `npm ci --offline` 설치 |
| 설치 패키지 | 윈도 296개, 리눅스 300개 (package-lock.json 고정, 범위 버전 없음) |
| 보안 점검 | `npm audit` 취약점 0건 (2026-09-28 기준) |
| 결과물 | `dist-single/index.html` 한 파일 약 3.5MB + `apps/` 폴더. 외부 요청 없음 |
| 글꼴 | Pretendard Variable 한글 부분집합 (OFL-1.1), `src/assets/fonts/` |

## 직접 쓰는 패키지

### 화면 (dependencies)

| 패키지 | 버전 | SPDX | 용도 |
| --- | --- | --- | --- |
| react, react-dom | 19.3.0 | MIT | 화면 |
| @tanstack/react-router | 1.170.40 | MIT | 주소와 화면 연결 (해시 방식) |
| @tanstack/react-table | 8.21.3 | MIT | 정렬, 필터, 쪽 넘김 표 |
| @tanstack/react-query | 5.104.0 | MIT | 데이터 불러오기 상태 관리 (사내 API 가 생기면 사용) |
| @radix-ui/react-* (18종) | 고정 버전은 package.json | MIT | shadcn/ui 부품의 바탕 (대화상자, 메뉴, 탭 등) |
| class-variance-authority | 0.7.1 | Apache-2.0 | shadcn/ui 부품 변형 |
| clsx, tailwind-merge | 2.1.1, 3.7.0 | MIT | className 합치기 |
| tw-animate-css | 1.4.0 | MIT | 열림/닫힘 애니메이션 |
| cmdk | 1.1.1 | MIT | Ctrl+K 메뉴 찾기 |
| sonner | 2.0.8 | MIT | 알림 |
| react-hook-form, @hookform/resolvers | 7.89.0, 5.9.1 | MIT | 입력 폼 |
| zod | 4.6.5 | MIT | 입력값, 엑셀 행 검증 |
| zustand | 5.0.15 | MIT | 화면 사이 공유 상태, localStorage 저장 |
| lucide-react | 1.48.0 | ISC | 아이콘 |
| react-day-picker, date-fns | 9.14.0, 4.4.0 | MIT | 달력, 날짜 계산 |
| input-otp | 1.5.0 | MIT | 템플릿 부품(ui/input-otp) 의존. 지금 화면에서는 안 씀 |
| echarts | 6.1.0 | Apache-2.0 | 차트, 세계 지도 |
| echarts-for-react | 3.0.6 | MIT | ECharts 를 React 로 감싸기 (`esm/core` 만 씀) |
| world-atlas, topojson-client | 2.0.2, 3.1.0 | ISC | 세계 지도 데이터 (Natural Earth, 퍼블릭 도메인) |
| exceljs | 4.4.0 | MIT | xlsx 읽기, 서식 있는 xlsx 쓰기 |
| papaparse | 5.7.0 | MIT | CSV |
| arquero | 8.0.3 | BSD-3-Clause | 묶기, 합계, 피벗 |
| simple-statistics | 7.12.0 | ISC | 통계 |
| ml-regression-multivariate-linear | 2.0.4 | MIT | 다중 회귀 |
| @hyunbinseo/holidays-kr | 5.2027.2 | MIT | 한국 공휴일 2018~2027 |

### 빌드 도구 (devDependencies)

| 패키지 | 버전 | SPDX | 용도 |
| --- | --- | --- | --- |
| vite | 8.3.1 | MIT | 개발 서버, 빌드 |
| @vitejs/plugin-react | 6.1.1 | MIT | React 변환 |
| @tanstack/router-plugin | 1.168.41 | MIT | `src/routes` 를 보고 routeTree.gen.ts 생성 |
| tailwindcss, @tailwindcss/vite | 4.3.3 | MIT | CSS |
| typescript | 6.0.3 | Apache-2.0 | 타입 검사 |
| @types/node, @types/react, @types/react-dom | 25.9.8, 19.3.0, 19.3.0 | MIT | 타입 정보 |

원본 템플릿의 Clerk(로그인), Recharts, Vitest, Playwright, ESLint, Prettier, knip, shadcn CLI 는 뺐습니다.
로그인은 사내 인증이 없는 file:// 환경에서 쓸 수 없고, 나머지는 사내에서 설치 부담만 늘립니다.

## 라이선스에서 설명이 필요한 것

- lightningcss (MPL-2.0): Tailwind 가 빌드할 때만 씁니다. 결과물에 코드가 들어가지 않습니다.
  수정하지 않고 배포하므로 MPL 의 소스 공개 의무가 생기지 않습니다.
- caniuse-lite (CC-BY-4.0): 빌드 도구가 브라우저 지원표로 읽는 데이터입니다. 결과물에 들어가지 않습니다.
- jszip (MIT 또는 GPL-3.0 중 선택): MIT 로 씁니다. ExcelJS 가 xlsx 압축에 씁니다.
- big-integer, isbot (Unlicense): 퍼블릭 도메인 헌정. isbot 은 TanStack Router 가 서버 렌더링에서 쓰며 이 포탈에서는 동작하지 않습니다.
- chainsaw, traverse (MIT/X11), pako (MIT AND Zlib), tslib (0BSD): 모두 허용형입니다.
- buffers 0.1.1: tarball 안 어디에도 라이선스 표기가 없습니다 (package.json, README 모두).
  ExcelJS 의 Node 전용 압축 해제 경로(unzipper)에 딸린 패키지이고 브라우저 결과물에는 쓰이지 않습니다.
  심사에서 문제가 되면 이 한 줄로 설명할 수 있습니다. mi-starter 킷도 같은 상황입니다.
- @rolldown/binding-*, binary, isarray, react-remove-scroll-bar, saxes, size-sensor, chainsaw:
  tarball 에 라이선스 파일이 없고 package.json 의 license 필드에만 표기되어 있습니다.
- 원본 템플릿 shadcn-admin: MIT. 원문은 이 폴더의 `LICENSE`.
- Pretendard: OFL-1.1. 원문은 `src/assets/fonts/Pretendard-OFL.txt`. 글꼴 파일만 따로 판매하지 않는 한 제약이 없습니다.

## 전체 패키지 목록

`vendor/` 에 들어 있는 모든 패키지입니다. "원문 위치" 는 tarball 을 풀었을 때의 경로이고,
설치 후에는 `node_modules/<패키지>/` 아래 같은 이름으로 있습니다.
구분의 "런타임" 은 dependencies 를 따라 설치되는 것, "빌드 도구" 는 devDependencies 를 따라 설치되는 것입니다.

| 패키지 | 버전 | SPDX | 원문 위치 (tarball 안) | 구분 |
| --- | --- | --- | --- | --- |
| @babel/code-frame | 7.29.7 | MIT | package/LICENSE | 빌드 도구 |
| @babel/compat-data | 7.29.7 | MIT | package/LICENSE | 빌드 도구 |
| @babel/core | 7.29.7 | MIT | package/LICENSE | 빌드 도구 |
| @babel/generator | 7.29.8 | MIT | package/LICENSE | 빌드 도구 |
| @babel/helper-compilation-targets | 7.29.7 | MIT | package/LICENSE | 빌드 도구 |
| @babel/helper-globals | 7.29.7 | MIT | package/LICENSE | 빌드 도구 |
| @babel/helper-module-imports | 7.29.7 | MIT | package/LICENSE | 빌드 도구 |
| @babel/helper-module-transforms | 7.29.7 | MIT | package/LICENSE | 빌드 도구 |
| @babel/helper-string-parser | 7.29.7 | MIT | package/LICENSE | 빌드 도구 |
| @babel/helper-validator-identifier | 7.29.7 | MIT | package/LICENSE | 빌드 도구 |
| @babel/helper-validator-option | 7.29.7 | MIT | package/LICENSE | 빌드 도구 |
| @babel/helpers | 7.29.7 | MIT | package/LICENSE | 빌드 도구 |
| @babel/parser | 7.29.9 | MIT | package/LICENSE | 빌드 도구 |
| @babel/template | 7.29.7 | MIT | package/LICENSE | 빌드 도구 |
| @babel/traverse | 7.29.8 | MIT | package/LICENSE | 빌드 도구 |
| @babel/types | 7.29.8 | MIT | package/LICENSE | 빌드 도구 |
| @date-fns/tz | 1.5.0 | MIT | package/LICENSE.md | 런타임 |
| @fast-csv/format | 4.3.5 | MIT | package/LICENSE | 런타임 |
| @fast-csv/parse | 4.3.6 | MIT | package/LICENSE | 런타임 |
| @floating-ui/core | 1.8.0 | MIT | package/LICENSE | 런타임 |
| @floating-ui/dom | 1.8.0 | MIT | package/LICENSE | 런타임 |
| @floating-ui/react-dom | 2.1.9 | MIT | package/LICENSE | 런타임 |
| @floating-ui/utils | 0.2.12 | MIT | package/LICENSE | 런타임 |
| @hookform/resolvers | 5.9.1 | MIT | package/LICENSE | 런타임 |
| @hyunbinseo/holidays-kr | 5.2027.2 | MIT | package/LICENSE | 런타임 |
| @jridgewell/gen-mapping | 0.3.13 | MIT | package/LICENSE | 빌드 도구 |
| @jridgewell/remapping | 2.3.5 | MIT | package/LICENSE | 빌드 도구 |
| @jridgewell/resolve-uri | 3.1.2 | MIT | package/LICENSE | 빌드 도구 |
| @jridgewell/sourcemap-codec | 1.6.0 | MIT | package/LICENSE | 빌드 도구 |
| @jridgewell/trace-mapping | 0.3.31 | MIT | package/LICENSE | 빌드 도구 |
| @oxc-project/types | 0.151.0 | MIT | package/LICENSE | 빌드 도구 |
| @radix-ui/number | 1.1.3 | MIT | package/LICENSE | 런타임 |
| @radix-ui/primitive | 1.1.7 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-alert-dialog | 1.1.23 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-arrow | 1.1.15 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-avatar | 1.2.6 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-checkbox | 1.3.11 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-collapsible | 1.1.20 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-collection | 1.1.15 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-compose-refs | 1.1.5 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-context | 1.2.2 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-dialog | 1.1.23 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-direction | 1.1.4 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-dismissable-layer | 1.1.19 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-dropdown-menu | 2.1.24 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-focus-guards | 1.1.6 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-focus-scope | 1.1.16 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-icons | 1.3.2 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-id | 1.1.4 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-label | 2.1.15 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-menu | 2.1.24 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-popover | 1.1.23 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-popper | 1.3.7 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-portal | 1.1.17 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-presence | 1.1.10 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-primitive | 2.1.10 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-radio-group | 1.4.7 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-roving-focus | 1.1.19 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-scroll-area | 1.2.18 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-select | 2.3.7 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-separator | 1.1.15 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-slot | 1.3.3 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-switch | 1.3.7 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-tabs | 1.1.21 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-tooltip | 1.2.16 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-use-callback-ref | 1.1.4 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-use-controllable-state | 1.2.6 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-use-effect-event | 0.0.5 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-use-is-hydrated | 0.1.3 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-use-layout-effect | 1.1.4 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-use-previous | 1.1.4 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-use-rect | 1.1.4 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-use-size | 1.1.4 | MIT | package/LICENSE | 런타임 |
| @radix-ui/react-visually-hidden | 1.2.11 | MIT | package/LICENSE | 런타임 |
| @radix-ui/rect | 1.1.3 | MIT | package/LICENSE | 런타임 |
| @rolldown/binding-linux-x64-gnu | 1.2.11 | MIT | (파일 없음, package.json 표기) | 빌드 도구 |
| @rolldown/binding-linux-x64-musl | 1.2.11 | MIT | (파일 없음, package.json 표기) | 빌드 도구 |
| @rolldown/binding-win32-x64-msvc | 1.2.11 | MIT | (파일 없음, package.json 표기) | 빌드 도구 |
| @rolldown/pluginutils | 1.0.1 | MIT | package/LICENSE | 빌드 도구 |
| @standard-schema/utils | 0.3.0 | MIT | package/LICENSE | 런타임 |
| @tabby_ai/hijri-converter | 1.0.5 | MIT | package/LICENSE | 런타임 |
| @tailwindcss/node | 4.3.3 | MIT | package/LICENSE | 빌드 도구 |
| @tailwindcss/oxide | 4.3.3 | MIT | package/LICENSE | 빌드 도구 |
| @tailwindcss/oxide-linux-x64-gnu | 4.3.3 | MIT | package/LICENSE | 빌드 도구 |
| @tailwindcss/oxide-linux-x64-musl | 4.3.3 | MIT | package/LICENSE | 빌드 도구 |
| @tailwindcss/oxide-win32-x64-msvc | 4.3.3 | MIT | package/LICENSE | 빌드 도구 |
| @tailwindcss/vite | 4.3.3 | MIT | package/LICENSE | 빌드 도구 |
| @tanstack/history | 1.162.4 | MIT | package/LICENSE | 런타임 |
| @tanstack/query-core | 5.104.0 | MIT | package/LICENSE | 런타임 |
| @tanstack/react-query | 5.104.0 | MIT | package/LICENSE | 런타임 |
| @tanstack/react-router | 1.170.40 | MIT | package/LICENSE | 런타임 |
| @tanstack/react-store | 0.11.1 | MIT | package/LICENSE | 런타임 |
| @tanstack/react-table | 8.21.3 | MIT | package/LICENSE | 런타임 |
| @tanstack/router-core | 1.171.33 | MIT | package/LICENSE | 런타임 |
| @tanstack/router-generator | 1.167.39 | MIT | package/LICENSE | 빌드 도구 |
| @tanstack/router-plugin | 1.168.41 | MIT | package/LICENSE | 빌드 도구 |
| @tanstack/router-utils | 1.162.3 | MIT | package/LICENSE | 빌드 도구 |
| @tanstack/store | 0.11.1 | MIT | package/LICENSE | 런타임 |
| @tanstack/table-core | 8.21.3 | MIT | package/LICENSE | 런타임 |
| @tanstack/virtual-file-routes | 1.162.0 | MIT | package/LICENSE | 빌드 도구 |
| @types/node | 14.18.63 | MIT | package/LICENSE | 런타임 |
| @types/node | 25.9.8 | MIT | package/LICENSE | 빌드 도구 |
| @types/react | 19.3.0 | MIT | package/LICENSE | 런타임 |
| @types/react-dom | 19.3.0 | MIT | package/LICENSE | 런타임 |
| @uwdata/flechette | 2.5.0 | BSD-3-Clause | package/LICENSE | 런타임 |
| @vitejs/plugin-react | 6.1.1 | MIT | package/LICENSE | 빌드 도구 |
| acorn | 8.18.0 | MIT | package/LICENSE | 런타임 |
| ansis | 4.4.0 | ISC | package/LICENSE | 빌드 도구 |
| archiver | 5.3.2 | MIT | package/LICENSE | 런타임 |
| archiver-utils | 2.1.0 | MIT | package/LICENSE | 런타임 |
| archiver-utils | 3.0.4 | MIT | package/LICENSE | 런타임 |
| aria-hidden | 1.2.6 | MIT | package/LICENSE | 런타임 |
| arquero | 8.0.3 | BSD-3-Clause | package/LICENSE | 런타임 |
| async | 3.2.6 | MIT | package/LICENSE | 런타임 |
| babel-dead-code-elimination | 1.0.12 | MIT | package/LICENSE | 빌드 도구 |
| balanced-match | 1.0.2 | MIT | package/LICENSE.md | 런타임 |
| base64-js | 1.5.1 | MIT | package/LICENSE | 런타임 |
| baseline-browser-mapping | 2.11.26 | Apache-2.0 | package/LICENSE.txt | 빌드 도구 |
| big-integer | 1.6.52 | Unlicense | package/LICENSE | 런타임 |
| binary | 0.3.0 | MIT | (파일 없음, package.json 표기) | 런타임 |
| bl | 4.1.0 | MIT | package/LICENSE.md | 런타임 |
| bluebird | 3.4.7 | MIT | package/LICENSE | 런타임 |
| brace-expansion | 1.1.21 | MIT | package/LICENSE | 런타임 |
| brace-expansion | 2.1.7 | MIT | package/LICENSE | 런타임 |
| browserslist | 4.29.1 | MIT | package/LICENSE | 빌드 도구 |
| buffer | 5.7.1 | MIT | package/LICENSE | 런타임 |
| buffer-crc32 | 0.2.13 | MIT | package/LICENSE | 런타임 |
| buffer-indexof-polyfill | 1.0.2 | MIT | package/LICENSE | 런타임 |
| buffers | 0.1.1 | ? | (파일 없음, package.json 표기) | 런타임 |
| caniuse-lite | 1.0.30001812 | CC-BY-4.0 | package/LICENSE | 빌드 도구 |
| chainsaw | 0.1.0 | MIT/X11 | (파일 없음, package.json 표기) | 런타임 |
| chokidar | 5.0.0 | MIT | package/LICENSE | 빌드 도구 |
| class-variance-authority | 0.7.1 | Apache-2.0 | package/LICENSE | 런타임 |
| clsx | 2.1.1 | MIT | package/license | 런타임 |
| cmdk | 1.1.1 | MIT | package/LICENSE.md | 런타임 |
| commander | 2.20.3 | MIT | package/LICENSE | 런타임 |
| compress-commons | 4.1.2 | MIT | package/LICENSE | 런타임 |
| concat-map | 0.0.1 | MIT | package/LICENSE | 런타임 |
| convert-source-map | 2.0.0 | MIT | package/LICENSE | 빌드 도구 |
| cookie-es | 3.1.1 | MIT | package/LICENSE | 런타임 |
| core-util-is | 1.0.3 | MIT | package/LICENSE | 런타임 |
| crc-32 | 1.2.2 | Apache-2.0 | package/LICENSE | 런타임 |
| crc32-stream | 4.0.3 | MIT | package/LICENSE | 런타임 |
| csstype | 3.2.3 | MIT | package/LICENSE | 런타임 |
| date-fns | 4.4.0 | MIT | package/LICENSE.md | 런타임 |
| date-fns-jalali | 4.1.0-0 | MIT | package/LICENSE.md | 런타임 |
| dayjs | 1.11.23 | MIT | package/LICENSE | 런타임 |
| debug | 4.4.3 | MIT | package/LICENSE | 빌드 도구 |
| detect-libc | 2.1.2 | Apache-2.0 | package/LICENSE | 빌드 도구 |
| detect-node-es | 1.1.0 | MIT | package/LICENSE | 런타임 |
| diff | 8.0.4 | BSD-3-Clause | package/LICENSE | 빌드 도구 |
| duplexer2 | 0.1.4 | BSD-3-Clause | package/LICENSE.md | 런타임 |
| echarts | 6.1.0 | Apache-2.0 | package/LICENSE | 런타임 |
| echarts-for-react | 3.0.6 | MIT | package/LICENSE | 런타임 |
| electron-to-chromium | 1.5.439 | ISC | package/LICENSE | 빌드 도구 |
| end-of-stream | 1.4.5 | MIT | package/LICENSE | 런타임 |
| enhanced-resolve | 5.25.1 | MIT | package/LICENSE | 빌드 도구 |
| escalade | 3.2.0 | MIT | package/license | 빌드 도구 |
| exceljs | 4.4.0 | MIT | package/LICENSE | 런타임 |
| fast-csv | 4.3.6 | MIT | package/LICENSE | 런타임 |
| fast-deep-equal | 3.1.3 | MIT | package/LICENSE | 런타임 |
| fdir | 6.5.0 | MIT | package/LICENSE | 빌드 도구 |
| fs-constants | 1.0.0 | MIT | package/LICENSE | 런타임 |
| fs.realpath | 1.0.0 | ISC | package/LICENSE | 런타임 |
| fstream | 1.0.12 | ISC | package/LICENSE | 런타임 |
| gensync | 1.0.0-beta.2 | MIT | package/LICENSE | 빌드 도구 |
| get-nonce | 1.0.1 | MIT | package/LICENSE | 런타임 |
| glob | 7.2.3 | ISC | package/LICENSE | 런타임 |
| graceful-fs | 4.2.11 | ISC | package/LICENSE | 런타임 |
| ieee754 | 1.2.1 | BSD-3-Clause | package/LICENSE | 런타임 |
| immediate | 3.0.6 | MIT | package/LICENSE.txt | 런타임 |
| inflight | 1.0.6 | ISC | package/LICENSE | 런타임 |
| inherits | 2.0.4 | ISC | package/LICENSE | 런타임 |
| input-otp | 1.5.0 | MIT | package/LICENSE | 런타임 |
| is-any-array | 3.0.0 | MIT | package/LICENSE | 런타임 |
| isarray | 1.0.0 | MIT | (파일 없음, package.json 표기) | 런타임 |
| isbot | 5.2.2 | Unlicense | package/LICENSE | 런타임 |
| jiti | 2.7.0 | MIT | package/LICENSE | 빌드 도구 |
| js-tokens | 4.0.0 | MIT | package/LICENSE | 빌드 도구 |
| jsesc | 3.1.0 | MIT | package/LICENSE-MIT.txt | 빌드 도구 |
| json5 | 2.2.3 | MIT | package/LICENSE.md | 빌드 도구 |
| jszip | 3.10.2 | (MIT OR GPL-3.0-or-later) | package/LICENSE.markdown | 런타임 |
| lazystream | 1.0.1 | MIT | package/LICENSE | 런타임 |
| lie | 3.3.0 | MIT | package/license.md | 런타임 |
| lightningcss | 1.32.0 | MPL-2.0 | package/LICENSE | 빌드 도구 |
| lightningcss | 1.33.0 | MPL-2.0 | package/LICENSE | 빌드 도구 |
| lightningcss-linux-x64-gnu | 1.32.0 | MPL-2.0 | package/LICENSE | 빌드 도구 |
| lightningcss-linux-x64-gnu | 1.33.0 | MPL-2.0 | package/LICENSE | 빌드 도구 |
| lightningcss-linux-x64-musl | 1.32.0 | MPL-2.0 | package/LICENSE | 빌드 도구 |
| lightningcss-linux-x64-musl | 1.33.0 | MPL-2.0 | package/LICENSE | 빌드 도구 |
| lightningcss-win32-x64-msvc | 1.32.0 | MPL-2.0 | package/LICENSE | 빌드 도구 |
| lightningcss-win32-x64-msvc | 1.33.0 | MPL-2.0 | package/LICENSE | 빌드 도구 |
| listenercount | 1.0.1 | ISC | package/LICENSE.md | 런타임 |
| lodash.defaults | 4.2.0 | MIT | package/LICENSE | 런타임 |
| lodash.difference | 4.5.0 | MIT | package/LICENSE | 런타임 |
| lodash.escaperegexp | 4.1.2 | MIT | package/LICENSE | 런타임 |
| lodash.flatten | 4.4.0 | MIT | package/LICENSE | 런타임 |
| lodash.groupby | 4.6.0 | MIT | package/LICENSE | 런타임 |
| lodash.isboolean | 3.0.3 | MIT | package/LICENSE | 런타임 |
| lodash.isequal | 4.5.0 | MIT | package/LICENSE | 런타임 |
| lodash.isfunction | 3.0.9 | MIT | package/LICENSE | 런타임 |
| lodash.isnil | 4.0.0 | MIT | package/LICENSE | 런타임 |
| lodash.isplainobject | 4.0.6 | MIT | package/LICENSE | 런타임 |
| lodash.isundefined | 3.0.1 | MIT | package/LICENSE.txt | 런타임 |
| lodash.union | 4.6.0 | MIT | package/LICENSE | 런타임 |
| lodash.uniq | 4.5.0 | MIT | package/LICENSE | 런타임 |
| lru-cache | 5.1.1 | ISC | package/LICENSE | 빌드 도구 |
| lucide-react | 1.48.0 | ISC | package/LICENSE | 런타임 |
| magic-string | 0.30.21 | MIT | package/LICENSE | 빌드 도구 |
| minimatch | 3.1.5 | ISC | package/LICENSE | 런타임 |
| minimatch | 5.1.9 | ISC | package/LICENSE | 런타임 |
| minimist | 1.2.8 | MIT | package/LICENSE | 런타임 |
| mkdirp | 0.5.6 | MIT | package/LICENSE | 런타임 |
| ml-array-max | 2.0.0 | MIT | package/LICENSE | 런타임 |
| ml-array-min | 2.0.0 | MIT | package/LICENSE | 런타임 |
| ml-array-rescale | 2.0.0 | MIT | package/LICENSE | 런타임 |
| ml-matrix | 6.15.0 | MIT | package/LICENSE | 런타임 |
| ml-regression-multivariate-linear | 2.0.4 | MIT | package/LICENSE | 런타임 |
| ms | 2.1.3 | MIT | package/license.md | 빌드 도구 |
| nanoid | 3.3.19 | MIT | package/LICENSE | 빌드 도구 |
| node-releases | 2.0.57 | MIT | package/LICENSE | 빌드 도구 |
| normalize-path | 3.0.0 | MIT | package/LICENSE | 런타임 |
| once | 1.4.0 | ISC | package/LICENSE | 런타임 |
| pako | 1.0.11 | (MIT AND Zlib) | package/LICENSE | 런타임 |
| papaparse | 5.7.0 | MIT | package/LICENSE | 런타임 |
| path-is-absolute | 1.0.1 | MIT | package/license | 런타임 |
| pathe | 2.0.3 | MIT | package/LICENSE | 빌드 도구 |
| picocolors | 1.1.1 | ISC | package/LICENSE | 빌드 도구 |
| picomatch | 4.0.7 | MIT | package/LICENSE | 빌드 도구 |
| postcss | 8.5.28 | MIT | package/LICENSE | 빌드 도구 |
| prettier | 3.9.9 | MIT | package/LICENSE | 빌드 도구 |
| process-nextick-args | 2.0.1 | MIT | package/license.md | 런타임 |
| react | 19.3.0 | MIT | package/LICENSE | 런타임 |
| react-day-picker | 9.14.0 | MIT | package/LICENSE | 런타임 |
| react-dom | 19.3.0 | MIT | package/LICENSE | 런타임 |
| react-hook-form | 7.89.0 | MIT | package/LICENSE | 런타임 |
| react-remove-scroll | 2.7.2 | MIT | package/LICENSE | 런타임 |
| react-remove-scroll-bar | 2.3.8 | MIT | (파일 없음, package.json 표기) | 런타임 |
| react-style-singleton | 2.2.3 | MIT | package/LICENSE | 런타임 |
| readable-stream | 2.3.8 | MIT | package/LICENSE | 런타임 |
| readable-stream | 3.6.2 | MIT | package/LICENSE | 런타임 |
| readdir-glob | 1.1.3 | Apache-2.0 | package/LICENSE | 런타임 |
| readdirp | 5.1.1 | MIT | package/LICENSE | 빌드 도구 |
| rimraf | 2.7.1 | ISC | package/LICENSE | 런타임 |
| rolldown | 1.2.11 | MIT | package/LICENSE | 빌드 도구 |
| safe-buffer | 5.1.2 | MIT | package/LICENSE | 런타임 |
| safe-buffer | 5.2.1 | MIT | package/LICENSE | 런타임 |
| saxes | 5.0.1 | ISC | (파일 없음, package.json 표기) | 런타임 |
| scheduler | 0.28.0 | MIT | package/LICENSE | 런타임 |
| semver | 6.3.1 | ISC | package/LICENSE | 빌드 도구 |
| seroval | 1.6.7 | MIT | package/LICENSE | 런타임 |
| seroval-plugins | 1.6.7 | MIT | package/LICENSE | 런타임 |
| setimmediate | 1.0.5 | MIT | package/LICENSE.txt | 런타임 |
| simple-statistics | 7.12.0 | ISC | package/LICENSE | 런타임 |
| size-sensor | 1.0.3 | ISC | (파일 없음, package.json 표기) | 런타임 |
| sonner | 2.0.8 | MIT | package/LICENSE.md | 런타임 |
| source-map-js | 1.2.1 | BSD-3-Clause | package/LICENSE | 빌드 도구 |
| string_decoder | 1.1.1 | MIT | package/LICENSE | 런타임 |
| string_decoder | 1.3.0 | MIT | package/LICENSE | 런타임 |
| tailwind-merge | 3.7.0 | MIT | package/LICENSE.md | 런타임 |
| tailwindcss | 4.3.3 | MIT | package/LICENSE | 빌드 도구 |
| tapable | 2.3.3 | MIT | package/LICENSE | 빌드 도구 |
| tar-stream | 2.2.0 | MIT | package/LICENSE | 런타임 |
| tinyglobby | 0.2.17 | MIT | package/LICENSE | 빌드 도구 |
| tmp | 0.2.7 | MIT | package/LICENSE | 런타임 |
| topojson-client | 3.1.0 | ISC | package/LICENSE | 런타임 |
| traverse | 0.3.9 | MIT/X11 | package/LICENSE | 런타임 |
| tslib | 2.3.0 | 0BSD | package/LICENSE.txt | 런타임 |
| tslib | 2.8.1 | 0BSD | package/LICENSE.txt | 런타임 |
| tw-animate-css | 1.4.0 | MIT | package/LICENSE | 런타임 |
| typescript | 6.0.3 | Apache-2.0 | package/LICENSE.txt | 빌드 도구 |
| undici-types | 7.24.6 | MIT | package/LICENSE | 빌드 도구 |
| unplugin | 3.4.0 | MIT | package/LICENSE | 빌드 도구 |
| unzipper | 0.10.14 | MIT | package/LICENSE | 런타임 |
| update-browserslist-db | 1.3.3 | MIT | package/LICENSE | 빌드 도구 |
| use-callback-ref | 1.3.3 | MIT | package/LICENSE | 런타임 |
| use-sidecar | 1.1.3 | MIT | package/LICENSE | 런타임 |
| use-sync-external-store | 1.7.0 | MIT | package/LICENSE | 런타임 |
| util-deprecate | 1.0.2 | MIT | package/LICENSE | 런타임 |
| uuid | 11.1.1 | MIT | package/LICENSE.md | 런타임 |
| vite | 8.3.1 | MIT | package/LICENSE.md | 빌드 도구 |
| webpack-virtual-modules | 0.6.2 | MIT | package/LICENSE | 빌드 도구 |
| world-atlas | 2.0.2 | ISC | package/LICENSE | 런타임 |
| wrappy | 1.0.2 | ISC | package/LICENSE | 런타임 |
| xmlchars | 2.2.0 | MIT | package/LICENSE | 런타임 |
| yallist | 3.1.1 | ISC | package/LICENSE | 빌드 도구 |
| zip-stream | 4.1.1 | MIT | package/LICENSE | 런타임 |
| zod | 4.6.5 | MIT | package/LICENSE | 런타임 |
| zrender | 6.1.0 | BSD-3-Clause | package/LICENSE | 런타임 |
| zustand | 5.0.15 | MIT | package/LICENSE | 런타임 |
