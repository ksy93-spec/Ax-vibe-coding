/**
 * exe 앱 실행. miportal:launch/<id> 주소를 열면 PC 에 등록된 실행기(public/launcher/)가 받아서 실행합니다.
 * 브라우저는 실행이 됐는지 알려 주지 않으므로, 반응이 없을 때 볼 곳을 알림으로 같이 보여 줍니다.
 */
import { toast } from 'sonner'
import { type ExeApp, launchUrl } from '@/config/apps'

export function launchExe(app: ExeApp, onHelp?: () => void) {
  const a = document.createElement('a')
  a.href = launchUrl(app)
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  toast(`${app.title} 실행을 요청했습니다.`, {
    description: '브라우저가 열지 물으면 "열기" 를 누르세요. 아무 반응이 없으면 이 PC 에 실행기 등록이 필요합니다.',
    duration: 8000,
    action: onHelp ? { label: '등록 방법', onClick: onHelp } : undefined,
  })
}
