import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import LottieView from 'lottie-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RetryNote } from '@/components/RetryNote';
import { Text } from '@/components/Text';
import { contentLanguage, listTopics, textOf } from '@/features/content/loader';
import type { Topic } from '@/features/content/schema';
import { LearnSkeleton } from '@/features/home/LearnSkeleton';
import { useLearnerProfile } from '@/features/learner/useLearnerProfile';
import {
  DEFAULT_DAILY_GOAL_MINUTES,
  deviceTimeZone,
  EMPTY_SNAPSHOT,
  studySnapshot,
} from '@/features/progress/study';
import { useProgress } from '@/features/progress/useProgress';
import { useReviewDueCount } from '@/features/review/hooks/useReviewDueCount';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, space } from '@/theme/tokens';

import { cityName } from './cities';
import { CheatSheet } from './components/CheatSheet';
import { PathCanvas } from './components/PathCanvas';
import { PathCard } from './components/PathCard';
import { PathHeader } from './components/PathHeader';
import { appPathPlan } from './coursePlan';
import {
  buildPath,
  heroLine,
  initialNodeId,
  lessonToOpen,
  pathAction,
  pathCelebration,
  snapshotOf,
  type PathNode,
  type PathSnapshot,
} from './map';

export function PathScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const progress = useProgress();
  const profile = useLearnerProfile();
  const dueReviews = useReviewDueCount();
  const plan = useMemo(() => appPathPlan(), []);
  const topics = useMemo(() => new Map(listTopics().map((topic) => [topic.id, topic])), []);
  const completedLessonIds = useMemo(
    () =>
      (progress.data?.lessons ?? [])
        .filter((lesson) => lesson.status === 'completed')
        .map((lesson) => lesson.lessonId),
    [progress.data],
  );
  const nodes = useMemo(() => buildPath(plan, { completedLessonIds }), [completedLessonIds, plan]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [topicJustFinished, setTopicJustFinished] = useState(false);
  const [jumpToken, setJumpToken] = useState(0);
  const [confetti, setConfetti] = useState(false);
  const previous = useRef<PathSnapshot[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (progress.isLoading && !progress.data) return;
      const event = pathCelebration(previous.current, snapshotOf(nodes));
      previous.current = snapshotOf(nodes);
      if (event === 'topic') {
        setTopicJustFinished(true);
        const next = nodes.find((node) => node.status === 'current');
        if (next) setSelectedId(next.id);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }
      if (event !== 'lesson') return;
      setTopicJustFinished(false);
      setJumpToken((token) => token + 1);
      if (reduceMotion) return;
      setConfetti(true);
      const timer = setTimeout(() => setConfetti(false), 1700);
      return () => clearTimeout(timer);
    }, [nodes, progress.data, progress.isLoading, reduceMotion]),
  );

  const selected =
    nodes.find((node) => node.id === selectedId) ??
    nodes.find((node) => node.id === initialNodeId(nodes)) ??
    null;
  const home = nodes.find((node) => node.status === 'current') ?? nodes[0] ?? null;
  const active = nodes.find((node) => node.moduleId === moduleId) ?? home;
  const titles = useMemo(() => nodeTitles(nodes, topics, t), [nodes, t, topics]);

  if (progress.isLoading && !progress.data) {
    return <LearnSkeleton label={t('path.loading')} />;
  }

  if (progress.isError && !progress.data) {
    return (
      <RetryNote
        title={t('path.loadError')}
        action={t('common.retry')}
        onPress={() => {
          void progress.refetch();
        }}
      />
    );
  }

  const snapshot = progress.data ?? EMPTY_SNAPSHOT;
  const streak = studySnapshot(snapshot, {
    now: new Date().toISOString(),
    timeZone: deviceTimeZone(),
    dailyGoalMinutes: profile.data?.dailyMinutes ?? DEFAULT_DAILY_GOAL_MINUTES,
  }).streak;
  const locale = contentLanguage();
  const headerTitle = active
    ? t('path.moduleTitle', {
        level: active.level,
        week: t('path.weekLabel', { week: active.week }),
        city: cityName(active.moduleId, locale),
      })
    : t('path.empty');

  return (
    <View style={styles.root}>
      <PathHeader
        title={headerTitle}
        paddingTop={insets.top + space.sm}
        streak={streak}
        streakLabel={t('path.streakA11y', { count: streak })}
        reviewChip={t('path.reviewChip', { count: dueReviews })}
        reviewLabel={t('path.reviewA11y', { count: dueReviews })}
        onReview={() => router.push('/review')}
      />
      {nodes.length === 0 || !selected ? (
        <View style={styles.empty}>
          <Text variant="body" color={colors.inkMuted} style={styles.emptyText}>
            {t('path.empty')}
          </Text>
        </View>
      ) : (
        <>
          <PathCanvas
            nodes={nodes}
            titles={titles}
            selectedId={selected.id}
            line={t(`hero.${heroLine(selected.status, topicJustFinished)}`)}
            jumpToken={jumpToken}
            onSelect={(id) => {
              setTopicJustFinished(false);
              setSelectedId(id);
            }}
            onModuleChange={setModuleId}
          />
          <PathCard
            {...cardProps(selected, topics, t)}
            lessonCount={selected.lessonIds.length}
            completedLessons={selected.completedLessons}
            action={pathAction(selected)}
            lessonNumber={selected.nextLessonNumber ?? 1}
            primaryDisabled={lessonToOpen(selected) == null}
            onPrimary={() => {
              const lessonId = lessonToOpen(selected);
              if (!lessonId) return;
              router.push({ pathname: '/lesson/[id]', params: { id: lessonId } });
            }}
            onCheatSheet={() => setSheetOpen(true)}
          />
          <CheatSheet
            visible={sheetOpen}
            title={titles.get(selected.id) ?? selected.id}
            lessonIds={selected.lessonIds}
            onClose={() => setSheetOpen(false)}
          />
        </>
      )}
      {confetti ? (
        <View pointerEvents="none" style={styles.confetti}>
          <LottieView
            source={require('../../../assets/lottie/confetti.json')}
            autoPlay
            loop={false}
            style={styles.confetti}
          />
        </View>
      ) : null}
    </View>
  );
}

function nodeTitles(
  nodes: readonly PathNode[],
  topics: ReadonlyMap<string, Topic>,
  t: TFunction,
): Map<string, string> {
  const titles = new Map<string, string>();
  const language = contentLanguage();
  for (const node of nodes) {
    if (node.kind === 'chest' || !node.topicId) {
      titles.set(node.id, t('path.chestTitle'));
      continue;
    }
    const topic = topics.get(node.topicId);
    titles.set(node.id, topic ? textOf(topic.title, language) : node.id);
  }
  return titles;
}

function cardProps(
  node: PathNode,
  topics: ReadonlyMap<string, Topic>,
  t: TFunction,
): { eyebrow: string; title: string; canDo: string } {
  const badge =
    node.status === 'done'
      ? t('path.badge.done')
      : node.status === 'current'
        ? t('path.badge.current')
        : t('path.badge.open');
  const eyebrow =
    node.day != null
      ? t('path.cardDay', { day: node.day, badge })
      : t('path.cardWeek', { week: node.week, badge });

  if (node.kind === 'chest' || !node.topicId) {
    return { eyebrow, title: t('path.chestCardTitle'), canDo: t('path.chestCanDo') };
  }

  const topic = topics.get(node.topicId);
  const language = contentLanguage();
  const canDo = (topic?.can_do ?? [])
    .map((line) => textOf(line, language))
    .filter((line) => line.length > 0)
    .slice(0, 2)
    .join(' · ');

  return {
    eyebrow,
    title: topic ? textOf(topic.title, language) : node.id,
    canDo,
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  emptyText: {
    textAlign: 'center',
  },
  confetti: {
    ...StyleSheet.absoluteFill,
    zIndex: 4,
  },
});
