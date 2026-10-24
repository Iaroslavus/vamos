import { Volume2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { playLessonAudio } from '@/features/audio/playback';
import { colors, radius, space } from '@/theme/tokens';

import type { VocabularyItem } from '../schema';

type NewWordsListProps = {
  items: readonly VocabularyItem[];
};

export function NewWordsList({ items }: NewWordsListProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.root}>
      <Text variant="h3">{t('lesson.summaryNewPhrases', { count: items.length })}</Text>
      <View style={styles.list}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              void playLessonAudio({ audio: item.audio, text: item.es });
            }}
            accessibilityRole="button"
            accessibilityLabel={`${item.es}, ${item.ru}`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.texts}>
              <Text variant="bodyBold">{item.es}</Text>
              <Text variant="caption" color={colors.inkMuted}>
                {item.ru}
              </Text>
            </View>
            <Volume2 size={22} color={colors.blue} strokeWidth={2.2} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.md,
    width: '100%',
  },
  list: {
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.saffronSoft,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});
