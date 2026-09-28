/**
 * 포탈에 연결된 앱 목록. 두 종류가 있습니다.
 *
 * html: 다른 사람이 만든 HTML 도구. 포탈 화면 안에 띄웁니다.
 *   빌드해 HTML 한 파일로 합친 뒤(tools/inline-build.cjs) public/apps/<id>/index.html 에 넣고
 *   entry 에 그 경로(포탈 index.html 기준)나 사내 http(s) 주소를 적습니다.
 *
 * exe: PC 에 설치된 exe 프로그램. 포탈의 "실행" 단추가 miportal:launch/<launchId> 주소를 열고,
 *   각 PC 에 한 번 등록해 둔 실행기(public/launcher/)가 apps.ini 에서 launchId 를 찾아 실행합니다.
 *   launchId 는 public/launcher/apps.ini 의 id 와 같아야 합니다 (npm run check 가 확인).
 *   location 은 화면에 보여 줄 설치 위치 안내입니다. 실제로 실행되는 경로는 apps.ini 가 정합니다.
 *
 * 한 줄 추가하면 사이드바의 "연결된 앱", 앱 목록, 대시보드에 나타납니다.
 */
type AppBase = {
  id: string
  title: string
  description: string
  owner: string
}

export type HtmlApp = AppBase & { kind: 'html'; entry: string }
export type ExeApp = AppBase & { kind: 'exe'; launchId: string; location?: string }
export type PortalApp = HtmlApp | ExeApp

export const portalApps: PortalApp[] = [
  {
    id: 'nesting-calc',
    kind: 'exe',
    title: '면취수 계산기',
    description: 'PC 에 설치된 면취수 계산 프로그램을 실행합니다. exe 프로그램 연결 예시입니다.',
    owner: '예시',
    launchId: 'nesting-calc',
    location: 'C:\\Tools\\NestingCalc\\NestingCalc.exe (예시 경로)',
  },
  {
    id: 'nesting-calc-web',
    kind: 'html',
    title: '면취수 계산기 (HTML 예시)',
    description:
      '판 크기와 블랭크 크기로 판당 개수와 수율을 계산합니다. 별도 React 앱을 한 파일로 합쳐 포탈 안에 띄운 예시입니다.',
    owner: '예시',
    entry: 'apps/nesting_calc/index.html',
  },
]

/** exe 앱의 실행 주소 */
export const launchUrl = (app: ExeApp) => `miportal:launch/${app.launchId}`
