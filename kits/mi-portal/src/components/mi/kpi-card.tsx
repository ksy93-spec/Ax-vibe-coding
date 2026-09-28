/**
 * 지표 카드. 화살표는 값이 움직인 방향, 색은 그게 좋은 일인지를 나타냅니다.
 * 원자재 가격 상승처럼 "올랐지만 나쁜" 경우가 있으니 direction 과 tone 을 따로 받습니다.
 *   <KpiCard title='판매' value='12.3만' unit='대' delta='+3.2% 전년 대비' direction='up' tone='good' icon={Car} />
 */
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type KpiCardProps = {
  title: string
  value: string | number
  unit?: string
  delta?: string
  direction?: 'up' | 'down' | 'flat'
  tone?: 'good' | 'bad' | 'warn'
  note?: string
  icon?: LucideIcon
}

const ARROW = { up: '▲', down: '▼', flat: '–' }
const TONE = {
  good: 'text-emerald-600 dark:text-emerald-400',
  bad: 'text-red-600 dark:text-red-400',
  warn: 'text-amber-600 dark:text-amber-400',
}

export function KpiCard({ title, value, unit, delta, direction, tone, note, icon: Icon }: KpiCardProps) {
  return (
    <Card className='gap-2'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        {Icon && <Icon className='size-4 text-muted-foreground' />}
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>
          {value}
          {unit && <span className='ms-0.5 text-sm font-normal text-muted-foreground'>{unit}</span>}
        </div>
        {delta && (
          <p className={cn('text-xs', tone ? TONE[tone] : 'text-muted-foreground')}>
            {direction && <span aria-hidden='true' className='me-1'>{ARROW[direction]}</span>}
            {delta}
          </p>
        )}
        {note && <p className='text-xs text-muted-foreground'>{note}</p>}
      </CardContent>
    </Card>
  )
}
