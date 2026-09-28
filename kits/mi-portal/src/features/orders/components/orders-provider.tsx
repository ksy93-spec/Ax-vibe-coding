import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Order } from '../data/schema'

type OrdersDialog = 'create' | 'update' | 'delete' | 'import'

type OrdersContextType = {
  open: OrdersDialog | null
  setOpen: (v: OrdersDialog | null) => void
  currentRow: Order | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Order | null>>
}

const OrdersContext = React.createContext<OrdersContextType | null>(null)

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<OrdersDialog>(null)
  const [currentRow, setCurrentRow] = useState<Order | null>(null)
  return <OrdersContext value={{ open, setOpen, currentRow, setCurrentRow }}>{children}</OrdersContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useOrders = () => {
  const ctx = React.useContext(OrdersContext)
  if (!ctx) throw new Error('useOrders 는 <OrdersProvider> 안에서만 씁니다')
  return ctx
}
