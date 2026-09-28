import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function UnauthorisedError() {
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>401</h1>
        <span className='font-medium'>인증이 필요합니다</span>
        <p className='text-center text-muted-foreground'>
          이 화면은 인증이 필요합니다.
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            뒤로
          </Button>
          <Button onClick={() => navigate({ to: '/' })}>대시보드로</Button>
        </div>
      </div>
    </div>
  )
}
