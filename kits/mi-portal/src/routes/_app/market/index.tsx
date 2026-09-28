import { createFileRoute } from '@tanstack/react-router'
import { PlannedPage } from '@/components/mi/planned-page'

export const Route = createFileRoute('/_app/market/')({
  component: () => (
    <PlannedPage
      title='시장 지표'
      description='지역별 자동차 시장 규모, 환율과 원자재 가격 같은 외부 지표를 한곳에서 봅니다.'
      contents={[
        '지역별 연간 판매 규모와 증감 (막대)',
        '환율, 원자재 가격 추이 (선, 기간 선택)',
        '지표별 최신값 카드와 전월 대비',
        '출처와 갱신일 표기',
      ]}
      columns={['월', '지역', '지표', '값', '단위', '출처']}
      reference='차종별 판매·생산'
    />
  ),
})
