import { useTranslation } from 'react-i18next';

import { StubScreen } from '@/components/StubScreen';

export default function OnboardingPaywallScreen() {
  const { t } = useTranslation();

  return (
    <StubScreen title={t('onboarding.paywallTitle')} description={t('onboarding.paywallStub')} />
  );
}
