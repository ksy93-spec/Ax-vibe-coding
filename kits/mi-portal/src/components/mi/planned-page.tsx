/**
 * 아직 만들지 않은 화면의 자리. 메뉴와 주소는 먼저 잡아 두고, 내용은 사내에서 채웁니다.
 * 사내 모델에게 이 파일 대신 features/<화면>/index.tsx 를 새로 쓰게 하면 됩니다.
 * 방법은 prompts/ 폴더의 "새 화면 만들기" 프롬프트를 보세요.
 */
import { Hammer } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageShell } from '@/components/mi/page-shell'

type PlannedPageProps = {
  title: string
  description: string
  /** 이 화면에 들어갈 내용 */
  contents: string[]
  /** 읽어 들일 엑셀의 머리글 예시 */
  columns: string[]
  /** 참고할 기존 화면 (예: '수주 관리') */
  reference: string
}

export function PlannedPage({ title, description, contents, columns, reference }: PlannedPageProps) {
  return (
    <PageShell title={title} description={description}>
      <Card className='border-dashed'>
        <CardHeader>
          <div className='mb-2 flex size-10 items-center justify-center rounded-lg bg-muted'>
            <Hammer className='size-5' />
          </div>
          <CardTitle>아직 만들지 않은 화면입니다</CardTitle>
          <CardDescription>메뉴와 주소만 잡아 두었습니다. 아래 내용을 기준으로 사내에서 채우면 됩니다.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-6 text-sm md:grid-cols-3'>
          <section>
            <h2 className='mb-2 font-semibold'>들어갈 내용</h2>
            <ul className='list-disc space-y-1 ps-5 text-muted-foreground'>
              {contents.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className='mb-2 font-semibold'>엑셀 머리글 예시</h2>
            <div className='flex flex-wrap gap-1.5'>
              {columns.map((c) => (
                <code key={c} className='rounded bg-muted px-1.5 py-0.5 text-xs'>
                  {c}
                </code>
              ))}
            </div>
          </section>
          <section>
            <h2 className='mb-2 font-semibold'>만드는 순서</h2>
            <ol className='list-decimal space-y-1 ps-5 text-muted-foreground'>
              <li>prompts/10-new-page.md 를 열어 빈칸을 채웁니다.</li>
              <li>사내 모델에 붙여 넣고 파일 하나씩 받습니다.</li>
              <li>{reference} 화면 코드를 같이 보여 주면 모양이 맞춰집니다.</li>
              <li>npm run check 와 npm test 가 통과하면 끝입니다.</li>
            </ol>
          </section>
        </CardContent>
      </Card>
    </PageShell>
  )
}
