import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { ResultSheet } from '@/components/ResultSheet';
import { Text } from '@/components/Text';
import { stopLessonAudio } from '@/features/audio/playback';
import { playGradeSound } from '@/features/audio/sounds';
import { AccentBar } from '@/features/lesson/components/AccentBar';
import { type AnswerTextFieldHandle } from '@/features/lesson/components/AnswerTextField';
import { BuildSentenceExercise } from '@/features/lesson/components/BuildSentenceExercise';
import { FillGapExercise } from '@/features/lesson/components/FillGapExercise';
import { LessonHearts } from '@/features/lesson/components/LessonHearts';
import { ListenSelectExercise } from '@/features/lesson/components/ListenSelectExercise';
import { MatchPairsExercise } from '@/features/lesson/components/MatchPairsExercise';
import { MistakesIntro } from '@/features/lesson/components/MistakesIntro';
import { SelectTranslationExercise } from '@/features/lesson/components/SelectTranslationExercise';
import { TypeTranslationExercise } from '@/features/lesson/components/TypeTranslationExercise';
import { loadLesson } from '@/features/lesson/loader';
import { countSerializedPairs } from '@/features/lesson/pairs';
import { isTypingExercise, toPlayableExercises } from '@/features/lesson/playable';
import type { VocabularyItem } from '@/features/lesson/schema';
import { useLessonStore, type LessonExerciseItem } from '@/features/lesson/store';
import { colors, space } from '@/theme/tokens';

type LoadResult =
  | {
      ok: true;
      lessonId: string;
      exercises: LessonExerciseItem[];
      newItems: VocabularyItem[];
    }
  | { ok: false; reason: 'missing_id' | 'empty' | 'not_found' };

function loadPlayableLesson(lessonId: string | undefined): LoadResult {
  if (!lessonId) return { ok: false, reason: 'missing_id' };
  try {
    const lesson = loadLesson(lessonId);
    const exercises = toPlayableExercises(lesson);
    if (exercises.length === 0) return { ok: false, reason: 'empty' };
    return { ok: true, lessonId, exercises, newItems: lesson.new_items };
  } catch {
    return { ok: false, reason: 'not_found' };
  }
}

export default function LessonScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const answerInputRef = useRef<AnswerTextFieldHandle>(null);
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
  const continueMistakesIntro = useLessonStore((s) => s.continueMistakesIntro);
  const reset = useLessonStore((s) => s.reset);
  const getCurrentExercise = useLessonStore((s) => s.getCurrentExercise);
  const getProgress = useLessonStore((s) => s.getProgress);
  const queue = useLessonStore((s) => s.queue);

  const exercise = getCurrentExercise();
  const progress = getProgress();
  const typing = exercise ? isTypingExercise(exercise) : false;
  const mistakesIntroVisible = status === 'mistakes_intro';

  useEffect(() => {
    if (!loaded.ok) return;
    startLesson({
      lessonId: loaded.lessonId,
      exercises: loaded.exercises,
      newItems: loaded.newItems,
    });
    return () => {
      void stopLessonAudio();
      // Keep session stats for the summary screen; reset on explicit leave / summary continue.
    };
  }, [loaded, startLesson]);

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
    if (lastGrade.status === 'almost') {
      const hint = lastGrade.note ?? t('lesson.feedbackAlmostHint');
      const correct = t('lesson.correctAnswer', { answer: lastGrade.correctAnswer });
      return `${hint}\n${correct}`;
    }
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

  const goToSummary = useCallback(() => {
    router.replace('/lesson/summary');
  }, [router]);

  const onContinue = useCallback(() => {
    if (status === 'failed') {
      goToSummary();
      return;
    }

    continueAfterFeedback();
    const nextStatus = useLessonStore.getState().status;
    if (nextStatus === 'completed') {
      goToSummary();
    }
  }, [continueAfterFeedback, goToSummary, status]);

  if (!loaded.ok) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top + space.lg }]}>
        <Text variant="h3">{t('lesson.loadError')}</Text>
        <Button title={t('common.close')} variant="secondary" onPress={leaveLesson} />
      </View>
    );
  }

  if (status === 'idle') {
    return <View style={[styles.root, { backgroundColor: colors.ground }]} />;
  }

  if (!exercise && !mistakesIntroVisible) {
    return <View style={[styles.root, { backgroundColor: colors.ground }]} />;
  }

  const canCheck =
    status === 'active' &&
    !!exercise &&
    userAnswer.trim().length > 0 &&
    (exercise.type !== 'match_pairs' || countSerializedPairs(userAnswer) === exercise.pairs.length);

  const gradeStatus =
    status === 'feedback' || status === 'failed' ? (lastGrade?.status ?? null) : null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + space.sm }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
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

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {exercise?.type === 'select_translation' ? (
          <SelectTranslationExercise
            exercise={exercise}
            selected={userAnswer}
            disabled={status !== 'active'}
            gradeStatus={gradeStatus}
            onSelect={setAnswer}
          />
        ) : null}
        {exercise?.type === 'build_sentence' ? (
          <BuildSentenceExercise
            key={exercise.id}
            exercise={exercise}
            disabled={status !== 'active'}
            gradeStatus={gradeStatus}
            onAnswerChange={onAnswerChange}
          />
        ) : null}
        {exercise?.type === 'listen_select' ? (
          <ListenSelectExercise
            exercise={exercise}
            selected={userAnswer}
            disabled={status !== 'active'}
            gradeStatus={gradeStatus}
            onSelect={setAnswer}
          />
        ) : null}
        {exercise?.type === 'match_pairs' ? (
          <MatchPairsExercise
            key={exercise.id}
            exercise={exercise}
            disabled={status !== 'active'}
            revealResult={Boolean(gradeStatus)}
            onAnswerChange={onAnswerChange}
          />
        ) : null}
        {exercise?.type === 'type_translation' ? (
          <TypeTranslationExercise
            key={exercise.id}
            exercise={exercise}
            value={userAnswer}
            disabled={status !== 'active'}
            onChangeText={onAnswerChange}
            inputRef={answerInputRef}
          />
        ) : null}
        {exercise?.type === 'fill_gap' ? (
          <FillGapExercise
            key={exercise.id}
            exercise={exercise}
            value={userAnswer}
            disabled={status !== 'active'}
            onChangeText={onAnswerChange}
            inputRef={answerInputRef}
          />
        ) : null}
      </ScrollView>

      {typing ? (
        <AccentBar
          disabled={status !== 'active'}
          onInsert={(symbol) => answerInputRef.current?.insertSymbol(symbol)}
        />
      ) : null}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <Button
          title={t('lesson.check')}
          variant="primary"
          disabled={!canCheck}
          onPress={() => {
            Keyboard.dismiss();
            const grade = checkAnswer();
            if (grade) {
              playGradeSound(grade.status);
            }
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

      <MistakesIntro
        visible={mistakesIntroVisible}
        remaining={queue.length}
        onContinue={continueMistakesIntro}
      />
    </KeyboardAvoidingView>
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
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.lg,
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
});
