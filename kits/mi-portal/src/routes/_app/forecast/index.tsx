import { createFileRoute } from '@tanstack/react-router'
import { Forecast } from '@/features/forecast'

export const Route = createFileRoute('/_app/forecast/')({
  component: Forecast,
})
