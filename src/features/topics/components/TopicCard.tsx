import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { Text } from '@/components/Text';
import { resolveTopicIcon } from '@/features/content/topicIcons';
import type { TopicSummary } from '@/features/topics/catalog';
import { TopicGlyph } from '@/features/topics/components/TopicGlyph';
import { colors, radius, space } from '@/theme/tokens';

type TopicCardProps = {
  topic: TopicSummary;
  onPress: () => void;
};

export function TopicCard({ topic, onPress }: TopicCardProps) {
  const { t } = useTranslation();
  const lessons = t('topics.lessonCount', { count: topic.lessonCount });
  const phrases = t('topics.phraseCount', { count: topic.phraseCount });
  const meta = t('topics.cardMeta', { lessons, phrases });
  const done = topic.progress >= 1;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('topics.cardLabel', {
        title: topic.title,
        lessons,
        phrases,
        done: topic.completedLessons,
        total: topic.lessonCount,
      })}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={[styles.icon, done ? styles.iconDone : null]}>
        <TopicGlyph icon={resolveTopicIcon(topic.icon)} color={done ? colors.teal : colors.coral} />
      </View>
      <View style={styles.body}>
        <Text variant="bodyBold">{topic.title}</Text>
        <Text variant="caption" color={colors.inkMuted}>
          {meta}
        </Text>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <ProgressBar progress={topic.progress} color={done ? colors.teal : colors.coral} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 44,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.saffronSoft,
  },
  iconDone: {
    backgroundColor: colors.tealSoft,
  },
  body: {
    flex: 1,
    gap: space.xs,
  },
});
