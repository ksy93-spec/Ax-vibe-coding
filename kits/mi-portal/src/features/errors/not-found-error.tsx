import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFoundError() {
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>404</h1>
        <span className='font-medium'>화면을 찾을 수 없습니다</span>
        <p className='text-center text-muted-foreground'>
          주소가 바뀌었거나 아직 만들지 않은 화면입니다.
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
