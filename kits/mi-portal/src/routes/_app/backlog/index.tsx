import { createFileRoute } from '@tanstack/react-router'
import { PlannedPage } from '@/components/mi/planned-page'

export const Route = createFileRoute('/_app/backlog/')({
  component: () => (
    <PlannedPage
      title='수주 잔고'
      description='확정됐지만 아직 납품하지 않은 수주를 납기 월, OEM, 품목별로 봅니다.'
      contents={[
        '잔고 금액, 건수, 이번 달 납기, 납기 지난 건 카드',
        '납기 월별 잔고 (막대, OEM 별로 쌓기)',
        '납기가 가까운 순서의 잔고 표',
        '수주 관리 화면의 목록(useOrdersStore)을 그대로 씁니다',
      ]}
      columns={['수주번호', 'OEM', '품목', '잔량', '단가', '납기', '납품 누계']}
      reference='수주 관리'
    />
  ),
})
