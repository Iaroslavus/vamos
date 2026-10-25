import { useRouter, useSegments } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { listTopics } from '@/features/content/loader';
import { useLearnerProfile } from '@/features/learner/useLearnerProfile';
import { useApplyProfileLanguage } from '@/features/settings/useUiLanguage';
import { useProgress } from '@/features/progress/useProgress';
import { buildTodayPlan, learnerDestination } from '@/features/today/course';
import { colors } from '@/theme/tokens';

const DAY_ONE = buildTodayPlan(listTopics(), []).dayOneLessonId;

/**
 * New learners see their name, then day 1. Goal and minutes wait until that
 * first lesson is finished. Everyone else stays on Today.
 * The navigator stays mounted under the cover so the redirect can run.
 */
export function LearnerGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const profile = useLearnerProfile();
  const progress = useProgress();
  useApplyProfileLanguage();
  const parts = segments as readonly string[];

  const completed =
    progress.data?.lessons
      .filter((lesson) => lesson.status === 'completed')
      .map((lesson) => lesson.lessonId) ?? [];

  const waitingForProgress =
    profile.data?.name != null &&
    !profile.data.preferencesAsked &&
    progress.isLoading &&
    !progress.data;

  let destination: 'pending' | 'name' | 'preferences' | 'app' = 'app';
  if ((profile.isLoading && !profile.data) || waitingForProgress) {
    destination = 'pending';
  } else if (profile.isError && !profile.data) {
    destination = 'app';
  } else if (profile.data) {
    destination = learnerDestination({
      name: profile.data.name,
      preferencesAsked: profile.data.preferencesAsked,
      dayOneFirstLessonId: DAY_ONE,
      completedLessonIds: completed,
    });
  }

  const onName = parts.includes('name');
  const onPreferences = parts.includes('preferences');
  const inLesson = parts.includes('(lesson)') || parts.includes('lesson');

  useEffect(() => {
    if (destination === 'name' && !onName) {
      router.replace('/onboarding/name');
    } else if (destination === 'preferences' && !onPreferences && !inLesson) {
      router.replace('/onboarding/preferences');
    }
  }, [destination, inLesson, onName, onPreferences, router]);

  const cover =
    !inLesson &&
    (destination === 'pending' ||
      (destination === 'name' && !onName) ||
      (destination === 'preferences' && !onPreferences));

  return (
    <View style={styles.root}>
      {children}
      {cover ? <View style={styles.cover} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  cover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.ground,
  },
});
