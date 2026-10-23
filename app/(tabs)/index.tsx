import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { RetryNote } from '@/components/RetryNote';
import { Text } from '@/components/Text';
import { HomeStats } from '@/features/home/HomeStats';
import { LearnSkeleton } from '@/features/home/LearnSkeleton';
import { ReviewPrompt } from '@/features/home/ReviewPrompt';
import { LessonPath } from '@/features/path/components/LessonPath';
import { getCurriculumLessons, pathUnit, type PathNode } from '@/features/path/curriculum';
import { EMPTY_SNAPSHOT, studySnapshotNow } from '@/features/progress/study';
import { useProgress } from '@/features/progress/useProgress';
import { useReviewDueCount } from '@/features/review/hooks/useReviewDueCount';
import { colors, space } from '@/theme/tokens';

export default function LearnScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useProgress();
  const dueReviews = useReviewDueCount();
  const lessons = useMemo(() => getCurriculumLessons(), []);

  if (isLoading) return <LearnSkeleton label={t('learn.loading')} />;

  if (isError && !data) {
    return (
      <RetryNote
        title={t('learn.loadError')}
        action={t('common.retry')}
        onPress={() => {
          void refetch();
        }}
      />
    );
  }

  const stats = studySnapshotNow(data ?? EMPTY_SNAPSHOT);
  const unit = pathUnit(lessons, stats.completedIds);

  const openLesson = (node: PathNode) => {
    if (node.status === 'locked') return;
    router.push({ pathname: '/lesson/[id]', params: { id: node.lesson.id } });
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <HomeStats stats={stats} />
      <ReviewPrompt count={dueReviews} onPress={() => router.push('/review')} />
      {unit ? (
        <Text variant="h3" accessibilityRole="header" style={styles.unit}>
          {t('learn.unitTitle', { level: unit.level, unit: unit.unit })}
        </Text>
      ) : (
        <Text variant="body" color={colors.inkMuted}>
          {t('learn.emptyPath')}
        </Text>
      )}
      <LessonPath lessons={lessons} completedIds={stats.completedIds} onPressNode={openLesson} />
      <Button
        title={t('common.openOnboarding')}
        variant="secondary"
        onPress={() => router.push('/onboarding')}
      />
      {__DEV__ ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/dev/components')}
          style={styles.devLink}
        >
          <Text variant="bodyBold" color={colors.coral} style={styles.devLinkText}>
            {t('common.devComponents')}
          </Text>
        </Pressable>
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
  unit: {
    marginTop: space.sm,
  },
  devLink: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  devLinkText: {
    textAlign: 'center',
  },
});
