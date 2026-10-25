import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors, fonts } from '@/theme/tokens';

export default function VocabLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.ground },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.display, color: colors.ink },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.ground },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('vocab.title'), headerBackVisible: false }} />
      <Stack.Screen name="[id]" options={{ title: t('vocab.title') }} />
    </Stack>
  );
}
