import {
  AppWindow,
  Building2,
  ChartColumnBig,
  ClipboardList,
  Factory,
  Globe2,
  LayoutDashboard,
  Palette,
  Receipt,
  TrendingUp,
} from 'lucide-react'
import { portalApps } from '@/config/apps'
import { type SidebarData } from '../types'

// 사이드바 메뉴. 새 화면을 만들면 여기에 한 줄 추가합니다.
// url 은 src/routes/_app/ 아래 폴더 이름과 같아야 합니다.
export const sidebarData: SidebarData = {
  user: {
    name: '사용자',
    email: '부서명을 여기에',
    avatar: '',
  },
  navGroups: [
    {
      title: '개요',
      items: [{ title: '대시보드', url: '/', icon: LayoutDashboard }],
    },
    {
      title: '시장과 경쟁',
      items: [
        { title: '시장환경분석', url: '/market', icon: Globe2 },
        { title: '경쟁사 Fab 현황', url: '/fabs', icon: Factory },
        { title: 'OEM별 전략', url: '/oem', icon: Building2 },
      ],
    },
    {
      title: '판매와 생산',
      items: [
        { title: '차종별 판매·생산', url: '/sales', icon: ChartColumnBig },
        { title: '수요예측', url: '/forecast', icon: TrendingUp },
      ],
    },
    {
      title: '영업 관리',
      items: [
        { title: '수주 관리', url: '/orders', icon: ClipboardList },
        { title: '매출 관리', url: '/revenue', icon: Receipt },
      ],
    },
    {
      title: '연결된 앱',
      items: [
        {
          title: '앱',
          icon: AppWindow,
          items: [
            { title: '전체 앱', url: '/apps' },
            ...portalApps.map((a) => ({ title: a.title, url: `/apps/${a.id}` })),
          ],
        },
      ],
    },
    {
      title: '설정',
      items: [
        { title: '글꼴과 테마', url: '/settings/appearance', icon: Palette },
      ],
    },
  ],
}
