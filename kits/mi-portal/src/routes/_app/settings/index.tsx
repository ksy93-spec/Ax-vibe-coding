import { createFileRoute, redirect } from '@tanstack/react-router'

// 설정 첫 화면은 글꼴과 테마입니다.
export const Route = createFileRoute('/_app/settings/')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/appearance' })
  },
})
