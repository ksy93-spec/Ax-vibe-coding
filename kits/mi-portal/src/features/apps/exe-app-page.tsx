/**
 * exe 앱 화면. 실행 단추와 처음 한 번 해야 하는 실행기 등록 안내를 보여 줍니다.
 */
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Copy, Play } from 'lucide-react'
import { toast } from 'sonner'
import { type ExeApp } from '@/config/apps'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageShell } from '@/components/mi/page-shell'
import { launchExe } from './launch'

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('복사했습니다.')
  } catch {
    toast.error('복사하지 못했습니다. 글자를 직접 선택해 복사하세요.')
  }
}

export function ExeAppPage({ app }: { app: ExeApp }) {
  const scrollToHelp = () => document.getElementById('launcher-help')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <PageShell
      title={app.title}
      description={app.description}
      actions={
        <Button variant='outline' size='sm' asChild>
          <Link to='/apps'>
            <ArrowLeft /> 앱 목록
          </Link>
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <CardTitle>PC 에 설치된 프로그램</CardTitle>
            <Badge variant='outline'>exe</Badge>
          </div>
          <CardDescription>누르면 이 PC 에서 프로그램이 따로 창으로 열립니다. 포탈 화면 안에는 뜨지 않습니다.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Button size='lg' onClick={() => launchExe(app, scrollToHelp)}>
            <Play /> {app.title} 실행
          </Button>
          {app.location && (
            <div className='flex flex-wrap items-center gap-2 text-sm'>
              <span className='text-muted-foreground'>설치 위치</span>
              <code className='rounded bg-muted px-2 py-1'>{app.location}</code>
              <Button variant='ghost' size='sm' onClick={() => copy(app.location!)}>
                <Copy /> 복사
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card id='launcher-help'>
        <CardHeader>
          <CardTitle>처음 한 번: 실행기 등록</CardTitle>
          <CardDescription>실행 단추를 눌러도 반응이 없으면 이 PC 에 실행기가 등록되지 않은 것입니다.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3 text-sm'>
          <ol className='list-decimal space-y-2 ps-5'>
            <li>
              포탈 폴더의 <code className='rounded bg-muted px-1'>launcher</code> 폴더를 엽니다
              (이 화면을 연 <code className='rounded bg-muted px-1'>index.html</code> 옆에 있습니다. 킷 원본에서는{' '}
              <code className='rounded bg-muted px-1'>public\launcher</code>).
            </li>
            <li>
              <code className='rounded bg-muted px-1'>register.bat</code> 을 더블클릭합니다. 관리자 권한은 필요 없습니다.
              창에 "등록했습니다" 와 프로그램 목록이 나오면 됩니다.
            </li>
            <li>
              포탈로 돌아와 실행 단추를 누릅니다. 브라우저가 "MI Portal Launcher 를 열까요?" 하고 물으면 열기를 누릅니다.
              "항상 허용" 을 체크하면 다음부터 묻지 않습니다.
            </li>
          </ol>
          <p className='text-muted-foreground'>
            실행기는 <code className='rounded bg-muted px-1'>launcher\apps.ini</code> 에 적힌 프로그램만 실행합니다.
            이 앱의 id 는 <code className='rounded bg-muted px-1'>{app.launchId}</code> 입니다.
            "목록에 없습니다" 나 "파일을 찾을 수 없습니다" 창이 뜨면 apps.ini 의 경로를 고친 뒤 register.bat 을 다시 실행하세요.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  )
}
