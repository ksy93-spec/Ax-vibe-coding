import { CircleCheck, CirclePause, ClipboardList, Timer } from 'lucide-react'
import { compact } from '@/lib/mi/format'
import { KpiCard } from '@/components/mi/kpi-card'
import { PageShell } from '@/components/mi/page-shell'
import { useOrdersStore } from './data/store'
import { OrdersDialogs } from './components/orders-dialogs'
import { OrdersPrimaryButtons } from './components/orders-primary-buttons'
import { OrdersProvider } from './components/orders-provider'
import { OrdersTable } from './components/orders-table'

export function Orders() {
  const orders = useOrdersStore((s) => s.orders)
  const sum = (status: string) =>
    orders.filter((o) => o.status === status).reduce((a, o) => a + o.qty * o.unitPrice, 0)

  return (
    <OrdersProvider>
      <PageShell
        title='수주 관리'
        description='고친 내용은 이 PC 브라우저에만 저장됩니다. 공유하려면 엑셀로 내려받아 공유 폴더에 두세요.'
        actions={<OrdersPrimaryButtons />}
      >
        <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4'>
          <KpiCard title='확정 수주액' value={compact(sum('확정'))} unit='원' icon={CircleCheck} />
          <KpiCard title='협의 중' value={compact(sum('협의'))} unit='원' icon={Timer} />
          <KpiCard title='보류' value={compact(sum('보류'))} unit='원' icon={CirclePause} />
          <KpiCard title='건수' value={orders.length} unit='건' icon={ClipboardList} />
        </div>
        <OrdersTable data={orders} />
      </PageShell>
      <OrdersDialogs />
    </OrdersProvider>
  )
}
