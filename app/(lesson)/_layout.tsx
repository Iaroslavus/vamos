import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme/tokens';

export default function LessonLayout() {
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
      <Stack.Screen name="lesson/[id]" options={{ headerShown: false, title: t('lesson.title') }} />
      <Stack.Screen name="lesson/review" options={{ title: t('lesson.reviewTitle') }} />
    </Stack>
  );
}
