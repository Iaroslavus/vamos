import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { playUiSound } from '@/features/audio/sounds';
import { listTopics } from '@/features/content/loader';
import { useLearnerProfile } from '@/features/learner/useLearnerProfile';
import { NewWordsList } from '@/features/lesson/components/NewWordsList';
import { XpCounter } from '@/features/lesson/components/XpCounter';
import { formatAccuracyPercent, formatElapsed } from '@/features/lesson/format';
import type { VocabularyItem } from '@/features/lesson/schema';
import { useLessonStore } from '@/features/lesson/store';
import { useProgress } from '@/features/progress/useProgress';
import { buildTodayPlan, learnerDestination } from '@/features/today/course';
import { useFavoritesStore } from '@/features/vocab/favoritesStore';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, space } from '@/theme/tokens';

const DAY_ONE = buildTodayPlan(listTopics(), []).dayOneLessonId;

const EMPTY_NEW_ITEMS: VocabularyItem[] = [];

export default function LessonSummaryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const status = useLessonStore((s) => s.summary?.status ?? 'idle');
  const xpEarned = useLessonStore((s) => s.summary?.xpEarned ?? 0);
  const accuracy = useLessonStore((s) => s.summary?.accuracy ?? 0);
  const elapsedMs = useLessonStore((s) => s.summary?.elapsedMs ?? 0);
  const newItems = useLessonStore((s) => s.summary?.newItems ?? EMPTY_NEW_ITEMS);
  const savedIds = useFavoritesStore((s) => s.itemIds);
  const addAll = useFavoritesStore((s) => s.addAll);
  const reset = useLessonStore((s) => s.reset);
  const profile = useLearnerProfile();
  const progress = useProgress();
  const [leaving, setLeaving] = useState(false);
  const allSaved = newItems.length > 0 && newItems.every((item) => savedIds.includes(item.id));

  const finished = status === 'completed' || status === 'failed';

  useEffect(() => {
    if (finished) {
      void playUiSound('complete');
    }
  }, [finished]);

  const goHome = () => {
    if (leaving) return;
    setLeaving(true);
    const lessonId = useLessonStore.getState().lessonId;
    const completed =
      progress.data?.lessons
        .filter((lesson) => lesson.status === 'completed')
        .map((lesson) => lesson.lessonId) ?? [];
    const destination = profile.data
      ? learnerDestination({
          name: profile.data.name,
          preferencesAsked: profile.data.preferencesAsked,
          dayOneFirstLessonId: DAY_ONE,
          completedLessonIds: completed,
          justFinishedLessonId: lessonId,
        })
      : 'app';
    reset();
    if (destination === 'preferences') {
      router.replace('/onboarding/preferences');
      return;
    }
    if (destination === 'name') {
      router.replace('/onboarding/name');
      return;
    }
    router.replace('/(tabs)');
  };

  if (!finished) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top + space.xl }]}>
        <Text variant="h3">{t('lesson.summaryEmpty')}</Text>
        <Button
          title={t('lesson.summaryContinue')}
          variant="primary"
          disabled={leaving}
          onPress={goHome}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.md }]}>
      {!reduceMotion ? (
        <View pointerEvents="none" style={styles.confetti}>
          <LottieView
            source={require('../../../assets/lottie/confetti.json')}
            autoPlay
            loop={false}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, space.lg) + space.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="h1" style={styles.title}>
          {status === 'failed' ? t('lesson.summaryFailedTitle') : t('lesson.summaryTitle')}
        </Text>

        <XpCounter xp={xpEarned} label={t('lesson.summaryXp')} />

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text variant="caption" color={colors.inkMuted}>
              {t('lesson.summaryAccuracy')}
            </Text>
            <Text variant="h2" color={colors.teal}>
              {formatAccuracyPercent(accuracy)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text variant="caption" color={colors.inkMuted}>
              {t('lesson.summaryTime')}
            </Text>
            <Text variant="h2">{formatElapsed(elapsedMs)}</Text>
          </View>
        </View>

        <NewWordsList items={newItems} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        {newItems.length > 0 ? (
          <Button
            title={allSaved ? t('lesson.introSaved') : t('lesson.summaryToVocab')}
            variant="secondary"
            disabled={allSaved || leaving}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              addAll(newItems.map((item) => item.id));
            }}
          />
        ) : null}
        <Button
          title={t('lesson.summaryContinue')}
          variant="primary"
          disabled={leaving}
          onPress={goHome}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
  },
  confetti: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
    gap: space.xxl,
    paddingHorizontal: space.xl,
    paddingTop: space.xxl,
  },
  title: {
    textAlign: 'center',
    zIndex: 2,
  },
  stats: {
    flexDirection: 'row',
    gap: space.xxl,
    zIndex: 2,
  },
  stat: {
    alignItems: 'center',
    gap: space.xs,
    minWidth: 100,
  },
  footer: {
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    zIndex: 2,
  },
});
