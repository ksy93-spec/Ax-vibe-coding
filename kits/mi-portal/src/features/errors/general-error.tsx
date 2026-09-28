import { useNavigate, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  minimal?: boolean
}

export function GeneralError({
  className,
  minimal = false,
}: GeneralErrorProps) {
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className={cn('h-svh w-full', className)}>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        {!minimal && (
          <h1 className='text-[7rem] leading-tight font-bold'>500</h1>
        )}
        <span className='font-medium'>문제가 생겼습니다</span>
        <p className='text-center text-muted-foreground'>
          화면을 그리는 중 오류가 났습니다. <br /> F12 콘솔의 빨간 오류를 ChatGPT 에 붙여넣어 원인을 물어보세요.
        </p>
        {!minimal && (
          <div className='mt-6 flex gap-4'>
            <Button variant='outline' onClick={() => history.go(-1)}>
              뒤로
            </Button>
            <Button onClick={() => navigate({ to: '/' })}>대시보드로</Button>
          </div>
        )}
      </div>
    </div>
  )
}
