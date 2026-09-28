import { Button } from '@/components/ui/button'

export function MaintenanceError() {
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>503</h1>
        <span className='font-medium'>점검 중입니다</span>
        <p className='text-center text-muted-foreground'>
          지금은 이 화면을 쓸 수 없습니다. <br />
          잠시 후 다시 열어 주세요.
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline'>자세히</Button>
        </div>
      </div>
    </div>
  )
}
