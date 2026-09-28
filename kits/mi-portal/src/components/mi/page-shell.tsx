/**
 * 화면 하나의 틀. 윗줄(검색, 테마, 설정, 사용자)과 제목, 설명, 오른쪽 버튼 자리를 가집니다.
 * 새 화면은 이 컴포넌트로 감싸면 다른 화면과 같은 모양이 됩니다.
 *
 *   <PageShell title='수요예측' description='...' actions={<Button>내보내기</Button>}>
 *     ...내용...
 *   </PageShell>
 */
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

type PageShellProps = {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  /** 표처럼 화면 높이를 꽉 채우는 화면이면 true */
  fixed?: boolean
}

export function PageShell({ title, description, actions, children, fixed }: PageShellProps) {
  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main fixed={fixed} className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{title}</h1>
            {description && <p className='text-muted-foreground'>{description}</p>}
          </div>
          {actions && <div className='flex flex-wrap gap-2'>{actions}</div>}
        </div>
        {children}
      </Main>
    </>
  )
}
