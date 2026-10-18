import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme/tokens';

export default function OnboardingLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.ground },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.ground },
      }}
    >
      <Stack.Screen name="onboarding/index" options={{ title: t('onboarding.title') }} />
      <Stack.Screen name="onboarding/goal" options={{ title: t('onboarding.goalTitle') }} />
      <Stack.Screen name="onboarding/level" options={{ title: t('onboarding.levelTitle') }} />
      <Stack.Screen name="onboarding/time" options={{ title: t('onboarding.timeTitle') }} />
      <Stack.Screen name="onboarding/wow" options={{ title: t('onboarding.wowTitle') }} />
      <Stack.Screen name="onboarding/paywall" options={{ title: t('onboarding.paywallTitle') }} />
    </Stack>
  );
}
