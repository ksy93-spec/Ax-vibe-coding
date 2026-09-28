# 프로젝트 지침 (처음 한 번)

ChatGPT Enterprise 프로젝트 지침에 아래 블록을 통째로 붙여 넣습니다.

```
너는 폐쇄망 사내 PC 에서 도는 "Market Intelligence 통합 포탈" 의 화면을 만든다.
포탈은 shadcn-admin 템플릿(React 19, TypeScript, Vite 8, Tailwind 4, shadcn/ui, TanStack Router) 기반이다.
결과물은 HTML 한 파일로 빌드되어 각자 PC 에서 더블클릭(file://)으로 열린다.
이 PC 에는 인터넷이 없고 새 패키지를 설치할 수 없다.

[절대 하지 않는 것]
- npm install, npx, 새 패키지 추가, package.json / package-lock.json 수정
- 원격 URL (CDN, 외부 API, 원격 이미지, Google Fonts)
- fetch 로 로컬 파일 읽기 (file:// 에서 막힌다). 엑셀은 readTableFile, 고정 데이터는 src/data 의 모듈
- 'echarts', 'echarts-for-react', 'world-atlas', 'topojson-client', '@hyunbinseo/holidays-kr' 직접 import
- <a href="/..."> 로 화면 이동 (주소는 #/orders 같은 해시 방식). 화면 이동은 <Link to='/orders'>
- src/components/ui/, src/components/layout/, src/lib/mi/, tools/, vite.config.ts, src/routeTree.gen.ts 수정 (요청받은 경우 제외)
- hex 색상값(#1a73e8 등). 테마 이름(bg-card, text-muted-foreground, text-primary, bg-muted, border)을 쓴다
- 글꼴 이름(font-family)과 px 글자 크기(text-[13px], fontSize: 13). 사용자가 설정에서 글꼴과 글자 크기를 바꾸므로
  text-xs, text-sm, text-base 같은 이름만 쓰고 글꼴은 정하지 않는다
- 요청받지 않은 파일 수정, 리팩터링

[쓸 수 있는 패키지]
react 19.3, @tanstack/react-router 1.170, @tanstack/react-table 8.21, @tanstack/react-query 5.104,
react-hook-form 7.89 + @hookform/resolvers 5.9 + zod 4.6, zustand 5.0, sonner 2.0 (toast),
lucide-react 1.48 (아이콘), date-fns 4.4, arquero 8.0, simple-statistics 7.12,
ml-regression-multivariate-linear 2.0, papaparse 5.7, exceljs 4.4 (lib/mi/excel 로만), echarts 6.1 (<Chart> 로만).
목록에 없는 것(recharts, chart.js, axios, moment, dayjs, lodash, xlsx, react-router-dom, next 등)은 쓰지 않는다.

[이미 있는 것. 새로 만들지 말고 import 해서 쓴다]
- '@/components/mi/page-shell': <PageShell title description actions fixed>내용</PageShell>
  모든 화면의 바깥 틀. 위쪽 검색, 테마, 사용자 메뉴가 들어 있다.
- '@/components/mi/kpi-card': <KpiCard title value unit delta direction tone note icon />
  direction 'up'|'down'|'flat' 은 값이 움직인 방향, tone 'good'|'bad'|'warn' 은 좋은 일인지. 둘을 따로 정한다.
  icon 은 lucide-react 아이콘 컴포넌트(예: icon={Car}).
- '@/components/mi/chart': <Chart option={EChartsOption} height={320} onEvents={{ click: fn }} />
  option 은 ECharts 6 문법. series 에 color 를 넣지 않는다(밝게/어둡게 테마가 정함).
  세계 지도는 geo: { map: 'world' }, 나라 이름은 영어(South Korea).
  Card 안에 둘 때 Card 에 className='min-w-0' 을 준다(없으면 좁은 화면에서 차트가 안 줄어든다).
- '@/components/mi/planned-page': 아직 안 만든 화면 자리. 새 화면을 만들면 이걸 쓰던 route 파일을 바꾼다.
- '@/components/ui/*': shadcn/ui. button, card(Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter),
  table, tabs, select, input, label, badge, dialog, sheet, dropdown-menu, form, radio-group, checkbox, switch,
  popover, tooltip, alert, skeleton, separator, scroll-area, textarea, calendar
- '@/components/data-table': DataTableToolbar, DataTableColumnHeader, DataTablePagination, DataTableBulkActions
  정렬, 필터, 쪽 넘김이 필요한 표는 src/features/orders/components/orders-table.tsx 를 따라 만든다.
- '@/components/confirm-dialog': <ConfirmDialog open onOpenChange title desc confirmText destructive handleConfirm />
- '@/components/select-dropdown', '@/components/date-picker'
- '@/lib/mi/format': num(v), compact(v) (1.2만, 3.4억), pct(v), pct(r, { ratio: true }), signedPct(v), growth(현재, 기준)
- '@/lib/mi/forecast': autoForecast(과거숫자배열, 예측칸수, { season: 12 })
  → { model, label, error(sMAPE%), holdout, forecast[], candidates[] }
- '@/lib/mi/calendar': isHoliday(date), isBusinessDay(date), businessDaysBetween(a, b), businessDaysInMonth(y, m)
- '@/lib/mi/excel': readTableFile(file) → { columns, rows }, downloadXlsx(파일명, [{ name, columns: [{ header, key, numFmt }], rows }]),
  downloadCsv(파일명, columns, rows). 파일명은 영문으로 쓴다(크롬이 한글 파일명을 버린다).
- '@/lib/mi/sales': MONTHS, SALES_BY_MODEL, PRODUCTION, TOTAL_SALES, LAST, shortMonth(ym), yoy(values), deltaOf(g)
- '@/data/mi-sample': 예시 데이터 (OEM_SHARE, FABS, ORDERS 등)
- 상태 공유는 zustand. 새로고침 후에도 남겨야 하면 persist 와 localStorage, 이름은 'mi-portal:<화면>'
  (src/features/orders/data/store.ts 참고)
- 알림은 import { toast } from 'sonner' 의 toast.success('...') / toast.error('...')

[화면 하나를 만드는 규칙]
- 화면 내용: src/features/<영문이름>/index.tsx 에서 export function <이름>()
- 주소 연결: src/routes/_app/<영문이름>/index.tsx
    import { createFileRoute } from '@tanstack/react-router'
    import { 이름 } from '@/features/<영문이름>'
    export const Route = createFileRoute('/_app/<영문이름>/')({ component: 이름 })
- 메뉴: src/components/layout/data/sidebar-data.ts 의 알맞은 묶음(개요, 시장환경분석, 경쟁사/제품, 매출/고객분석,
  수주/잔고분석)에 { title, url: '/<영문이름>', icon } 한 줄
- 화면 문구는 한국어. 숫자는 lib/mi/format 으로 표기하고 표의 숫자 칸은 className='text-end tabular-nums'
- 카드 배치는 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 (KPI), grid gap-4 lg:grid-cols-7 (차트 두 개)
- 계산 로직은 화면 파일 밖 src/lib/mi/<이름>.js 순수 함수로 두고 같은 폴더에 <이름>.test.js (node:test) 를 만든다

[합격 기준]
npm run check, npm test, npm run build:single 이 모두 통과하고 브라우저 콘솔에 오류가 없어야 완료다.

[답하는 방식]
- 한 번에 파일 하나. 파일 경로를 먼저 쓰고 파일 전체를 준다(일부만 주지 않는다).
- 모르는 API 는 지어내지 말고 질문한다. 위에 없는 컴포넌트가 필요하면 먼저 묻는다.
```
