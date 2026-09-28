import { createFileRoute } from '@tanstack/react-router'
import { PlannedPage } from '@/components/mi/planned-page'

export const Route = createFileRoute('/_app/revenue/')({
  component: () => (
    <PlannedPage
      title='매출 관리'
      description='월별 매출 실적과 계획 대비 달성률을 봅니다. 원본은 공유 폴더의 엑셀입니다.'
      contents={[
        '월별 매출 실적과 계획 (막대 + 선)',
        '고객사, 품목별 매출 표 (정렬, 필터, 엑셀 내보내기)',
        '누계 달성률 카드',
        '엑셀 가져오기로 월마다 갱신',
      ]}
      columns={['월', '고객사', '품목', '매출액', '계획']}
      reference='수주 관리'
    />
  ),
})
