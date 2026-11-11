import { X } from 'lucide-react-native';
import { useEffect } from 'react';
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
import type { LearnController } from '../hooks/useLearnSession';
import { StudyStepBody } from './StudyStepBody';

type LearnQuizProps = {
  player: LearnController;
  onClose: () => void;
};

export function LearnQuiz({ player, onClose }: LearnQuizProps) {
  const { t } = useTranslation();
  const preference = useAudioPreference();
  const step = player.step;
  const caption = t('study.learnedOf', player.progress);

  useEffect(() => {
    if (!step?.autoplay) return undefined;
    const itemId = 'itemId' in step ? step.itemId : null;
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

  if (!step || step.type === 'flashcard' || step.type === 'match_pairs') return null;

  const prompt = t(`study.prompt.${step.promptKey}`);
  const exercise = studyStepExercise(step, prompt);
  const model = buildResultSheetModel({
    t,
    exercise,
    grade: player.result,
    failed: false,
  });
  const typing = step.type === 'type_translation' && step.direction === 'ru_to_es' && !player.sheet;
  const progress =
    player.progress.total === 0 ? 0 : player.progress.learned / player.progress.total;

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
          <Text
            variant="caption"
            color={colors.inkMuted}
            accessible={false}
            testID="learn-progress"
          >
            {caption}
          </Text>
          <ProgressBar progress={progress} accessibilityLabel={caption} />
        </View>
      </View>

      {step.type === 'speak_repeat' ? (
        <StudyStepBody
          key={step.id}
          step={step}
          prompt={prompt}
          answer={player.answer}
          disabled={player.busy}
          gradeStatus={player.gradeStatus}
          inputRef={player.inputRef}
          onAnswer={player.setAnswer}
          onMatchSolved={() => undefined}
          onSpeakPass={() => {
            void player.speakPass();
          }}
          onSpeakSkip={() => {
            void player.speakSkip();
          }}
        />
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          <StudyStepBody
            key={step.id}
            step={step}
            prompt={prompt}
            answer={player.answer}
            disabled={player.sheet || player.busy}
            gradeStatus={player.gradeStatus}
            inputRef={player.inputRef}
            onAnswer={player.setAnswer}
            onMatchSolved={() => undefined}
            onSpeakPass={() => undefined}
            onSpeakSkip={() => undefined}
          />
        </ScrollView>
      )}

      {player.rateError && step.type === 'speak_repeat' ? (
        <Text variant="caption" color={colors.errorInk} style={styles.center}>
          {t('study.rateError')}
        </Text>
      ) : null}
      {player.rateError && step.type === 'speak_repeat' ? (
        <Button title={t('common.retry')} onPress={() => void player.goOn()} />
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
        continueLabel={t('lesson.continue')}
        onContinue={() => {
          void player.goOn();
        }}
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
    gap: space.xs,
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
