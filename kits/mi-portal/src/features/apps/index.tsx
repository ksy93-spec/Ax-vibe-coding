import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import { AppWindow, ExternalLink, MonitorPlay, Play } from 'lucide-react'
import { portalApps } from '@/config/apps'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageShell } from '@/components/mi/page-shell'
import { launchExe } from './launch'

const route = getRouteApi('/_app/apps/')

export function Apps() {
  const { filter = '' } = route.useSearch()
  const navigate = route.useNavigate()
  const go = useNavigate()
  const q = filter.trim().toLowerCase()
  const list = portalApps.filter((a) => !q || `${a.title} ${a.description} ${a.owner}`.toLowerCase().includes(q))

  return (
    <PageShell
      title='연결된 앱'
      description='HTML 도구는 포탈 안에서 열리고, exe 프로그램은 실행 단추로 PC 에서 따로 뜹니다.'
    >
      <Input
        placeholder='앱 이름으로 찾기'
        className='h-9 w-full sm:w-64'
        value={filter}
        onChange={(e) =>
          navigate({ search: (prev) => ({ ...prev, filter: e.target.value || undefined }), replace: true })
        }
      />
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {list.map((a) => (
          <Card key={a.id} className='gap-4'>
            <CardHeader>
              <div className='mb-2 flex items-center gap-2'>
                <div className='flex size-10 items-center justify-center rounded-lg bg-muted'>
                  {a.kind === 'exe' ? <MonitorPlay className='size-5' /> : <AppWindow className='size-5' />}
                </div>
                <Badge variant='outline'>{a.kind === 'exe' ? 'exe 프로그램' : 'HTML 도구'}</Badge>
              </div>
              <CardTitle>{a.title}</CardTitle>
              <CardDescription>{a.description}</CardDescription>
            </CardHeader>
            <CardFooter className='mt-auto justify-between gap-2 text-sm'>
              <span className='text-muted-foreground'>담당 {a.owner}</span>
              {a.kind === 'exe' ? (
                <div className='flex items-center gap-1'>
                  <Button variant='ghost' size='sm' asChild>
                    <Link to='/apps/$appId' params={{ appId: a.id }}>
                      안내
                    </Link>
                  </Button>
                  <Button size='sm' onClick={() => launchExe(a, () => go({ to: '/apps/$appId', params: { appId: a.id } }))}>
                    <Play /> 실행
                  </Button>
                </div>
              ) : (
                <Link
                  to='/apps/$appId'
                  params={{ appId: a.id }}
                  className='inline-flex items-center gap-1 font-medium text-primary hover:underline'
                >
                  열기 <ExternalLink className='size-3.5' />
                </Link>
              )}
            </CardFooter>
          </Card>
        ))}
        {list.length === 0 && <p className='text-muted-foreground'>"{filter}" 에 맞는 앱이 없습니다.</p>}
      </div>
    </PageShell>
  )
}
