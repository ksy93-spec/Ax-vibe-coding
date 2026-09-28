import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { downloadXlsx } from '@/lib/mi/excel'
import { compact, num, signedPct } from '@/lib/mi/format'
import { LAST, MONTHS, PRODUCTION, SALES_BY_MODEL, TOTAL_SALES, shortMonth, yoy } from '@/lib/mi/sales'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Chart } from '@/components/mi/chart'
import { PageShell } from '@/components/mi/page-shell'

type Model = { model: string; values: number[] }
const MODELS = SALES_BY_MODEL as Model[]

// 연도별 1~N월 누계. N 은 올해 마지막 달입니다.
const lastMonth = Number(MONTHS[LAST].slice(5))
const years = [...new Set(MONTHS.map((m: string) => m.slice(0, 4)))] as string[]
const ytd = (values: number[], year: string) =>
  MONTHS.reduce(
    (s: number, m: string, i: number) => (m.startsWith(year) && Number(m.slice(5)) <= lastMonth ? s + values[i] : s),
    0
  )

function GrowthCell({ v }: { v: number | null }) {
  return (
    <TableCell
      className={cn(
        'text-end tabular-nums',
        v !== null && v > 0 && 'text-emerald-600 dark:text-emerald-400',
        v !== null && v < 0 && 'text-red-600 dark:text-red-400'
      )}
    >
      {signedPct(v)}
    </TableCell>
  )
}

export function Sales() {
  const [view, setView] = useState<'model' | 'balance'>('model')

  const exportXlsx = async () => {
    const name = await downloadXlsx('sales_production.xlsx', [
      {
        name: '월별',
        columns: [
          { header: '월', key: 'month' },
          ...MODELS.map((m) => ({ header: m.model, key: m.model, numFmt: '#,##0' })),
          { header: '판매 합계', key: 'total', numFmt: '#,##0' },
          { header: '생산', key: 'prod', numFmt: '#,##0' },
        ],
        rows: MONTHS.map((month: string, t: number) => ({
          month,
          ...Object.fromEntries(MODELS.map((m) => [m.model, m.values[t]])),
          total: TOTAL_SALES[t],
          prod: PRODUCTION[t],
        })),
      },
    ])
    toast.success(`${name} 로 내려받았습니다.`)
  }

  const modelOption = {
    grid: { left: 8, right: 16, top: 36, bottom: 48, containLabel: true },
    legend: { top: 0 },
    tooltip: { trigger: 'axis' as const, valueFormatter: (v: unknown) => num(v as number) + '대' },
    dataZoom: [{ type: 'slider' as const, startValue: MONTHS.length - 24, height: 20, bottom: 8 }, { type: 'inside' as const }],
    xAxis: { type: 'category' as const, data: MONTHS.map(shortMonth) },
    yAxis: { type: 'value' as const, axisLabel: { formatter: (v: number) => compact(v) } },
    series: MODELS.map((m) => ({
      name: m.model,
      type: 'line' as const,
      data: m.values,
      showSymbol: false,
      endLabel: { show: true, formatter: '{a}' },
    })),
  }

  const balanceOption = {
    grid: { left: 8, right: 16, top: 36, bottom: 48, containLabel: true },
    legend: { top: 0 },
    tooltip: { trigger: 'axis' as const, valueFormatter: (v: unknown) => num(v as number) + '대' },
    dataZoom: [{ type: 'slider' as const, startValue: MONTHS.length - 24, height: 20, bottom: 8 }, { type: 'inside' as const }],
    xAxis: { type: 'category' as const, data: MONTHS.map(shortMonth) },
    yAxis: [
      { type: 'value' as const, axisLabel: { formatter: (v: number) => compact(v) } },
      { type: 'value' as const, splitLine: { show: false }, axisLabel: { formatter: (v: number) => compact(v) } },
    ],
    series: [
      { name: '판매', type: 'line' as const, data: TOTAL_SALES, showSymbol: false },
      { name: '생산', type: 'line' as const, data: PRODUCTION, showSymbol: false },
      {
        name: '생산 - 판매',
        type: 'bar' as const,
        yAxisIndex: 1,
        data: PRODUCTION.map((p: number, t: number) => p - TOTAL_SALES[t]),
        itemStyle: { borderRadius: 0, opacity: 0.6 },
      },
    ],
  }

  const [prevYear, thisYear] = years.slice(-2)

  return (
    <PageShell
      title='차종별 판매·생산'
      description='월별 판매 대수와 생산 대수. 아래 막대를 끌면 기간이 바뀝니다.'
      actions={
        <Button variant='outline' onClick={exportXlsx}>
          <Download /> 엑셀 내려받기
        </Button>
      }
    >
      <Card className='min-w-0'>
        <CardHeader>
          <CardTitle>{view === 'model' ? '차종별 월 판매' : '판매와 생산 차이'}</CardTitle>
          <CardDescription>
            {view === 'model'
              ? '차종마다 선 하나. 범례를 누르면 숨깁니다.'
              : '막대(오른쪽 축)가 양수면 판매보다 많이 만든 달, 음수면 재고를 쓴 달입니다.'}
          </CardDescription>
          <CardAction>
            <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
              <TabsList>
                <TabsTrigger value='model'>차종별</TabsTrigger>
                <TabsTrigger value='balance'>판매 대 생산</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Chart height={360} option={view === 'model' ? modelOption : balanceOption} />
        </CardContent>
      </Card>

      <Card className='min-w-0'>
        <CardHeader>
          <CardTitle>차종별 요약</CardTitle>
          <CardDescription>
            {MONTHS[LAST]} 한 달과 {thisYear}년 1~{lastMonth}월 누계
          </CardDescription>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>차종</TableHead>
                <TableHead className='text-end'>이번 달</TableHead>
                <TableHead className='text-end'>전년 동월 대비</TableHead>
                <TableHead className='text-end'>{thisYear} 누계</TableHead>
                <TableHead className='text-end'>{prevYear} 같은 기간</TableHead>
                <TableHead className='text-end'>누계 증감</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...MODELS, { model: '합계', values: TOTAL_SALES }].map((m) => {
                const now = ytd(m.values, thisYear)
                const before = ytd(m.values, prevYear)
                return (
                  <TableRow key={m.model} className={m.model === '합계' ? 'font-semibold' : undefined}>
                    <TableCell>{m.model}</TableCell>
                    <TableCell className='text-end tabular-nums'>{num(m.values[LAST])}</TableCell>
                    <GrowthCell v={yoy(m.values)} />
                    <TableCell className='text-end tabular-nums'>{num(now)}</TableCell>
                    <TableCell className='text-end tabular-nums'>{num(before)}</TableCell>
                    <GrowthCell v={before ? ((now - before) / before) * 100 : null} />
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
