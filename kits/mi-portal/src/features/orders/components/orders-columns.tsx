import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { num } from '@/lib/mi/format'
import { statuses } from '../data/data'
import { type Order } from '../data/schema'
import { OrdersRowActions } from './orders-row-actions'

const numCell = 'text-end tabular-nums'

export const ordersColumns: ColumnDef<Order>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label='이 쪽 전체 선택'
        className='translate-y-0.5'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label='행 선택'
        className='translate-y-0.5'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'id',
    header: ({ column }) => <DataTableColumnHeader column={column} title='수주번호' />,
    cell: ({ row }) => <span className='font-medium tabular-nums'>{row.getValue('id')}</span>,
    enableHiding: false,
  },
  {
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} title='수주일' />,
    cell: ({ row }) => <span className='tabular-nums'>{row.getValue('date')}</span>,
  },
  {
    accessorKey: 'oem',
    header: ({ column }) => <DataTableColumnHeader column={column} title='OEM' />,
    cell: ({ row }) => <Badge variant='outline'>{row.getValue('oem')}</Badge>,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'part',
    header: ({ column }) => <DataTableColumnHeader column={column} title='품목' />,
    meta: { className: 'max-w-0 w-1/5' },
    cell: ({ row }) => <span className='block truncate'>{row.getValue('part')}</span>,
  },
  {
    accessorKey: 'qty',
    header: ({ column }) => <DataTableColumnHeader column={column} title='수량' className='justify-end' />,
    cell: ({ row }) => <div className={numCell}>{num(row.getValue('qty'))}</div>,
  },
  {
    accessorKey: 'unitPrice',
    header: ({ column }) => <DataTableColumnHeader column={column} title='단가' className='justify-end' />,
    cell: ({ row }) => <div className={numCell}>{num(row.getValue('unitPrice'))}</div>,
  },
  {
    id: 'amount',
    accessorFn: (o) => o.qty * o.unitPrice,
    header: ({ column }) => <DataTableColumnHeader column={column} title='금액' className='justify-end' />,
    cell: ({ getValue }) => <div className={numCell + ' font-medium'}>{num(getValue() as number)}</div>,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title='상태' />,
    cell: ({ row }) => {
      const s = statuses.find((x) => x.value === row.getValue('status'))
      if (!s) return null
      return (
        <div className='flex items-center gap-2'>
          <s.icon className='size-4 text-muted-foreground' />
          <span>{s.label}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'due',
    header: ({ column }) => <DataTableColumnHeader column={column} title='납기' />,
    cell: ({ row }) => <span className='tabular-nums'>{row.getValue('due')}</span>,
  },
  {
    id: 'actions',
    cell: ({ row }) => <OrdersRowActions row={row} />,
  },
]
