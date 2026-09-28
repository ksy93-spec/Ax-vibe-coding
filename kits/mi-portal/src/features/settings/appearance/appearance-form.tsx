/**
 * 글자 크기, 글꼴, 테마 설정. 누르는 즉시 바뀌고 이 PC 브라우저에 저장됩니다.
 */
import { useEffect } from 'react'
import { Check } from 'lucide-react'
import { fontList, fontSizes, fontStack } from '@/config/fonts'
import { cn } from '@/lib/utils'
import { loadFontCss, useFont } from '@/context/font-provider'
import { useTheme } from '@/context/theme-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const SAMPLE = '시장 점유율 12.3% 증가, 판매 1,234,567대'

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className='space-y-3'>
      <div>
        <h3 className='font-medium'>{title}</h3>
        <p className='text-sm text-muted-foreground'>{desc}</p>
      </div>
      {children}
    </section>
  )
}

export function AppearanceForm() {
  const { font, setFont, fontSize, setFontSize, resetFont } = useFont()
  const { theme, setTheme } = useTheme()

  // 미리보기를 위해 모든 글꼴의 font.css 를 불러옵니다. 실제 파일은 미리보기 글자가 든 것만 읽힙니다.
  useEffect(() => {
    fontList.forEach((f) => void loadFontCss(f.id))
  }, [])

  return (
    <div className='space-y-10'>
      <Section title='글자 크기' desc='메뉴, 표, 차트 글자가 모두 같은 비율로 바뀝니다. 윗줄의 가 단추로도 바꿀 수 있습니다.'>
        <div className='flex flex-wrap gap-2' role='radiogroup' aria-label='글자 크기'>
          {fontSizes.map((s) => (
            <Button
              key={s.id}
              type='button'
              role='radio'
              aria-checked={fontSize === s.id}
              variant={fontSize === s.id ? 'default' : 'outline'}
              className='h-auto flex-col gap-1 px-4 py-2'
              onClick={() => setFontSize(s.id)}
            >
              <span className='leading-none' style={{ fontSize: `${1.25 * s.scale}rem` }}>
                가
              </span>
              <span className='text-xs font-normal'>
                {s.label} {Math.round(s.scale * 100)}%
              </span>
            </Button>
          ))}
        </div>
      </Section>

      <Section title='글꼴' desc='모두 무료 공개 글꼴(OFL)이고 사내 배포가 허용됩니다. 미리보기 글자는 각 글꼴로 그렸습니다.'>
        <div className='grid gap-3 sm:grid-cols-2' role='radiogroup' aria-label='글꼴'>
          {fontList.map((f) => {
            const selected = font === f.id
            return (
              <button
                key={f.id}
                type='button'
                role='radio'
                aria-checked={selected}
                onClick={() => setFont(f.id)}
                className={cn(
                  'relative rounded-lg border p-4 text-start transition-colors hover:bg-accent',
                  selected && 'border-primary ring-1 ring-primary'
                )}
              >
                <div className='mb-2 flex items-center gap-2 text-sm'>
                  <span className='font-medium'>{f.label}</span>
                  <Badge variant='outline' className='font-normal'>
                    {f.kind}
                  </Badge>
                  {selected && <Check className='ms-auto size-4 text-primary' />}
                </div>
                <p className='text-lg leading-snug' style={{ fontFamily: fontStack(f.id) }}>
                  {SAMPLE}
                </p>
                <p className='mt-1 text-lg font-bold leading-snug' style={{ fontFamily: fontStack(f.id) }}>
                  굵은 글자 ABC 890
                </p>
                <p className='mt-2 text-xs text-muted-foreground'>{f.note}</p>
              </button>
            )
          })}
        </div>
      </Section>

      <Section title='테마' desc='밝은 화면과 어두운 화면 중에서 고릅니다. "시스템" 은 윈도 설정을 따릅니다.'>
        <div className='flex flex-wrap gap-2'>
          {(
            [
              ['light', '밝게'],
              ['dark', '어둡게'],
              ['system', '시스템'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type='button'
              variant={theme === value ? 'default' : 'outline'}
              onClick={() => setTheme(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </Section>

      <Button type='button' variant='ghost' className='px-0 text-muted-foreground' onClick={resetFont}>
        글꼴과 글자 크기를 처음 상태로
      </Button>
    </div>
  )
}
