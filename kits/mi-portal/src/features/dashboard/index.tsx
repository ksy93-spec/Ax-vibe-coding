import { Link } from '@tanstack/react-router'
import { AppWindow, ArrowRight, MonitorPlay, BatteryCharging, Car, ClipboardList, Factory } from 'lucide-react'
import { compact, num, pct } from '@/lib/mi/format'
import { LAST, MONTHS, PRODUCTION, SALES_BY_MODEL, TOTAL_SALES, deltaOf, shortMonth, yoy } from '@/lib/mi/sales'
import { OEM_SHARE } from '@/data/mi-sample'
import { portalApps } from '@/config/apps'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Chart } from '@/components/mi/chart'
import { KpiCard } from '@/components/mi/kpi-card'
import { PageShell } from '@/components/mi/page-shell'
import { useOrdersStore } from '@/features/orders/data/store'

const RECENT = 12

export function Dashboard() {
  const orders = useOrdersStore((s) => s.orders)
  const confirmed = orders.filter((o) => o.status === '확정').reduce((a, o) => a + o.qty * o.unitPrice, 0)
  const recentOrders = [...orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  const ev = SALES_BY_MODEL.find((m: { model: string }) => m.model.startsWith('EV'))
  const evShare = ev ? ev.values[LAST] / TOTAL_SALES[LAST] : null
  const evShareLy = ev ? ev.values[LAST - 12] / TOTAL_SALES[LAST - 12] : null
  const months = MONTHS.slice(-RECENT)
  const oemTotal = OEM_SHARE.reduce((s: number, o: { units: number }) => s + o.units, 0)

  return (
    <PageShell title='대시보드' description={`${MONTHS[LAST].slice(0, 4)}년 ${Number(MONTHS[LAST].slice(5))}월 기준. 숫자는 전부 예시 데이터입니다.`}>
      <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4'>
        <KpiCard
          title='이번 달 판매'
          value={compact(TOTAL_SALES[LAST])}
          unit='대'
          icon={Car}
          tone='good'
          {...deltaOf(yoy(TOTAL_SALES))}
        />
        <KpiCard title='이번 달 생산' value={compact(PRODUCTION[LAST])} unit='대' icon={Factory} {...deltaOf(yoy(PRODUCTION))} />
        <KpiCard
          title='EV 판매 비중'
          value={pct(evShare, { ratio: true })}
          icon={BatteryCharging}
          note={evShareLy === null ? undefined : `작년 같은 달 ${pct(evShareLy, { ratio: true })}`}
        />
        <KpiCard
          title='확정 수주액'
          value={compact(confirmed)}
          unit='원'
          icon={ClipboardList}
          note={`${orders.filter((o) => o.status === '확정').length}건 확정`}
        />
      </div>

      <div className='grid gap-4 lg:grid-cols-7'>
        <Card className='min-w-0 lg:col-span-4'>
          <CardHeader>
            <CardTitle>월별 판매와 생산</CardTitle>
            <CardDescription>최근 {RECENT}개월. 막대는 차종별 판매, 선은 생산입니다.</CardDescription>
            <CardAction>
              <Button variant='ghost' size='sm' asChild>
                <Link to='/sales'>
                  자세히 <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Chart
              height={300}
              option={{
                grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
                legend: { top: 0 },
                tooltip: { trigger: 'axis', valueFormatter: (v) => num(v as number) + '대' },
                xAxis: { type: 'category', data: months.map(shortMonth) },
                yAxis: { type: 'value', axisLabel: { formatter: (v: number) => compact(v) } },
                series: [
                  ...SALES_BY_MODEL.map((m: { model: string; values: number[] }) => ({
                    name: m.model,
                    type: 'bar' as const,
                    stack: 'sales',
                    data: m.values.slice(-RECENT),
                    itemStyle: { borderRadius: 0 },
                  })),
                  { name: '생산', type: 'line' as const, data: PRODUCTION.slice(-RECENT) },
                ],
              }}
            />
          </CardContent>
        </Card>

        <Card className='min-w-0 lg:col-span-3'>
          <CardHeader>
            <CardTitle>OEM별 판매 비중</CardTitle>
            <CardDescription>2026년 1~8월 누계</CardDescription>
          </CardHeader>
          <CardContent>
            <Chart
              height={300}
              option={{
                grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => num(v as number) + '대' },
                xAxis: { type: 'value', show: false },
                yAxis: { type: 'category', inverse: true, data: OEM_SHARE.map((o: { oem: string }) => o.oem) },
                series: [
                  {
                    type: 'bar',
                    data: OEM_SHARE.map((o: { units: number }) => o.units),
                    itemStyle: { borderRadius: [0, 4, 4, 0] },
                    label: {
                      show: true,
                      position: 'right',
                      formatter: (p) => pct(((p.value as number) / oemTotal) * 100),
                    },
                  },
                ],
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-4 lg:grid-cols-7'>
        <Card className='min-w-0 lg:col-span-4'>
          <CardHeader>
            <CardTitle>최근 수주</CardTitle>
            <CardDescription>수주 관리 화면에서 고친 내용이 바로 반영됩니다.</CardDescription>
            <CardAction>
              <Button variant='ghost' size='sm' asChild>
                <Link to='/orders'>
                  전체 보기 <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className='space-y-3'>
            {recentOrders.map((o) => (
              <div key={o.id} className='flex items-center gap-3 text-sm'>
                <div className='min-w-0 flex-1'>
                  <p className='truncate font-medium'>
                    {o.oem} · {o.part}
                  </p>
                  <p className='text-muted-foreground'>
                    {o.id} · {o.date}
                  </p>
                </div>
                <Badge variant={o.status === '확정' ? 'default' : 'outline'}>{o.status}</Badge>
                <span className='w-20 text-end font-medium tabular-nums'>{compact(o.qty * o.unitPrice)}원</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className='min-w-0 lg:col-span-3'>
          <CardHeader>
            <CardTitle>연결된 앱</CardTitle>
            <CardDescription>HTML 도구는 포탈 안에서, exe 프로그램은 PC 에서 따로 엽니다.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-2'>
            {portalApps.map((a) => (
              <Link
                key={a.id}
                to='/apps/$appId'
                params={{ appId: a.id }}
                className='flex items-center gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-accent'
              >
                {a.kind === 'exe' ? (
                  <MonitorPlay className='size-5 shrink-0 text-muted-foreground' />
                ) : (
                  <AppWindow className='size-5 shrink-0 text-muted-foreground' />
                )}
                <div className='min-w-0 flex-1'>
                  <p className='font-medium'>
                    {a.title}
                    {a.kind === 'exe' && <span className='ms-2 text-xs font-normal text-muted-foreground'>exe</span>}
                  </p>
                  <p className='truncate text-muted-foreground'>{a.description}</p>
                </div>
              </Link>
            ))}
            <p className='pt-1 text-xs text-muted-foreground'>
              앱을 더 붙이려면 src/config/apps.ts 에 한 줄 추가하세요.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
