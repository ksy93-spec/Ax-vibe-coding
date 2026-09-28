# 새 화면 만들기

빈칸(〈 〉)을 채워 붙여 넣습니다. 한 번에 파일 하나씩 받습니다. 순서는 아래 "받는 순서" 를 따릅니다.

```
포탈에 새 화면을 만든다. 프로젝트 지침의 규칙을 따른다.

[화면]
- 메뉴 이름: 〈예: 매출 관리〉
- 영문 이름(폴더명): 〈예: revenue〉 (지금 src/routes/_app/〈revenue〉/index.tsx 는 PlannedPage 자리다)
- 메뉴 묶음: 〈개요 / 시장환경분석 / 경쟁사/제품 / 매출/고객분석 / 수주/잔고분석 중 하나〉

[데이터]
- 모양: 〈예: { month: '2026-01', customer: string, item: string, amount: number, plan: number }[]〉
- 지금은 〈src/data/mi-sample.js 에 예시 배열을 추가 / 엑셀 가져오기로 채움〉

[화면에 들어갈 것]
1. 〈예: KPI 카드 4개: 올해 누계 매출, 계획 대비 달성률, 전년 대비, 이번 달 매출〉
2. 〈예: 월별 매출(막대)과 계획(선) 차트〉
3. 〈예: 고객사별 매출 표. 정렬, 검색, 엑셀 내려받기〉

[참고할 기존 화면]
〈예: src/features/sales/index.tsx〉 와 같은 모양과 코드 방식으로 만든다.

[이번에 줄 파일]
〈아래 "받는 순서" 중 하나. 예: src/lib/mi/revenue.js 와 그 테스트〉

[합격 기준]
- npm run check 통과, npm test 통과 (새 계산 함수 테스트 포함), npm run build:single 통과
- npm run dev 에서 메뉴를 누르면 화면이 뜨고, 밝게/어둡게 모두 글자와 차트가 보인다
- 390px 폭(휴대폰)에서도 가로 스크롤이 생기지 않는다
```

## 받는 순서

1. 데이터: `src/data/mi-sample.js` 에 예시 배열 추가 (또는 20-excel-data 로 엑셀 연결)
2. 계산: `src/lib/mi/<이름>.js` 와 `src/lib/mi/<이름>.test.js`. `npm test` 로 먼저 확인합니다
3. 화면: `src/features/<이름>/index.tsx`
4. 주소: `src/routes/_app/<이름>/index.tsx` (PlannedPage 자리를 바꿈)
5. 메뉴: `src/components/layout/data/sidebar-data.ts` (이미 있으면 건너뜀)

표에 정렬, 필터, 여러 줄 선택이 필요하면 3번을 `components/` 아래 여러 파일로 나눕니다.
그때는 `src/features/orders/` 폴더 구조를 그대로 보여 주고 파일 하나씩 요청합니다.
