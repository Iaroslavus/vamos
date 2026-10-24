import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { RetryNote } from '@/components/RetryNote';
import { Text } from '@/components/Text';
import { Appear } from '@/features/auth/components/Appear';
import { listTopics } from '@/features/content/loader';
import { LearnSkeleton } from '@/features/home/LearnSkeleton';
import { useLearnerProfile } from '@/features/learner/useLearnerProfile';
import { EMPTY_SNAPSHOT, deviceTimeZone, studySnapshot } from '@/features/progress/study';
import { useProgress } from '@/features/progress/useProgress';
import { useReviewDueCount } from '@/features/review/hooks/useReviewDueCount';
import { CourseCard } from '@/features/today/components/CourseCard';
import { StartedTopics } from '@/features/today/components/StartedTopics';
import { TodayActions } from '@/features/today/components/TodayActions';
import { TodayHeader } from '@/features/today/components/TodayHeader';
import { buildTodayPlan, greetingPart } from '@/features/today/course';
import { colors, motion, space } from '@/theme/tokens';

export function TodayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const progress = useProgress();
  const profile = useLearnerProfile();
  const dueReviews = useReviewDueCount();
  const topics = useMemo(() => listTopics(), []);

  if (progress.isLoading) return <LearnSkeleton label={t('today.loading')} />;

  if (progress.isError && !progress.data) {
    return (
      <RetryNote
        title={t('today.loadError')}
        action={t('common.retry')}
        onPress={() => {
          void progress.refetch();
        }}
      />
    );
  }

  const snapshot = progress.data ?? EMPTY_SNAPSHOT;
  const minutes = profile.data?.dailyMinutes ?? 10;
  const stats = studySnapshot(snapshot, {
    now: new Date().toISOString(),
    timeZone: deviceTimeZone(),
    dailyGoalMinutes: minutes,
  });
  const plan = buildTodayPlan(
    topics,
    snapshot.lessons.map((lesson) => ({
      lessonId: lesson.lessonId,
      status: lesson.status,
      completedAt: lesson.completedAt,
    })),
  );
  const part = greetingPart(new Date().toISOString(), deviceTimeZone());
  const hello = t(`today.greeting.${part}`);
  const greeting = profile.data?.name
    ? t('today.greetingNamed', { greeting: hello, name: profile.data.name })
    : hello;
  const continueLessonId = plan.finished ? plan.nextTopicLessonId : plan.continueLessonId;
  const continueTopicId = plan.finished ? plan.nextTopicId : null;

  const openContinue = () => {
    if (continueLessonId) {
      router.push({ pathname: '/lesson/[id]', params: { id: continueLessonId } });
      return;
    }
    if (continueTopicId) {
      router.push({ pathname: '/topics/[id]', params: { id: continueTopicId } });
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Appear>
        <TodayHeader greeting={greeting} streak={stats.streak} xp={stats.totalXp} />
      </Appear>
      <Appear delay={motion.stagger}>
        <CourseCard
          days={plan.days}
          currentDay={plan.currentDay}
          finished={plan.finished}
          topicTitle={plan.nextTopicTitle}
          canContinue={continueLessonId != null || continueTopicId != null}
          onContinue={openContinue}
        />
      </Appear>
      <Appear delay={motion.stagger * 2}>
        <TodayActions
          reviewCount={dueReviews}
          onReview={() => router.push('/review')}
          onSpeak={() =>
            router.push({
              pathname: '/speak',
              params: { lessonId: plan.speakLessonId ?? '' },
            })
          }
        />
      </Appear>
      <Appear delay={motion.stagger * 3}>
        <StartedTopics
          topics={plan.started}
          onOpen={(id) => router.push({ pathname: '/topics/[id]', params: { id } })}
        />
      </Appear>
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
