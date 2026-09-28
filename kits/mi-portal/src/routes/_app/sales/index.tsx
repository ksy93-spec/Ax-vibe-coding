import { createFileRoute } from '@tanstack/react-router'
import { Sales } from '@/features/sales'

export const Route = createFileRoute('/_app/sales/')({
  component: Sales,
})
