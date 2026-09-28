import { Telescope } from 'lucide-react'

export function ComingSoon() {
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <Telescope size={72} />
        <h1 className='text-4xl leading-tight font-bold'>준비 중인 화면</h1>
        <p className='text-center text-muted-foreground'>
          이 화면은 아직 비어 있습니다. <br />
          PROMPT.md 의 요청 틀로 ChatGPT 에게 만들어 달라고 하세요.
        </p>
      </div>
    </div>
  )
}
