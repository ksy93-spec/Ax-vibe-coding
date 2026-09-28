/**
 * HTML 앱 하나를 포탈 안에 띄웁니다. exe 앱은 exe-app-page.tsx 가 맡습니다.
 * 앱은 iframe 안에서 따로 돌기 때문에 React 버전이나 라이브러리가 포탈과 달라도 됩니다.
 * 포탈 테마가 바뀌면 앱에 postMessage({ type: 'portal-theme', theme }) 를,
 * 글자 크기가 바뀌면 postMessage({ type: 'portal-font-scale', scale }) 를 보냅니다 (scale 1 이 보통).
 * 앱 쪽에서 받는 방법은 docs/app-integration.md 에 있습니다.
 */
import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { type HtmlApp } from '@/config/apps'
import { useFont } from '@/context/font-provider'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/mi/page-shell'

export function AppViewer({ app }: { app: HtmlApp }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const { resolvedTheme } = useTheme()

  const { fontScale } = useFont()

  const sendTheme = () => {
    const win = frame.current?.contentWindow
    win?.postMessage({ type: 'portal-theme', theme: resolvedTheme }, '*')
    win?.postMessage({ type: 'portal-font-scale', scale: fontScale }, '*')
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(sendTheme, [resolvedTheme, fontScale])

  return (
    <PageShell
      fixed
      title={app.title}
      description={app.description}
      actions={
        <>
          <Button variant='outline' size='sm' asChild>
            <Link to='/apps'>
              <ArrowLeft /> 앱 목록
            </Link>
          </Button>
          <Button variant='outline' size='sm' asChild>
            <a href={app.entry} target='_blank' rel='noreferrer'>
              새 창에서 열기 <ExternalLink />
            </a>
          </Button>
        </>
      }
    >
      <iframe
        ref={frame}
        key={app.id}
        title={app.title}
        src={app.entry}
        onLoad={sendTheme}
        className='min-h-[480px] w-full flex-1 rounded-lg border bg-background'
      />
    </PageShell>
  )
}
