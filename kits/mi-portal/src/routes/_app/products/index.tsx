import { createFileRoute } from '@tanstack/react-router'
import { PlannedPage } from '@/components/mi/planned-page'

export const Route = createFileRoute('/_app/products/')({
  component: () => (
    <PlannedPage
      title='제품 비교'
      description='우리 제품과 경쟁사 제품의 사양, 가격, 적용 차종을 나란히 봅니다.'
      contents={[
        '제품군 고르기 (위쪽 탭)',
        '사양 비교 표. 우리 제품과 경쟁 제품을 열로 나란히',
        '가격 추이 (선, 기간 선택)',
        '제품별 적용 차종과 OEM 목록',
      ]}
      columns={['제품군', '회사', '제품명', '사양 항목', '값', '단위', '출처', '기준일']}
      reference='경쟁사 Fab 현황'
    />
  ),
})
