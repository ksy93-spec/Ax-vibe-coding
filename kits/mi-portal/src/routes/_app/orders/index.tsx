import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Orders } from '@/features/orders'
import { ORDER_STATUSES } from '@/features/orders/data/schema'

// 주소 뒤 ?status=확정&page=2 같은 검색 조건. 표의 필터와 쪽 번호가 여기에 남습니다.
const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z.array(z.enum(ORDER_STATUSES)).optional().catch([]),
  oem: z.array(z.string()).optional().catch([]),
  filter: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_app/orders/')({
  validateSearch: searchSchema,
  component: Orders,
})
