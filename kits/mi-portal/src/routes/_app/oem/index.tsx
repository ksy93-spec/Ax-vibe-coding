import { createFileRoute } from '@tanstack/react-router'
import { PlannedPage } from '@/components/mi/planned-page'

export const Route = createFileRoute('/_app/oem/')({
  component: () => (
    <PlannedPage
      title='OEM별 전략'
      description='OEM마다 판매 추이, 전동화 계획, 우리 회사와의 거래 현황을 한 장으로 정리합니다.'
      contents={[
        'OEM 고르기 (위쪽 탭 또는 선택 상자)',
        '판매 추이와 점유율',
        '발표된 전동화, 공장 계획 목록',
        '해당 OEM 수주 합계 (수주 관리 데이터 재사용)',
      ]}
      columns={['OEM', '구분', '내용', '시점', '출처']}
      reference='경쟁사 Fab 현황'
    />
  ),
})
