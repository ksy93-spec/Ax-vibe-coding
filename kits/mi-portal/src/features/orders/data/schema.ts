import { z } from 'zod'

export const ORDER_STATUSES = ['확정', '협의', '보류'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

const ymd = /^\d{4}-\d{2}-\d{2}$/

/** 수주 한 건. 화면과 저장소가 쓰는 형태입니다. */
export const orderSchema = z.object({
  id: z.string().min(1, '수주번호가 비었습니다'),
  date: z.string().regex(ymd, '수주일은 YYYY-MM-DD 형식입니다'),
  oem: z.string().min(1, 'OEM 을 고르세요'),
  part: z.string().min(1, '품목을 넣으세요'),
  qty: z.number({ error: '숫자를 넣으세요' }).int('수량은 정수입니다').positive('수량은 1 이상입니다'),
  unitPrice: z.number({ error: '숫자를 넣으세요' }).nonnegative('단가는 0 이상입니다'),
  status: z.enum(ORDER_STATUSES, { error: '상태를 고르세요' }),
  due: z.string().regex(ymd, '납기는 YYYY-MM-DD 형식입니다'),
})
export type Order = z.infer<typeof orderSchema>

/**
 * 엑셀에서 가져올 때 한 줄씩 검사합니다. 머리글은 한글 열 이름 그대로입니다.
 * 엑셀의 숫자는 문자로 올 수 있어 coerce 로 숫자로 바꿉니다. 날짜 칸은 Date 로 오기도 합니다.
 */
export const orderImportSchema = z.object({
  수주번호: z.coerce.string().min(1, '수주번호가 비었습니다'),
  수주일: z.coerce.string().regex(ymd, '수주일은 YYYY-MM-DD'),
  OEM: z.coerce.string().min(1, 'OEM 이 비었습니다'),
  품목: z.coerce.string().min(1, '품목이 비었습니다'),
  수량: z.coerce.number().int('수량은 정수').positive('수량은 1 이상'),
  단가: z.coerce.number().nonnegative('단가는 0 이상'),
  상태: z.enum(ORDER_STATUSES, { error: '상태는 확정, 협의, 보류 중 하나' }),
  납기: z.coerce.string().regex(ymd, '납기는 YYYY-MM-DD'),
})

/** 엑셀 머리글 순서. 내보내기와 가져오기가 같은 열을 씁니다. */
export const ORDER_EXCEL_COLUMNS = [
  { header: '수주번호', key: '수주번호' },
  { header: '수주일', key: '수주일' },
  { header: 'OEM', key: 'OEM' },
  { header: '품목', key: '품목' },
  { header: '수량', key: '수량', numFmt: '#,##0' },
  { header: '단가', key: '단가', numFmt: '#,##0' },
  { header: '금액', key: '금액', numFmt: '#,##0' },
  { header: '상태', key: '상태' },
  { header: '납기', key: '납기' },
]

export function toExcelRow(o: Order) {
  return {
    수주번호: o.id, 수주일: o.date, OEM: o.oem, 품목: o.part, 수량: o.qty,
    단가: o.unitPrice, 금액: o.qty * o.unitPrice, 상태: o.status, 납기: o.due,
  }
}

export function fromImportRow(r: z.infer<typeof orderImportSchema>): Order {
  return { id: r.수주번호, date: r.수주일, oem: r.OEM, part: r.품목, qty: r.수량, unitPrice: r.단가, status: r.상태, due: r.납기 }
}
