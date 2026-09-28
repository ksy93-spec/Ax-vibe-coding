import { createFileRoute, notFound } from '@tanstack/react-router'
import { portalApps } from '@/config/apps'
import { AppViewer } from '@/features/apps/app-viewer'
import { ExeAppPage } from '@/features/apps/exe-app-page'

export const Route = createFileRoute('/_app/apps/$appId')({
  loader: ({ params }) => {
    const app = portalApps.find((a) => a.id === params.appId)
    if (!app) throw notFound()
    return app
  },
  component: function AppRoute() {
    const app = Route.useLoaderData()
    return app.kind === 'exe' ? <ExeAppPage app={app} /> : <AppViewer app={app} />
  },
})
