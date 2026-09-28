import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createHashHistory,
  createRouter,
} from '@tanstack/react-router'
import { DirectionProvider } from './context/direction-provider'
import { FontProvider } from './context/font-provider'
import { ThemeProvider } from './context/theme-provider'
// 라우트 목록은 src/routes 폴더 구조에서 빌드 때 자동으로 만들어집니다.
import { routeTree } from './routeTree.gen'
import './styles/index.css'

// 사내 서버 API 를 붙일 때를 대비해 React Query 를 남겨 두었습니다.
// 지금은 모든 데이터가 파일(엑셀, CSV, data.js)에서 오므로 거의 쓰이지 않습니다.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 60 * 1000 },
  },
})

// file:// 로 여는 포탈이라 주소 뒤에 #/sales 처럼 붙는 해시 방식으로 화면을 바꿉니다.
// 원본 템플릿의 브라우저 히스토리 방식은 서버가 없으면 새로 고침할 때 화면을 찾지 못합니다.
const router = createRouter({
  routeTree,
  history: createHashHistory(),
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <FontProvider>
            <DirectionProvider>
              <RouterProvider router={router} />
            </DirectionProvider>
          </FontProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
