import { ContentSection } from '../components/content-section'
import { AppearanceForm } from './appearance-form'

export function SettingsAppearance() {
  return (
    <ContentSection
      title='글꼴과 테마'
      desc='포탈의 글꼴과 밝기를 바꿉니다. 설정은 이 PC 의 브라우저에 저장됩니다.'
    >
      <AppearanceForm />
    </ContentSection>
  )
}
