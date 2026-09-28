import { useMemo, useState } from 'react'
import { Download, Gauge, Target, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { downloadXlsx } from '@/lib/mi/excel'
import { MODEL_LABELS, MODEL_SHORT, autoForecast } from '@/lib/mi/forecast'
import { compact, growth, num, pct } from '@/lib/mi/format'
import { MONTHS, SALES_BY_MODEL, TOTAL_SALES, deltaOf, shortMonth } from '@/lib/mi/sales'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Chart } from '@/components/mi/chart'
import { KpiCard } from '@/components/mi/kpi-card'
import { PageShell } from '@/components/mi/page-shell'

const SERIES: { key: string; label: string; values: number[] }[] = [
  { key: 'total', label: '전 차종 합계', values: TOTAL_SALES },
  ...(SALES_BY_MODEL as { model: string; values: number[] }[]).map((m) => ({ key: m.model, label: m.model, values: m.values })),
]

/** '2026-08' 다음 n 개월 */
function nextMonths(last: string, n: number) {
  let [y, m] = last.split('-').map(Number)
  return Array.from({ length: n }, () => {
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
    return `${y}-${String(m).padStart(2, '0')}`
  })
}

export function Forecast() {
  const [key, setKey] = useState('total')
  const [horizon, setHorizon] = useState(12)
  const target = SERIES.find((s) => s.key === key) ?? SERIES[0]

  const result = useMemo(() => autoForecast(target.values, horizon, { season: 12 }), [target, horizon])
  const future = nextMonths(MONTHS[MONTHS.length - 1], horizon)
  const fc = result.forecast.map((v: number) => Math.max(0, Math.round(v)))
  const fcSum = fc.reduce((a: number, b: number) => a + b, 0)
  // 예측 기간과 같은 달의 1년 전 실적 합계 (기간은 최대 12개월)
  const lastYearSameMonths = target.values.slice(-12).slice(0, horizon).reduce((a, b) => a + b, 0)

  const history = target.values.slice(-24)
  const labels = [...MONTHS.slice(-24), ...future].map(shortMonth)
  const pad = (n: number) => Array<null>(n).fill(null)

  const exportXlsx = async () => {
    const name = await downloadXlsx('forecast.xlsx', [
      {
        name: '예측',
        columns: [
          { header: '월', key: 'month' },
          { header: '구분', key: 'kind' },
          { header: target.label, key: 'value', numFmt: '#,##0' },
        ],
        rows: [
          ...MONTHS.map((month: string, i: number) => ({ month, kind: '실적', value: target.values[i] })),
          ...future.map((month, i) => ({ month, kind: '예측', value: fc[i] })),
        ],
      },
      {
        name: '방법 비교',
        columns: [
          { header: '방법', key: 'label' },
          { header: 'sMAPE(%)', key: 'error', numFmt: '0.0' },
        ],
        rows: result.candidates.map((c: { label: string; error: number }) => ({ label: c.label, error: c.error })),
      },
    ])
    toast.success(`${name} 로 내려받았습니다.`)
  }

  return (
    <PageShell
      title='자동차 수요예측'
      description={`최근 ${result.holdout}개월을 가려 놓고 여러 방법으로 맞혀 본 뒤, 가장 잘 맞힌 방법으로 앞을 예측합니다.`}
      actions={
        <Button variant='outline' onClick={exportXlsx}>
          <Download /> 엑셀 내려받기
        </Button>
      }
    >
      <div className='flex flex-wrap items-end gap-4'>
        <div className='grid gap-1.5'>
          <Label htmlFor='fc-series'>대상</Label>
          <Select value={key} onValueChange={setKey}>
            <SelectTrigger id='fc-series' className='w-44'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERIES.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-1.5'>
          <Label htmlFor='fc-horizon'>기간</Label>
          <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v))}>
            <SelectTrigger id='fc-horizon' className='w-32'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[3, 6, 12].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}개월
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-3'>
        <KpiCard title='고른 방법' value={MODEL_SHORT[result.model as keyof typeof MODEL_SHORT]} icon={Target} note={result.label} />
        <KpiCard
          title='검증 오차 (sMAPE)'
          value={pct(result.error)}
          icon={Gauge}
          tone={result.error < 5 ? 'good' : result.error < 10 ? 'warn' : 'bad'}
          note='낮을수록 잘 맞았다는 뜻'
        />
        <KpiCard
          title={`앞으로 ${horizon}개월 합계`}
          value={compact(fcSum)}
          unit='대'
          icon={TrendingUp}
          note={`1년 전 같은 달 실적 ${compact(lastYearSameMonths)}대`}
          {...deltaOf(growth(fcSum, lastYearSameMonths), '1년 전 대비')}
        />
      </div>

      <Card className='min-w-0'>
        <CardHeader>
          <CardTitle>{target.label} 실적과 예측</CardTitle>
          <CardDescription>최근 24개월 실적 뒤에 점선으로 예측을 이었습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Chart
            height={340}
            option={{
              grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
              legend: { top: 0 },
              tooltip: { trigger: 'axis', valueFormatter: (v) => (v === null || v === undefined ? '-' : num(v as number) + '대') },
              xAxis: { type: 'category', data: labels },
              yAxis: { type: 'value', scale: true, axisLabel: { formatter: (v: number) => compact(v) } },
              series: [
                { name: '실적', type: 'line', data: [...history, ...pad(horizon)], showSymbol: false },
                {
                  name: '예측',
                  type: 'line',
                  // 마지막 실적 점에서 이어지도록 한 칸 겹칩니다.
                  data: [...pad(history.length - 1), history[history.length - 1], ...fc],
                  lineStyle: { type: 'dashed' },
                  showSymbol: false,
                },
              ],
            }}
          />
        </CardContent>
      </Card>

      <Card className='min-w-0'>
        <CardHeader>
          <CardTitle>방법별 검증 결과</CardTitle>
          <CardDescription>가려 둔 {result.holdout}개월을 각 방법이 얼마나 맞혔는지입니다.</CardDescription>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>방법</TableHead>
                <TableHead className='text-end'>sMAPE</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.candidates.map((c: { model: string; error: number }, i: number) => (
                <TableRow key={c.model}>
                  <TableCell>{MODEL_LABELS[c.model as keyof typeof MODEL_LABELS]}</TableCell>
                  <TableCell className='text-end tabular-nums'>{pct(c.error)}</TableCell>
                  <TableCell className='w-16 text-end'>{i === 0 && <Badge>채택</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  )
}
