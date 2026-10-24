import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { Text } from '@/components/Text';
import { resolveTopicIcon } from '@/features/content/topicIcons';
import { TopicGlyph } from '@/features/topics/components/TopicGlyph';
import type { StartedTopicCard } from '@/features/today/course';
import { colors, radius, space } from '@/theme/tokens';

type StartedTopicsProps = {
  topics: readonly StartedTopicCard[];
  onOpen: (topicId: string) => void;
};

export function StartedTopics({ topics, onOpen }: StartedTopicsProps) {
  const { t } = useTranslation();
  if (topics.length === 0) return null;

  return (
    <View style={styles.block}>
      <Text variant="h3" accessibilityRole="header">
        {t('today.myTopics')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {topics.map((topic) => {
          const done = topic.progress >= 1;
          return (
            <Pressable
              key={topic.id}
              accessibilityRole="button"
              accessibilityLabel={t('today.topicLabel', {
                title: topic.title,
                done: topic.completedLessons,
                total: topic.lessonCount,
              })}
              onPress={() => onOpen(topic.id)}
              style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
            >
              <TopicGlyph
                icon={resolveTopicIcon(topic.icon)}
                color={done ? colors.teal : colors.coral}
              />
              <Text variant="bodyBold">{topic.title}</Text>
              <Text variant="caption" color={colors.inkMuted}>
                {t('today.topicCount', { done: topic.completedLessons, total: topic.lessonCount })}
              </Text>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <ProgressBar progress={topic.progress} color={done ? colors.teal : colors.coral} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.md,
  },
  row: {
    gap: space.md,
    paddingRight: space.xl,
  },
  card: {
    width: 168,
    minHeight: 44,
    gap: space.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  pressed: {
    opacity: 0.85,
  },
});
