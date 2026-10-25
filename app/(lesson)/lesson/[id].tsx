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
import { contentLocale, textOf, type ContentLocale } from '@/features/content/text';
import { AccentBar } from '@/features/lesson/components/AccentBar';
import { type AnswerTextFieldHandle } from '@/features/lesson/components/AnswerTextField';
import { DialogStep } from '@/features/lesson/components/DialogStep';
import { IntroStep } from '@/features/lesson/components/IntroStep';
import { LessonExerciseBody } from '@/features/lesson/components/LessonExerciseBody';
import { LessonHearts } from '@/features/lesson/components/LessonHearts';
import { MistakesIntro } from '@/features/lesson/components/MistakesIntro';
import { SpeakRepeatStep } from '@/features/lesson/components/SpeakRepeatStep';
import { useFinishLesson } from '@/features/lesson/hooks/useFinishLesson';
import { useRecordLessonMistake } from '@/features/lesson/hooks/useRecordLessonMistake';
import { showsSayRu } from '@/features/lesson/intro';
import { countSerializedPairs } from '@/features/lesson/pairs';
import {
  introPlace,
  isTypingExercise,
  loadLessonSession,
  stepSurface,
  type LoadedLesson,
} from '@/features/lesson/session';
import { useLessonStore } from '@/features/lesson/store';
import { colors, space } from '@/theme/tokens';

type LoadResult = { ok: true; session: LoadedLesson } | { ok: false };

function loadSession(lessonId: string | undefined, language: ContentLocale): LoadResult {
  if (!lessonId) return { ok: false };
  try {
    return { ok: true, session: loadLessonSession(lessonId, language) };
  } catch {
    return { ok: false };
  }
}

export default function LessonScreen() {
  const { t, i18n } = useTranslation();
  const language = contentLocale(i18n.language);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const answerInputRef = useRef<AnswerTextFieldHandle>(null);
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = typeof id === 'string' ? id : Array.isArray(id) ? (id[0] ?? '') : '';
  const loaded = useMemo(() => loadSession(lessonId || undefined, language), [language, lessonId]);

  const status = useLessonStore((s) => s.status);
  const flow = useLessonStore((s) => s.flow);
  const scriptIndex = useLessonStore((s) => s.scriptIndex);
  const stepsCompleted = useLessonStore((s) => s.stepsCompleted);
  const stepTotal = useLessonStore((s) => s.stepTotal);
  const hearts = useLessonStore((s) => s.hearts);
  const maxHearts = useLessonStore((s) => s.maxHearts);
  const userAnswer = useLessonStore((s) => s.userAnswer);
  const lastGrade = useLessonStore((s) => s.lastGrade);
  const startScript = useLessonStore((s) => s.startScript);
  const setAnswer = useLessonStore((s) => s.setAnswer);
  const checkAnswer = useLessonStore((s) => s.checkAnswer);
  const continueAfterFeedback = useLessonStore((s) => s.continueAfterFeedback);
  const advanceStep = useLessonStore((s) => s.advanceStep);
  const continueMistakesIntro = useLessonStore((s) => s.continueMistakesIntro);
  const reset = useLessonStore((s) => s.reset);
  const exercise = useLessonStore((s) => {
    if (s.flow === 'script') {
      const entry = s.script[s.scriptIndex];
      if (!entry || entry.kind !== 'exercise') return null;
      return s.exerciseById[entry.id] ?? null;
    }
    const head = s.queue[0];
    return head ? (s.exerciseById[head] ?? null) : null;
  });
  const mistakesLeft = useLessonStore((s) => s.queue.length);
  const finishLesson = useFinishLesson();
  const recordMistake = useRecordLessonMistake();

  const step = loaded.ok && flow === 'script' ? loaded.session.steps[scriptIndex] : undefined;
  const surface = step ? stepSurface(step) : null;
  const progress = useMemo(() => {
    const total = stepTotal;
    const ratio = total === 0 ? 0 : Math.min(1, stepsCompleted / total);
    return { solved: stepsCompleted, total, ratio };
  }, [stepTotal, stepsCompleted]);
  const typing = exercise ? isTypingExercise(exercise) : false;
  const mistakesIntroVisible = status === 'mistakes_intro';

  useEffect(() => {
    if (!loaded.ok) return;
    startScript({
      lessonId: loaded.session.lessonId,
      script: loaded.session.script,
      exercises: loaded.session.exercises,
      newItems: loaded.session.newItems,
    });
    return () => {
      void stopLessonAudio();
    };
  }, [loaded, startScript]);

  const onAnswerChange = useCallback(
    (value: string) => {
      setAnswer(value);
    },
    [setAnswer],
  );

  const sheetVisible = lastGrade !== null && (status === 'feedback' || status === 'failed');
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
    void finishLesson();
    router.replace('/lesson/summary');
  }, [finishLesson, router]);

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

  const onSoftContinue = useCallback(() => {
    if (useLessonStore.getState().status === 'failed') {
      goToSummary();
      return;
    }
    void stopLessonAudio();
    advanceStep();
    const nextStatus = useLessonStore.getState().status;
    if (nextStatus === 'completed' || nextStatus === 'failed') {
      goToSummary();
    }
  }, [advanceStep, goToSummary]);

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

  if (!surface && !exercise && !mistakesIntroVisible) {
    return <View style={[styles.root, { backgroundColor: colors.ground }]} />;
  }

  const canCheck =
    status === 'active' &&
    !!exercise &&
    userAnswer.trim().length > 0 &&
    (exercise.type !== 'match_pairs' || countSerializedPairs(userAnswer) === exercise.pairs.length);

  const gradeStatus =
    status === 'feedback' || status === 'failed' ? (lastGrade?.status ?? null) : null;

  const introItem = step?.type === 'intro' ? itemById(loaded.session, step.itemId) : null;
  const intro = step ? introPlace(loaded.session.steps, scriptIndex) : null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + space.sm }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

      {surface === 'intro' && introItem && intro ? (
        <IntroStep
          item={introItem}
          position={intro.position}
          total={intro.total}
          topicIcon={loaded.session.topicIcon}
          onNext={onSoftContinue}
        />
      ) : null}

      {surface === 'dialog' && step?.type === 'dialog' ? (
        <DialogStep step={step} items={loaded.session.items} onContinue={onSoftContinue} />
      ) : null}

      {surface === 'speak' && step?.type === 'speak_repeat' ? (
        <SpeakRepeatStep
          promptEs={step.prompt_es}
          audio={step.audio}
          sayRu={speakHint(loaded.session, step.itemIds[0] ?? '', language)}
          parts={speakParts(loaded.session, step.itemIds[0] ?? '', language)}
          onSkip={onSoftContinue}
          onContinue={onSoftContinue}
        />
      ) : null}

      {surface === 'prompt' && step && 'prompt_ru' in step ? (
        <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
          <Text variant="h2">{step.prompt_ru}</Text>
        </ScrollView>
      ) : null}

      {surface === 'exercise' || (!surface && exercise) ? (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {exercise ? (
            <LessonExerciseBody
              exercise={exercise}
              userAnswer={userAnswer}
              disabled={status !== 'active'}
              gradeStatus={gradeStatus}
              onSelect={setAnswer}
              onAnswerChange={onAnswerChange}
              inputRef={answerInputRef}
            />
          ) : null}
        </ScrollView>
      ) : null}

      {typing && (surface === 'exercise' || !surface) ? (
        <AccentBar
          disabled={status !== 'active'}
          onInsert={(symbol) => answerInputRef.current?.insertSymbol(symbol)}
        />
      ) : null}

      {surface === 'prompt' || surface === 'exercise' || !surface ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          {surface === 'exercise' || !surface ? (
            <Button
              title={t('lesson.check')}
              variant="primary"
              disabled={!canCheck}
              onPress={() => {
                Keyboard.dismiss();
                const current = useLessonStore.getState().getCurrentExercise();
                const grade = checkAnswer();
                if (!grade) return;
                playGradeSound(grade.status);
                if (current) recordMistake(current, grade.status);
              }}
            />
          ) : (
            <Button title={t('lesson.continue')} variant="primary" onPress={onSoftContinue} />
          )}
        </View>
      ) : null}

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
        remaining={mistakesLeft}
        onContinue={continueMistakesIntro}
      />
    </KeyboardAvoidingView>
  );
}

function itemById(session: LoadedLesson, itemId: string) {
  return session.items.find((item) => item.id === itemId) ?? null;
}

function speakHint(session: LoadedLesson, itemId: string, language: ContentLocale): string | null {
  const item = itemById(session, itemId);
  if (!item || !showsSayRu(item.level)) return null;
  return textOf(item.say, language) || null;
}

function speakParts(session: LoadedLesson, itemId: string, language: ContentLocale) {
  const item = itemById(session, itemId);
  if (!item) return [];
  return item.parts.map((part) => ({ es: part.es, ru: textOf(part.tr, language) }));
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
