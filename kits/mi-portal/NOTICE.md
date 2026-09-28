# 출처와 변경 내역

이 킷은 아래 오픈소스 템플릿을 고쳐 만들었습니다.

- 이름: shadcn-admin
- 저장소: https://github.com/satnaing/shadcn-admin
- 버전: 2.2.1, 커밋 e16c87f213a5ba5e45964e9b67c792105ec74d26 (2026-06-11)
- 라이선스: MIT, Copyright (c) 2024 Sat Naing. 원문은 이 폴더의 `LICENSE`

MIT 조건에 따라 `LICENSE` 파일을 그대로 둡니다. 킷을 복사하거나 사내에서 고쳐 쓸 때도 이 파일을 지우지 마세요.

## 바꾼 것

폐쇄망, 더블클릭(file://) 실행
- 주소 방식을 브라우저 기록(`/orders`)에서 해시(`#/orders`)로 바꿈 (`src/main.tsx`)
- 설정 저장을 쿠키에서 localStorage 로 바꿈 (`src/lib/cookies.ts`)
- Google Fonts(Inter, Manrope)를 빼고 한글 글꼴 9종 파일을 넣음 (`public/fonts/`, `src/config/fonts.ts`, `src/context/font-provider.tsx`)
- 글자 크기 5단계 설정 추가 (`src/components/text-size-switch.tsx`, 설정 화면)
- 빌드 결과를 HTML 한 파일로 합치는 설정과 도구 추가 (`vite.config.ts`, `tools/inline-build.cjs`)
- 파비콘 경로를 상대 경로로 바꿈 (`index.html`)

뺀 것
- Clerk 로그인과 관련 화면, 로그인/회원가입/비밀번호 화면
- 채팅, 작업 목록, 사용자 관리, 도움말 센터, 계정/알림/프로필 설정 화면과 예시 데이터
- Recharts 기반 예시 차트, 브랜드 아이콘, 팀 전환 메뉴
- Vitest, Playwright, ESLint, Prettier, knip, shadcn CLI 설정과 테스트
- netlify.toml, pnpm-lock.yaml, CHANGELOG.md 등 배포와 저장소 관리 파일

더한 것
- MI 화면: 대시보드, 차종별 판매·생산, 수요예측, 경쟁사 Fab 현황, 수주 관리, 연결된 앱, 준비 중 화면 3개
- MI 공용 부품: `src/components/mi/` (Chart, KpiCard, PageShell, PlannedPage)
- 계산과 파일 처리: `src/lib/mi/` (숫자 표기, 수요예측, 공휴일, 엑셀, 차트 테마). 이 저장소의 mi-starter 킷에서 가져옴
- 예시 데이터 `src/data/mi-sample.js` (가상의 숫자)
- 빌드 전 검사 `tools/check.cjs`, 사내 모델용 프롬프트 `prompts/`, `.clinerules`
- 화면 문구 한국어 번역

## 함께 들어 있는 다른 저작물

- 한글 글꼴 9종: 모두 OFL-1.1, 배포처 원본 그대로. 목록과 원문 위치는 MANIFEST.md 의 "글꼴"
- 세계 지도: world-atlas 2.0.2 (ISC), 원본 Natural Earth (퍼블릭 도메인)
- 한국 공휴일: @hyunbinseo/holidays-kr 5.2027.2 (MIT)
- 연결된 앱 예시 `public/apps/nesting_calc/`: 이 저장소 portal-shell 킷의 예시 앱 빌드 결과
