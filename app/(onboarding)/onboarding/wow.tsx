import { useTranslation } from 'react-i18next';

import { StubScreen } from '@/components/StubScreen';

export default function OnboardingWowScreen() {
  const { t } = useTranslation();

  return <StubScreen title={t('onboarding.wowTitle')} description={t('onboarding.wowStub')} />;
}
