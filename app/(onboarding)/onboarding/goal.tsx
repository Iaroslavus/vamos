import { useTranslation } from 'react-i18next';

import { StubScreen } from '@/components/StubScreen';

export default function OnboardingGoalScreen() {
  const { t } = useTranslation();

  return <StubScreen title={t('onboarding.goalTitle')} description={t('onboarding.goalStub')} />;
}
