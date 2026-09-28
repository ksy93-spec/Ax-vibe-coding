import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Apps } from '@/features/apps'

const appsSearchSchema = z.object({
  filter: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_app/apps/')({
  validateSearch: appsSearchSchema,
  component: Apps,
})
