import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { playLessonAudio } from '@/features/audio/playback';
import { getItem, getLesson } from '@/features/content/loader';
import { colors, radius, space } from '@/theme/tokens';

export default function SpeakScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ lessonId?: string | string[] }>();
  const lessonId = firstParam(params.lessonId);
  const lines = speakLines(lessonId);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t('speak.title') }} />
      <Text variant="body" color={colors.inkMuted}>
        {t('speak.hint')}
      </Text>
      {lines.length === 0 ? (
        <Text variant="h3">{t('speak.empty')}</Text>
      ) : (
        lines.map((line) => (
          <Pressable
            key={line.id}
            accessibilityRole="button"
            accessibilityLabel={t('speak.play', { phrase: line.es })}
            onPress={() => {
              void playLessonAudio({ audio: line.audio, text: line.es });
            }}
            style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
          >
            <View style={styles.copy}>
              <Text variant="bodyBold">{line.es}</Text>
              <Text variant="caption" color={colors.inkMuted}>
                {line.ru}
              </Text>
            </View>
          </Pressable>
        ))
      )}
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.close}>
        <Text variant="bodyBold" color={colors.coral}>
          {t('common.close')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function speakLines(
  lessonId: string | null,
): { id: string; es: string; ru: string; audio: string | null }[] {
  if (!lessonId) return [];
  try {
    const lesson = getLesson(lessonId);
    return lesson.speak.flatMap((id) => {
      try {
        const item = getItem(id);
        return [{ id: item.id, es: item.es, ru: item.ru, audio: item.audio.es }];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value !== '') return value;
  const first = Array.isArray(value) ? value[0] : undefined;
  return typeof first === 'string' && first !== '' ? first : null;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.xxxl,
    gap: space.md,
    backgroundColor: colors.ground,
    flexGrow: 1,
  },
  row: {
    minHeight: 64,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  copy: {
    gap: space.xs,
  },
  close: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
