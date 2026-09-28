import { Link, getRouteApi } from '@tanstack/react-router'
import { AppWindow, ExternalLink } from 'lucide-react'
import { portalApps } from '@/config/apps'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageShell } from '@/components/mi/page-shell'

const route = getRouteApi('/_app/apps/')

export function Apps() {
  const { filter = '' } = route.useSearch()
  const navigate = route.useNavigate()
  const q = filter.trim().toLowerCase()
  const list = portalApps.filter((a) => !q || `${a.title} ${a.description} ${a.owner}`.toLowerCase().includes(q))

  return (
    <PageShell
      title='연결된 앱'
      description='다른 사람이 따로 만든 도구입니다. 포탈 안에서 열리고, 앱마다 따로 돌아가서 하나가 멈춰도 나머지는 그대로입니다.'
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
              <div className='mb-2 flex size-10 items-center justify-center rounded-lg bg-muted'>
                <AppWindow className='size-5' />
              </div>
              <CardTitle>{a.title}</CardTitle>
              <CardDescription>{a.description}</CardDescription>
            </CardHeader>
            <CardFooter className='mt-auto justify-between gap-2 text-sm'>
              <span className='text-muted-foreground'>담당 {a.owner}</span>
              <Link
                to='/apps/$appId'
                params={{ appId: a.id }}
                className='inline-flex items-center gap-1 font-medium text-primary hover:underline'
              >
                열기 <ExternalLink className='size-3.5' />
              </Link>
            </CardFooter>
          </Card>
        ))}
        {list.length === 0 && <p className='text-muted-foreground'>"{filter}" 에 맞는 앱이 없습니다.</p>}
      </div>
    </PageShell>
  )
}
