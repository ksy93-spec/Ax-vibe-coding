/**
 * 윗줄의 글자 크기 단추. 눈이 불편한 분도 바로 찾을 수 있게 설정 화면과 별도로 둡니다.
 */
import { Link } from '@tanstack/react-router'
import { ALargeSmall, Check } from 'lucide-react'
import { fontSizes } from '@/config/fonts'
import { cn } from '@/lib/utils'
import { useFont } from '@/context/font-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function TextSizeSwitch() {
  const { fontSize, setFontSize } = useFont()
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='scale-95 rounded-full'>
          <ALargeSmall className='size-[1.2rem]' />
          <span className='sr-only'>글자 크기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-40'>
        <DropdownMenuLabel>글자 크기</DropdownMenuLabel>
        {fontSizes.map((s) => (
          <DropdownMenuItem key={s.id} onClick={() => setFontSize(s.id)}>
            <span style={{ fontSize: `${s.scale}em` }}>{s.label}</span>
            <Check size={14} className={cn('ms-auto', fontSize !== s.id && 'invisible')} />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to='/settings/appearance'>글꼴 바꾸기</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
