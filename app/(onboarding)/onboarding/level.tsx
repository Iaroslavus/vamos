import { useTranslation } from 'react-i18next';

import { StubScreen } from '@/components/StubScreen';

export default function OnboardingLevelScreen() {
  const { t } = useTranslation();

  return <StubScreen title={t('onboarding.levelTitle')} description={t('onboarding.levelStub')} />;
}
