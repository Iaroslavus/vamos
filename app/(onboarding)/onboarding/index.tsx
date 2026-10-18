import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { StubScreen } from '@/components/StubScreen';

export default function OnboardingWelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <StubScreen title={t('onboarding.title')} description={t('onboarding.stub')}>
      <Button title={t('onboarding.goalTitle')} onPress={() => router.push('/onboarding/goal')} />
    </StubScreen>
  );
}
