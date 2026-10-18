import { useTranslation } from 'react-i18next';

import { StubScreen } from '@/components/StubScreen';

export default function OnboardingTimeScreen() {
  const { t } = useTranslation();

  return <StubScreen title={t('onboarding.timeTitle')} description={t('onboarding.timeStub')} />;
}
