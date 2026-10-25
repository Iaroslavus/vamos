import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { AddToVocabSheet } from '@/features/vocab/components/AddToVocabSheet';
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
  const phraseKey = newItems.map((item) => item.id).join('|');
  const [selection, setSelection] = useState<{ key: string; ids: ReadonlySet<string> } | null>(
    null,
  );
  const selectedIds =
    selection?.key === phraseKey ? selection.ids : new Set(newItems.map((item) => item.id));
  const [sheetIds, setSheetIds] = useState<readonly string[] | null>(null);
  const reset = useLessonStore((s) => s.reset);
  const profile = useLearnerProfile();
  const progress = useProgress();
  const [leaving, setLeaving] = useState(false);
  const topInset = Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0);
  const selectedCount = selectedIds.size;

  const togglePhrase = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelection({ key: phraseKey, ids: next });
  };

  const toggleAll = () => {
    const all = newItems.every((item) => selectedIds.has(item.id));
    setSelection({
      key: phraseKey,
      ids: all ? new Set() : new Set(newItems.map((item) => item.id)),
    });
  };

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
      <View style={[styles.root, styles.centered, { paddingTop: topInset + space.xl }]}>
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
    <View style={styles.root}>
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
        testID="lesson-summary-scroll"
        style={styles.scroll}
        removeClippedSubviews={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topInset + space.xxl,
            paddingBottom: Math.max(insets.bottom, space.lg) + space.xxxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="h1" style={styles.title}>
          {status === 'failed' ? t('lesson.summaryFailedTitle') : t('lesson.summaryTitle')}
        </Text>

        <View style={styles.xpWrap}>
          <XpCounter xp={xpEarned} label={t('lesson.summaryXp')} />
        </View>

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

        <NewWordsList
          items={newItems}
          selectedIds={selectedIds}
          onToggle={togglePhrase}
          onToggleAll={toggleAll}
          onLongPressItem={(id) => setSheetIds([id])}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        {newItems.length > 0 ? (
          <Button
            title={t('lesson.summaryToVocabCount', { count: selectedCount })}
            variant="secondary"
            disabled={leaving || selectedCount === 0}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSheetIds([...selectedIds]);
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
      <AddToVocabSheet
        visible={sheetIds !== null}
        itemIds={sheetIds ?? []}
        onClose={() => setSheetIds(null)}
        onChanged={() => undefined}
      />
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
  scroll: {
    flex: 1,
    zIndex: 2,
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
  },
  xpWrap: {
    paddingVertical: space.sm,
    overflow: 'visible',
    zIndex: 2,
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
