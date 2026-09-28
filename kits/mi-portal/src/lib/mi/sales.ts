/**
 * 예시 판매 데이터를 화면에서 쓰기 좋게 묶는 함수들.
 * 사내 데이터로 바꿀 때는 src/data/mi-sample.js 대신 엑셀을 읽어 같은 모양
 * ({ model, values[] }, MONTHS[]) 으로 만들면 아래 함수와 화면은 그대로 씁니다.
 */
import { MONTHS, PRODUCTION, SALES_BY_MODEL } from '@/data/mi-sample'
import { growth } from '@/lib/mi/format'

export { MONTHS, PRODUCTION, SALES_BY_MODEL }

export const TOTAL_SALES: number[] = MONTHS.map((_: string, t: number) =>
  SALES_BY_MODEL.reduce((s: number, m: { values: number[] }) => s + m.values[t], 0)
)

export const LAST = MONTHS.length - 1

/** '2026-08' → '26.8' 처럼 축에 쓰는 짧은 월 표기 */
export const shortMonth = (ym: string) => `${ym.slice(2, 4)}.${Number(ym.slice(5))}`

/** t 번째 달의 전년 동월 대비 증감률(%) */
export const yoy = (values: number[], t = values.length - 1) =>
  t >= 12 ? growth(values[t], values[t - 12]) : null

/** 증감률을 KpiCard 의 delta, direction 으로 바꿉니다. */
export function deltaOf(g: number | null, label = '전년 동월 대비') {
  if (g === null) return { delta: undefined, direction: undefined }
  const s = `${g > 0 ? '+' : ''}${g.toFixed(1)}% ${label}`
  return { delta: s, direction: g > 0.05 ? 'up' : g < -0.05 ? 'down' : 'flat' } as const
}
