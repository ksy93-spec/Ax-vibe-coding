import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { CircleArrowUp, Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { downloadXlsx } from '@/lib/mi/excel'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { statuses } from '../data/data'
import { ORDER_EXCEL_COLUMNS, type Order, type OrderStatus, toExcelRow } from '../data/schema'
import { useOrdersStore } from '../data/store'

function IconButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant='outline' size='icon' className='size-8' aria-label={label} title={label} onClick={onClick}>
          {children}
          <span className='sr-only'>{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function OrdersBulkActions({ table }: { table: Table<Order> }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { setStatus, remove } = useOrdersStore()
  const selected = table.getFilteredSelectedRowModel().rows.map((r) => r.original)

  const changeStatus = (status: OrderStatus) => {
    setStatus(selected.map((o) => o.id), status)
    toast.success(`${selected.length}건의 상태를 ${status}(으)로 바꿨습니다.`)
    table.resetRowSelection()
  }

  const exportSelected = async () => {
    const name = await downloadXlsx('orders_selected.xlsx', [
      { name: '수주', columns: ORDER_EXCEL_COLUMNS, rows: selected.map(toExcelRow) },
    ])
    toast.success(`${selected.length}건을 ${name} 로 내려받았습니다.`)
    table.resetRowSelection()
  }

  return (
    <>
      <BulkActionsToolbar table={table} entityName='수주'>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='icon' className='size-8' aria-label='상태 변경' title='상태 변경'>
                  <CircleArrowUp />
                  <span className='sr-only'>상태 변경</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>상태 변경</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent sideOffset={14}>
            {statuses.map((s) => (
              <DropdownMenuItem key={s.value} onClick={() => changeStatus(s.value)}>
                <s.icon className='size-4 text-muted-foreground' />
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <IconButton label='선택한 수주 엑셀로 내려받기' onClick={exportSelected}>
          <Download />
        </IconButton>
        <IconButton label='선택한 수주 삭제' onClick={() => setConfirmDelete(true)}>
          <Trash2 />
        </IconButton>
      </BulkActionsToolbar>

      <ConfirmDialog
        destructive
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`수주 ${selected.length}건을 삭제할까요?`}
        desc='삭제한 수주는 되돌릴 수 없습니다. 필요하면 먼저 엑셀로 내려받아 두세요.'
        confirmText='삭제'
        handleConfirm={() => {
          remove(selected.map((o) => o.id))
          toast.success(`${selected.length}건을 삭제했습니다.`)
          table.resetRowSelection()
          setConfirmDelete(false)
        }}
      />
    </>
  )
}
