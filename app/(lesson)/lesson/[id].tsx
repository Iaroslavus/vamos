import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { ResultSheet } from '@/components/ResultSheet';
import { Text } from '@/components/Text';
import { stopLessonAudio } from '@/features/audio/playback';
import { BuildSentenceExercise } from '@/features/lesson/components/BuildSentenceExercise';
import { LessonHearts } from '@/features/lesson/components/LessonHearts';
import { ListenSelectExercise } from '@/features/lesson/components/ListenSelectExercise';
import { MatchPairsExercise } from '@/features/lesson/components/MatchPairsExercise';
import { SelectTranslationExercise } from '@/features/lesson/components/SelectTranslationExercise';
import { loadLesson } from '@/features/lesson/loader';
import { toPlayableExercises } from '@/features/lesson/playable';
import { useLessonStore, type LessonExerciseItem } from '@/features/lesson/store';
import { colors, space } from '@/theme/tokens';

type LoadResult =
  | { ok: true; lessonId: string; exercises: LessonExerciseItem[] }
  | { ok: false; reason: 'missing_id' | 'empty' | 'not_found' };

function loadPlayableLesson(lessonId: string | undefined): LoadResult {
  if (!lessonId) return { ok: false, reason: 'missing_id' };
  try {
    const lesson = loadLesson(lessonId);
    const exercises = toPlayableExercises(lesson);
    if (exercises.length === 0) return { ok: false, reason: 'empty' };
    return { ok: true, lessonId, exercises };
  } catch {
    return { ok: false, reason: 'not_found' };
  }
}

export default function LessonScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = typeof id === 'string' ? id : Array.isArray(id) ? (id[0] ?? '') : '';

  const loaded = useMemo(() => loadPlayableLesson(lessonId || undefined), [lessonId]);

  const status = useLessonStore((s) => s.status);
  const hearts = useLessonStore((s) => s.hearts);
  const maxHearts = useLessonStore((s) => s.maxHearts);
  const userAnswer = useLessonStore((s) => s.userAnswer);
  const lastGrade = useLessonStore((s) => s.lastGrade);
  const startLesson = useLessonStore((s) => s.startLesson);
  const setAnswer = useLessonStore((s) => s.setAnswer);
  const checkAnswer = useLessonStore((s) => s.checkAnswer);
  const continueAfterFeedback = useLessonStore((s) => s.continueAfterFeedback);
  const reset = useLessonStore((s) => s.reset);
  const getCurrentExercise = useLessonStore((s) => s.getCurrentExercise);
  const getProgress = useLessonStore((s) => s.getProgress);

  const exercise = getCurrentExercise();
  const progress = getProgress();

  useEffect(() => {
    if (!loaded.ok) return;
    startLesson({ lessonId: loaded.lessonId, exercises: loaded.exercises });
    return () => {
      void stopLessonAudio();
      reset();
    };
  }, [loaded, reset, startLesson]);

  const onAnswerChange = useCallback(
    (value: string) => {
      setAnswer(value);
    },
    [setAnswer],
  );

  const sheetVisible = status === 'feedback' || status === 'failed';
  const sheetSuccess = lastGrade?.status === 'correct' || lastGrade?.status === 'almost';

  const sheetTitle = useMemo(() => {
    if (!lastGrade) return '';
    if (lastGrade.status === 'correct') return t('lesson.feedbackCorrect');
    if (lastGrade.status === 'almost') return t('lesson.feedbackAlmost');
    if (status === 'failed') return t('lesson.feedbackFailed');
    return t('lesson.feedbackWrong');
  }, [lastGrade, status, t]);

  const sheetMessage = useMemo(() => {
    if (!lastGrade) return undefined;
    if (lastGrade.status === 'almost') return lastGrade.note;
    if (lastGrade.status === 'wrong') {
      return t('lesson.correctAnswer', { answer: lastGrade.correctAnswer });
    }
    return undefined;
  }, [lastGrade, t]);

  const leaveLesson = useCallback(() => {
    reset();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [reset, router]);

  const onContinue = useCallback(() => {
    if (status === 'failed') {
      leaveLesson();
      return;
    }

    continueAfterFeedback();
    const nextStatus = useLessonStore.getState().status;
    if (nextStatus === 'completed') {
      leaveLesson();
    }
  }, [continueAfterFeedback, leaveLesson, status]);

  if (!loaded.ok) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top + space.lg }]}>
        <Text variant="h3">{t('lesson.loadError')}</Text>
        <Button title={t('common.close')} variant="secondary" onPress={leaveLesson} />
      </View>
    );
  }

  if (!exercise || status === 'idle') {
    return <View style={[styles.root, { backgroundColor: colors.ground }]} />;
  }

  const canCheck =
    status === 'active' &&
    userAnswer.trim().length > 0 &&
    (exercise.type !== 'match_pairs' || userAnswer === exercise.answer);

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.header}>
        <Pressable
          onPress={leaveLesson}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={styles.closeBtn}
        >
          <X size={24} color={colors.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.progressWrap}>
          <ProgressBar
            progress={progress.ratio}
            accessibilityLabel={t('lesson.progressA11y', {
              solved: progress.solved,
              total: progress.total,
            })}
          />
        </View>
        <LessonHearts hearts={hearts} maxHearts={maxHearts} />
      </View>

      <View style={styles.body}>
        {exercise.type === 'select_translation' ? (
          <SelectTranslationExercise
            exercise={exercise}
            selected={userAnswer}
            disabled={status !== 'active'}
            onSelect={setAnswer}
          />
        ) : null}
        {exercise.type === 'build_sentence' ? (
          <BuildSentenceExercise
            key={exercise.id}
            exercise={exercise}
            disabled={status !== 'active'}
            onAnswerChange={onAnswerChange}
          />
        ) : null}
        {exercise.type === 'listen_select' ? (
          <ListenSelectExercise
            exercise={exercise}
            selected={userAnswer}
            disabled={status !== 'active'}
            onSelect={setAnswer}
          />
        ) : null}
        {exercise.type === 'match_pairs' ? (
          <MatchPairsExercise
            key={exercise.id}
            exercise={exercise}
            disabled={status !== 'active'}
            onAnswerChange={onAnswerChange}
          />
        ) : null}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <Button
          title={t('lesson.check')}
          variant="primary"
          disabled={!canCheck}
          onPress={() => {
            checkAnswer();
          }}
        />
      </View>

      <ResultSheet
        visible={sheetVisible}
        variant={sheetSuccess ? 'success' : 'error'}
        title={sheetTitle}
        message={sheetMessage}
        continueLabel={status === 'failed' ? t('common.close') : t('lesson.continue')}
        onContinue={onContinue}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressWrap: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
});
