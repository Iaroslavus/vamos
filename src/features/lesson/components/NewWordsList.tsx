import * as Haptics from 'expo-haptics';
import { Check, Volume2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { playLessonAudio } from '@/features/audio/playback';
import { colors, radius, space } from '@/theme/tokens';

import type { VocabularyItem } from '../schema';

type NewWordsListProps = {
  items: readonly VocabularyItem[];
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onLongPressItem: (id: string) => void;
};

export function NewWordsList({
  items,
  selectedIds,
  onToggle,
  onToggleAll,
  onLongPressItem,
}: NewWordsListProps) {
  const { t } = useTranslation();
  const allSelected = items.every((item) => selectedIds.has(item.id));

  if (items.length === 0) {
    return null;
  }

  const holdItem = (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLongPressItem(id);
  };

  return (
    <View style={styles.root}>
      <Text variant="h3">{t('lesson.summaryNewPhrases', { count: items.length })}</Text>
      <Pressable accessibilityRole="button" onPress={onToggleAll} style={styles.selectAll}>
        <Text variant="bodyBold" color={colors.ink}>
          {allSelected ? t('lesson.summaryClearAll') : t('lesson.summarySelectAll')}
        </Text>
      </Pressable>
      <View style={styles.list}>
        {items.map((item) => {
          const checked = selectedIds.has(item.id);
          const label = `${item.es}, ${item.ru}`;
          return (
            <View key={item.id} style={styles.row}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={label}
                onPress={() => onToggle(item.id)}
                onLongPress={() => holdItem(item.id)}
                style={styles.checkHit}
              >
                <View style={[styles.circle, checked ? styles.circleOn : null]}>
                  {checked ? <Check size={14} color={colors.inkOnDark} strokeWidth={2.6} /> : null}
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityHint={t('vocab.longPressAdd')}
                onPress={() => {
                  void playLessonAudio({ audio: item.audio, text: item.es });
                }}
                onLongPress={() => holdItem(item.id)}
                style={styles.main}
              >
                <View style={styles.texts}>
                  <Text variant="bodyBold">{item.es}</Text>
                  <Text variant="caption" color={colors.inkMuted}>
                    {item.ru}
                  </Text>
                </View>
                <Volume2 size={22} color={colors.blue} strokeWidth={2.2} />
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.sm,
    width: '100%',
  },
  selectAll: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  list: {
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 56,
    paddingRight: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.inkMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  circleOn: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  main: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});
