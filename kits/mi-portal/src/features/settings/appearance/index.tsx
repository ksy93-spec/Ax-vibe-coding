import { ContentSection } from '../components/content-section'
import { AppearanceForm } from './appearance-form'

export function SettingsAppearance() {
  return (
    <ContentSection
      title='글자 크기와 글꼴'
      desc='글자 크기, 글꼴, 밝기를 바꿉니다. 누르는 즉시 바뀌고 이 PC 의 브라우저에 저장됩니다.'
    >
      <AppearanceForm />
    </ContentSection>
  )
}
