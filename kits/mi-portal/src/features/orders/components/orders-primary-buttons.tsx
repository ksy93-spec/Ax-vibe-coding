import { Download, Plus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { downloadXlsx } from '@/lib/mi/excel'
import { Button } from '@/components/ui/button'
import { ORDER_EXCEL_COLUMNS, toExcelRow } from '../data/schema'
import { useOrdersStore } from '../data/store'
import { useOrders } from './orders-provider'

export function OrdersPrimaryButtons() {
  const { setOpen } = useOrders()
  const orders = useOrdersStore((s) => s.orders)

  const exportAll = async () => {
    const name = await downloadXlsx('orders.xlsx', [
      { name: '수주', columns: ORDER_EXCEL_COLUMNS, rows: orders.map(toExcelRow) },
    ])
    toast.success(`${orders.length}건을 ${name} 로 내려받았습니다.`)
  }

  return (
    <div className='flex flex-wrap gap-2'>
      <Button variant='outline' onClick={() => setOpen('import')}>
        <Upload /> 엑셀 가져오기
      </Button>
      <Button variant='outline' onClick={exportAll}>
        <Download /> 엑셀 내려받기
      </Button>
      <Button onClick={() => setOpen('create')}>
        <Plus /> 새 수주
      </Button>
    </div>
  )
}
