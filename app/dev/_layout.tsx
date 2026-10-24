import { Redirect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme/tokens';

export default function DevLayout() {
  const { t } = useTranslation();

  if (!__DEV__) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.ground },
        headerStyle: { backgroundColor: colors.ground },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="components" options={{ title: t('common.devComponents') }} />
      <Stack.Screen name="intro" options={{ title: t('lesson.introTitle') }} />
    </Stack>
  );
}
