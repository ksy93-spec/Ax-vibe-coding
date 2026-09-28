import { CircleCheck, CirclePause, Timer } from 'lucide-react'
import { ORDERS } from '@/data/mi-sample'
import { type Order, type OrderStatus } from './schema'

export const statuses: { label: string; value: OrderStatus; icon: typeof CircleCheck }[] = [
  { label: '확정', value: '확정', icon: CircleCheck },
  { label: '협의', value: '협의', icon: Timer },
  { label: '보류', value: '보류', icon: CirclePause },
]

export const oems = ['OEM A', 'OEM B', 'OEM C', 'OEM D'].map((v) => ({ label: v, value: v }))
export const parts = ['브레이크 모듈', '조향 센서', '배터리 케이스', '시트 프레임', '도어 모듈']

/** 예시 수주. 사내 데이터로 바꿀 때는 화면의 "엑셀 가져오기" 를 쓰세요. */
export const sampleOrders = ORDERS as Order[]
