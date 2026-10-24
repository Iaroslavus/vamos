import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { Text } from '@/components/Text';
import { resolveTopicIcon } from '@/features/content/topicIcons';
import type { TopicDetail } from '@/features/topics/catalog';
import { CanDoList } from '@/features/topics/components/CanDoList';
import { TopicGlyph } from '@/features/topics/components/TopicGlyph';
import { TopicOutline } from '@/features/topics/components/TopicOutline';
import { colors, radius, space } from '@/theme/tokens';

type TopicDetailViewProps = {
  detail: TopicDetail;
  onOpenLesson: (lessonId: string) => void;
};

export function TopicDetailView({ detail, onOpenLesson }: TopicDetailViewProps) {
  const { t } = useTranslation();
  const lessons = t('topics.lessonCount', { count: detail.lessonCount });
  const phrases = t('topics.phraseCount', { count: detail.phraseCount });
  const done = detail.progress >= 1;

  return (
    <View style={styles.block}>
      <View style={styles.summary}>
        <View style={[styles.icon, done ? styles.iconDone : null]}>
          <TopicGlyph
            icon={resolveTopicIcon(detail.icon)}
            color={done ? colors.teal : colors.coral}
          />
        </View>
        <View style={styles.summaryBody}>
          <Text variant="caption" color={colors.inkMuted}>
            {t('topics.cardMeta', { lessons, phrases })}
          </Text>
          <ProgressBar
            progress={detail.progress}
            color={done ? colors.teal : colors.coral}
            accessibilityLabel={t('topics.progressLabel', {
              done: detail.completedLessons,
              total: detail.lessonCount,
            })}
          />
        </View>
      </View>
      <CanDoList items={detail.canDos} />
      <TopicOutline detail={detail} onOpenLesson={onOpenLesson} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.xl,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
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
  summaryBody: {
    flex: 1,
    gap: space.sm,
  },
});
