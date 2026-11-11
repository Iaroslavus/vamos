import { X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ProgressBar } from '@/components/ProgressBar';
import { ResultSheet } from '@/components/ResultSheet';
import { Text } from '@/components/Text';
import { stopLessonAudio } from '@/features/audio/playback';
import { useAudioPreference } from '@/features/audio/preference';
import { AccentBar } from '@/features/lesson/components/AccentBar';
import { buildResultSheetModel } from '@/features/lesson/feedbackView';
import { colors, space } from '@/theme/tokens';

import { studyStepExercise } from '../exercise';
import { playUnit } from '../playUnit';
import { useStudyPlayer, type StudyRecordInput } from '../hooks/useStudyPlayer';
import { studyStepsForRepeat, summarizeScores, type ScoreAttempt } from '../sessionSummary';
import type { StudyStep } from '../types';
import { SessionSummaryView } from './SessionSummary';
import { StudyStepBody } from './StudyStepBody';

type StudyPlayerProps = {
  steps: readonly StudyStep[];
  recordGrades: boolean;
  onRecord: (record: StudyRecordInput) => Promise<void>;
  onClose: () => void;
  onAttempt?: (attempt: ScoreAttempt) => void;
  /** When set, finishing the last step continues a mixed session instead of the summary. */
  onFinished?: () => void;
};

export function StudyPlayer({ steps, ...rest }: StudyPlayerProps) {
  const [session, setSession] = useState({ steps, round: 0 });

  return (
    <StudyPlayerRound
      key={session.round}
      {...rest}
      steps={session.steps}
      onReplay={(ids) => {
        const next = studyStepsForRepeat(session.steps, ids);
        if (next.length === 0) return;
        setSession({ steps: next, round: session.round + 1 });
      }}
    />
  );
}

function StudyPlayerRound({
  steps,
  recordGrades,
  onRecord,
  onClose,
  onAttempt,
  onFinished,
  onReplay,
}: StudyPlayerProps & { onReplay: (itemIds: readonly string[]) => void }) {
  const { t } = useTranslation();
  const preference = useAudioPreference();
  const player = useStudyPlayer({ steps, recordGrades, onRecord, onAttempt });
  const step = player.step;
  const reported = useRef(false);

  useEffect(() => {
    if (!step || !step.autoplay) return undefined;
    const itemId = 'itemId' in step ? step.itemId : null;
    // listen_select starts itself when the exercise appears.
    const shouldPlay =
      step.type === 'speak_repeat' || (step.type === 'type_translation' && step.playEs);
    if (!itemId || !shouldPlay) return undefined;
    const es =
      step.type === 'speak_repeat' ? step.promptEs : 'phraseEs' in step ? step.phraseEs : '';
    playUnit(itemId, es, preference);
    return () => {
      void stopLessonAudio();
    };
  }, [preference, step]);

  useEffect(() => {
    if (!player.done || !onFinished || reported.current) return;
    reported.current = true;
    onFinished();
  }, [onFinished, player.done]);

  if (player.done || !step) {
    if (onFinished) return null;
    const summary = summarizeScores(player.attempts);
    return (
      <SessionSummaryView
        summary={summary}
        onDone={onClose}
        onRepeat={() => onReplay(summary.repeatIds)}
      />
    );
  }

  const prompt = step.type === 'flashcard' ? '' : t(`study.prompt.${step.promptKey}`);
  const exercise = studyStepExercise(step, prompt);
  const model = buildResultSheetModel({
    t,
    exercise,
    grade: player.result,
    failed: false,
  });
  const typing = step.type === 'type_translation' && step.direction === 'ru_to_es' && !player.sheet;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <IconButton accessibilityLabel={t('study.close')} onPress={onClose}>
          <X size={22} color={colors.ink} strokeWidth={2.2} />
        </IconButton>
        <View style={styles.progress}>
          <ProgressBar
            progress={player.total === 0 ? 0 : player.index / player.total}
            accessibilityLabel={t('study.progress', { done: player.index, total: player.total })}
          />
        </View>
      </View>

      {step.type === 'speak_repeat' ? (
        <StudyStepBody
          step={step}
          prompt={prompt}
          answer={player.answer}
          disabled={player.busy}
          gradeStatus={player.gradeStatus}
          inputRef={player.inputRef}
          onAnswer={player.setAnswer}
          onMatchSolved={player.matchSolved}
          onSpeakPass={player.speakPass}
          onSpeakSkip={player.speakSkip}
        />
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          <StudyStepBody
            step={step}
            prompt={prompt}
            answer={player.answer}
            disabled={player.sheet || player.busy}
            gradeStatus={player.gradeStatus}
            inputRef={player.inputRef}
            onAnswer={player.setAnswer}
            onMatchSolved={player.matchSolved}
            onSpeakPass={player.speakPass}
            onSpeakSkip={player.speakSkip}
          />
        </ScrollView>
      )}

      {player.rateError && step.type === 'speak_repeat' ? (
        <Text variant="caption" color={colors.errorInk} style={styles.center}>
          {t('study.rateError')}
        </Text>
      ) : null}

      {typing ? (
        <AccentBar
          disabled={player.sheet || player.busy}
          onInsert={(symbol) => player.inputRef.current?.insertSymbol(symbol)}
        />
      ) : null}

      {player.showCheck ? (
        <Button title={t('lesson.check')} disabled={!player.canCheck} onPress={player.check} />
      ) : null}

      <ResultSheet
        visible={player.sheet}
        variant={model.variant}
        title={model.title}
        message={player.rateError ? t('study.rateError') : model.message}
        phraseEs={model.phraseEs}
        phraseTr={model.phraseTr}
        pairs={model.pairs}
        correctLabel={model.correctLabel}
        speakText={model.speakText}
        audio={model.audio}
        autoPlay={model.autoPlay}
        continueLabel={player.retrying ? t('study.again') : t('lesson.continue')}
        onContinue={player.goOn}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  progress: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
    paddingBottom: space.lg,
  },
  center: {
    textAlign: 'center',
  },
});
