import { useState } from 'react'
import { num } from '@/lib/mi/format'
import { FABS } from '@/data/mi-sample'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Chart } from '@/components/mi/chart'
import { KpiCard } from '@/components/mi/kpi-card'
import { PageShell } from '@/components/mi/page-shell'

type Fab = {
  company: string
  site: string
  country: string
  lon: number
  lat: number
  capacity: number
  status: '가동' | '증설' | '계획'
  start: number
}

const ALL = FABS as Fab[]
const STATUSES = ['가동', '증설', '계획'] as const
const COMPANIES = [...new Set(ALL.map((f) => f.company))]

export function Fabs() {
  const [status, setStatus] = useState<'전체' | Fab['status']>('전체')
  const [picked, setPicked] = useState<string | null>(null)
  const rows = ALL.filter((f) => status === '전체' || f.status === status)
  const capa = (list: Fab[]) => list.reduce((s, f) => s + f.capacity, 0)

  return (
    <PageShell
      title='경쟁사 Fab 현황'
      description='거점 위치와 월 생산능력(천 장). 회사와 거점의 연결은 예시입니다.'
    >
      <div className='grid gap-4 sm:grid-cols-3'>
        {STATUSES.map((s) => {
          const list = ALL.filter((f) => f.status === s)
          return (
            <KpiCard
              key={s}
              title={`${s} 거점`}
              value={list.length}
              unit='곳'
              note={`월 ${num(capa(list))}천 장`}
            />
          )
        })}
      </div>

      <Card className='min-w-0'>
        <CardHeader>
          <CardTitle>거점 지도</CardTitle>
          <CardDescription>원 크기는 생산능력, 색은 회사입니다. 원을 누르면 아래 표에서 표시됩니다.</CardDescription>
          <CardAction>
            <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <TabsList>
                {(['전체', ...STATUSES] as const).map((s) => (
                  <TabsTrigger key={s} value={s}>
                    {s}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Chart
            height={420}
            onEvents={{ click: (p) => p.data?.key && setPicked(p.data.key) }}
            option={{
              legend: { top: 0, data: COMPANIES },
              tooltip: {
                trigger: 'item',
                formatter: (p) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const f = (p as any).data.fab as Fab
                  return `${f.company} ${f.site}<br/>${f.status} · 월 ${num(f.capacity)}천 장 · ${f.start}년`
                },
              },
              geo: {
                map: 'world',
                roam: true,
                
                top: 32,
                bottom: 0,
              },
              series: COMPANIES.map((c) => ({
                name: c,
                type: 'scatter' as const,
                coordinateSystem: 'geo' as const,
                symbolSize: (v: number[]) => 8 + Math.sqrt(v[2]) * 2,
                itemStyle: { opacity: 0.85 },
                data: rows
                  .filter((f) => f.company === c)
                  .map((f) => ({
                    key: `${f.company}-${f.site}`,
                    fab: f,
                    value: [f.lon, f.lat, f.capacity],
                  })),
              })),
            }}
          />
        </CardContent>
      </Card>

      <Card className='min-w-0'>
        <CardHeader>
          <CardTitle>거점 목록</CardTitle>
          <CardDescription>
            {rows.length}곳, 월 {num(capa(rows))}천 장
          </CardDescription>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>회사</TableHead>
                <TableHead>거점</TableHead>
                <TableHead>국가</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className='text-end'>월 능력(천 장)</TableHead>
                <TableHead className='text-end'>가동 시작</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows
                .slice()
                .sort((a, b) => b.capacity - a.capacity)
                .map((f) => {
                  const key = `${f.company}-${f.site}`
                  return (
                    <TableRow
                      key={key}
                      data-state={picked === key ? 'selected' : undefined}
                      onClick={() => setPicked(key)}
                      className='cursor-pointer'
                    >
                      <TableCell>{f.company}</TableCell>
                      <TableCell className='font-medium'>{f.site}</TableCell>
                      <TableCell>{f.country}</TableCell>
                      <TableCell>
                        <Badge variant={f.status === '가동' ? 'default' : f.status === '증설' ? 'secondary' : 'outline'}>
                          {f.status}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-end tabular-nums'>{num(f.capacity)}</TableCell>
                      <TableCell className='text-end tabular-nums'>{f.start}</TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  )
}
