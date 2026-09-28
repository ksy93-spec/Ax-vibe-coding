import { createFileRoute } from '@tanstack/react-router'
import { Fabs } from '@/features/fabs'

export const Route = createFileRoute('/_app/fabs/')({
  component: Fabs,
})
