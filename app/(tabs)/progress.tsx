import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { RetryNote } from '@/components/RetryNote';
import { Text } from '@/components/Text';
import { levelProgress } from '@/features/path/curriculum';
import { LevelList } from '@/features/progress/components/LevelList';
import { MetricCard } from '@/features/progress/components/MetricCard';
import { ProgressSkeleton } from '@/features/progress/components/ProgressSkeleton';
import { SkillList } from '@/features/progress/components/SkillList';
import { REVIEWS_DUE, skillBars } from '@/features/progress/overview';
import { EMPTY_SNAPSHOT, formatStudyMinutes, studySnapshotNow } from '@/features/progress/study';
import { useProgress } from '@/features/progress/useProgress';
import { colors, space } from '@/theme/tokens';

export default function ProgressScreen() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useProgress();

  if (isLoading) return <ProgressSkeleton label={t('progress.loading')} />;

  if (isError && !data) {
    return (
      <RetryNote
        title={t('progress.loadError')}
        action={t('common.retry')}
        onPress={() => {
          void refetch();
        }}
      />
    );
  }

  const stats = studySnapshotNow(data ?? EMPTY_SNAPSHOT);
  const parts = formatStudyMinutes(stats.languageMinutes);
  const time =
    parts.hours > 0
      ? t('progress.timeHours', { hours: parts.hours, minutes: parts.minutes })
      : t('progress.timeMinutes', { count: parts.minutes });

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.metrics}>
        <MetricCard
          label={t('progress.timeTitle')}
          value={time}
          accessibilityLabel={t('progress.timeLabel', { time })}
        />
        <MetricCard
          label={t('progress.reviewsTitle')}
          value={String(REVIEWS_DUE)}
          accessibilityLabel={t('progress.reviewsLabel', { count: REVIEWS_DUE })}
        />
      </View>
      <LevelList levels={levelProgress(stats.completedIds)} />
      <SkillList skills={skillBars()} />
      {data && data.pending > 0 ? (
        <Text variant="body" color={colors.inkMuted} style={styles.pending}>
          {t('progress.pending', { count: data.pending })}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  content: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.xxxl,
    gap: space.lg,
  },
  metrics: {
    flexDirection: 'row',
    gap: space.md,
  },
  pending: {
    textAlign: 'center',
  },
});
