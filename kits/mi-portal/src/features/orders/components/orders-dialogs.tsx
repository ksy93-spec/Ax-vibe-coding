import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useOrdersStore } from '../data/store'
import { OrdersImportDialog } from './orders-import-dialog'
import { OrdersMutateDrawer } from './orders-mutate-drawer'
import { useOrders } from './orders-provider'

export function OrdersDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useOrders()
  const remove = useOrdersStore((s) => s.remove)
  const clear = () => setTimeout(() => setCurrentRow(null), 300)

  return (
    <>
      <OrdersMutateDrawer open={open === 'create'} onOpenChange={(v) => setOpen(v ? 'create' : null)} />
      <OrdersImportDialog open={open === 'import'} onOpenChange={(v) => setOpen(v ? 'import' : null)} />
      {currentRow && (
        <>
          <OrdersMutateDrawer
            key={`update-${currentRow.id}`}
            open={open === 'update'}
            onOpenChange={(v) => {
              setOpen(v ? 'update' : null)
              if (!v) clear()
            }}
            currentRow={currentRow}
          />
          <ConfirmDialog
            destructive
            open={open === 'delete'}
            onOpenChange={(v) => {
              setOpen(v ? 'delete' : null)
              if (!v) clear()
            }}
            title={`${currentRow.id} 를 삭제할까요?`}
            desc='삭제한 수주는 되돌릴 수 없습니다.'
            confirmText='삭제'
            handleConfirm={() => {
              remove([currentRow.id])
              toast.success(`${currentRow.id} 를 삭제했습니다.`)
              setOpen(null)
              clear()
            }}
          />
        </>
      )}
    </>
  )
}
