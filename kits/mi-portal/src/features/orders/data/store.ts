/**
 * 수주 목록 저장소(zustand). 대시보드와 수주 관리 화면이 같은 목록을 봅니다.
 *
 * 고친 내용은 이 PC 브라우저의 localStorage('mi-portal:orders')에 남아 새로고침해도 유지됩니다.
 * 다른 사람과는 공유되지 않습니다. 원본은 공유 폴더의 엑셀로 두고,
 * 이 화면에서 가져와 고친 뒤 다시 내려받는 방식으로 쓰세요.
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { sampleOrders } from './data'
import { type Order, type OrderStatus } from './schema'

type OrdersState = {
  orders: Order[]
  add: (order: Order) => void
  update: (id: string, order: Order) => void
  remove: (ids: string[]) => void
  setStatus: (ids: string[], status: OrderStatus) => void
  replaceAll: (orders: Order[]) => void
  append: (orders: Order[]) => void
  nextId: () => string
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: sampleOrders,
      add: (order) => set((s) => ({ orders: [order, ...s.orders] })),
      update: (id, order) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? order : o)) })),
      remove: (ids) => set((s) => ({ orders: s.orders.filter((o) => !ids.includes(o.id)) })),
      setStatus: (ids, status) =>
        set((s) => ({ orders: s.orders.map((o) => (ids.includes(o.id) ? { ...o, status } : o)) })),
      replaceAll: (orders) => set({ orders }),
      append: (orders) =>
        set((s) => {
          // 같은 수주번호는 가져온 쪽으로 덮어씁니다.
          const incoming = new Map(orders.map((o) => [o.id, o]))
          return { orders: [...orders, ...s.orders.filter((o) => !incoming.has(o.id))] }
        }),
      nextId: () => {
        const year = new Date().getFullYear()
        const max = get().orders.reduce((m, o) => {
          const n = Number(/(\d+)$/.exec(o.id)?.[1] ?? 0)
          return o.id.startsWith(`SO-${year}-`) ? Math.max(m, n) : m
        }, 0)
        return `SO-${year}-${String(max + 1).padStart(3, '0')}`
      },
    }),
    {
      name: 'mi-portal:orders',
      // 저장 형식을 바꾸면 version 을 올리세요. 예전 저장분은 버리고 예시 데이터로 시작합니다.
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ orders: s.orders }),
    }
  )
)
