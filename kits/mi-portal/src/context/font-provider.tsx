/**
 * 글꼴과 글자 크기. 고른 값은 이 PC 브라우저(localStorage)에 남습니다.
 *
 * 글꼴: <html> 의 --app-font 변수를 바꾸고, 그 글꼴의 fonts/<id>/font.css 를 한 번만 불러옵니다.
 * 글자 크기: <html> 의 font-size 를 % 로 바꿉니다. Tailwind 크기가 전부 rem 이라 화면 전체가 함께 커집니다.
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { type FontId, type FontSizeId, fontList, fontSizes, fontStack, fonts } from '@/config/fonts'
import { getCookie, removeCookie, setCookie } from '@/lib/cookies'

const FONT_KEY = 'font'
const SIZE_KEY = 'font-size'
const MAX_AGE = 60 * 60 * 24 * 365

// 빌드한 포탈은 index.html 옆 fonts/, demo 폴더에서 열면 킷의 public/fonts/ 에 글꼴이 있습니다.
const FONT_BASES = ['fonts/', '../public/fonts/']

const loading = new Map<string, Promise<void>>()

/** 글꼴의 font.css 를 <head> 에 넣습니다. 첫 경로에서 못 찾으면 다음 경로를 씁니다. */
export function loadFontCss(id: FontId): Promise<void> {
  const info = fontList.find((f) => f.id === id)
  if (!info?.family) return Promise.resolve()
  const cached = loading.get(id)
  if (cached) return cached
  const p = new Promise<void>((resolve) => {
    const tryBase = (i: number) => {
      if (i >= FONT_BASES.length) return resolve()
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `${FONT_BASES[i]}${id}/font.css`
      link.dataset.font = id
      link.onload = () => resolve()
      link.onerror = () => {
        link.remove()
        tryBase(i + 1)
      }
      document.head.appendChild(link)
    }
    tryBase(0)
  })
  loading.set(id, p)
  return p
}

type FontContextType = {
  font: FontId
  setFont: (font: FontId) => void
  resetFont: () => void
  fontSize: FontSizeId
  fontScale: number
  setFontSize: (size: FontSizeId) => void
  /** 고른 글꼴 파일을 다 읽으면 1씩 늘어납니다. 캔버스(차트)를 다시 그릴 때 씁니다. */
  fontReady: number
}

const FontContext = createContext<FontContextType | null>(null)

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [font, _setFont] = useState<FontId>(() => {
    const saved = getCookie(FONT_KEY)
    return fonts.includes(saved as FontId) ? (saved as FontId) : fonts[0]
  })
  const [fontSize, _setFontSize] = useState<FontSizeId>(() => {
    const saved = getCookie(SIZE_KEY)
    return fontSizes.some((s) => s.id === saved) ? (saved as FontSizeId) : 'md'
  })
  const [fontReady, setFontReady] = useState(0)
  const fontScale = fontSizes.find((s) => s.id === fontSize)?.scale ?? 1

  useEffect(() => {
    const family = fontList.find((f) => f.id === font)?.family
    document.documentElement.style.setProperty('--app-font', fontStack(font))
    let alive = true
    loadFontCss(font)
      .then(() => (family ? document.fonts.load(`400 1em "${family}"`, '가A1') : undefined))
      .catch(() => undefined)
      .then(() => alive && setFontReady((n) => n + 1))
    return () => {
      alive = false
    }
  }, [font])

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 100}%`
  }, [fontScale])

  const setFont = (next: FontId) => {
    setCookie(FONT_KEY, next, MAX_AGE)
    _setFont(next)
  }
  const resetFont = () => {
    removeCookie(FONT_KEY)
    removeCookie(SIZE_KEY)
    _setFont(fonts[0])
    _setFontSize('md')
  }
  const setFontSize = (next: FontSizeId) => {
    setCookie(SIZE_KEY, next, MAX_AGE)
    _setFontSize(next)
  }

  return (
    <FontContext value={{ font, setFont, resetFont, fontSize, fontScale, setFontSize, fontReady }}>
      {children}
    </FontContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useFont = () => {
  const context = useContext(FontContext)
  if (!context) throw new Error('useFont must be used within a FontProvider')
  return context
}
