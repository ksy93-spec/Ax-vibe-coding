/**
 * 포탈에 연결된 앱 목록.
 *
 * 다른 사람이 따로 만든 앱(React, Vite 등)을 이 포탈에 다시 짜지 않고 붙이는 자리입니다.
 * 앱을 빌드해 HTML 한 파일로 합친 뒤(tools/inline-build.cjs) public/apps/<id>/index.html 에 넣고
 * 여기에 한 줄 추가하면 사이드바의 "연결된 앱" 과 앱 목록 화면에 나타납니다.
 * entry 는 포탈 index.html 기준 상대 경로이거나 사내 http(s) 주소입니다.
 */
export type PortalApp = {
  id: string
  title: string
  description: string
  owner: string
  entry: string
}

export const portalApps: PortalApp[] = [
  {
    id: 'nesting-calc',
    title: '면취수 계산기',
    description:
      '판 크기와 블랭크 크기를 넣으면 판당 개수와 수율을 계산합니다. 별도 React 앱을 한 파일로 합쳐 붙인 예시입니다.',
    owner: '예시',
    entry: 'apps/nesting_calc/index.html',
  },
]
