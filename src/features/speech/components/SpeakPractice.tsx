import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { playLessonAudio, stopLessonAudio } from '@/features/audio/playback';
import { colors, space } from '@/theme/tokens';

import { useSpeakPractice, type SpeakPracticeMode } from '../hooks/useSpeakPractice';
import type { SpeechOption } from '../score';
import { ColoredPhrase } from './ColoredPhrase';
import { SpeakActions } from './SpeakActions';
import { SpeakFeedback } from './SpeakFeedback';
import { SpeakPracticeControls, SpeakPracticeHeading } from './SpeakPracticeChrome';
import { SpeechFallback, type SpeechFallbackTone } from './SpeechFallback';

type Part = { es: string; ru: string };

export type SpeakPracticeProps = {
  phrase: string;
  audio?: string | null;
  sayRu?: string | null;
  parts?: readonly Part[];
  mode: SpeakPracticeMode;
  options?: readonly SpeechOption[];
  onMatch?: (optionId: string) => void;
  onSkip?: () => void;
  onContinue?: () => void;
  onClose?: () => void;
  attemptsUsed?: number;
  onAttemptsUsed?: (count: number) => void;
};

export function SpeakPractice({
  phrase,
  audio = null,
  sayRu = null,
  parts = [],
  mode,
  options,
  onMatch,
  onSkip,
  onContinue,
  onClose,
  attemptsUsed,
  onAttemptsUsed,
}: SpeakPracticeProps) {
  const { t } = useTranslation();
  const practice = useSpeakPractice({
    phrase,
    mode,
    options,
    onMatch,
    attemptsUsed,
    onAttemptsUsed,
  });
  const access = practice.capture.access;
  const fallback = access === 'unavailable' || access === 'denied' || access === 'blocked';
  const tone: SpeechFallbackTone = mode === 'step' ? 'step' : mode;
  const micDisabled = (practice.locked || practice.micBlocked) && !practice.capture.listening;

  const onSample = () => {
    if (practice.capture.listening) practice.capture.stop();
    if (!phrase) return;
    void playLessonAudio({ audio, text: phrase });
  };

  const onMic = () => {
    void stopLessonAudio();
    practice.onMic();
  };

  return (
    <View style={[styles.root, mode === 'step' ? styles.step : null]}>
      <View style={styles.body}>
        <SpeakPracticeHeading mode={mode} />
        {mode === 'dialog' ? null : <ColoredPhrase phrase={phrase} score={practice.shown} />}
        {practice.shown ? (
          <SpeakFeedback
            score={practice.shown}
            attemptsLeft={practice.attemptsLeft}
            sayRu={sayRu}
            parts={parts}
            showAttempts={mode === 'step'}
          />
        ) : mode === 'step' ? (
          <Text variant="body" color={colors.inkMuted}>
            {t('speech.attemptsLeft', { count: practice.attemptsLeft })}
          </Text>
        ) : null}
        {mode === 'dialog' && practice.dialogMiss ? (
          <Text variant="body" color={colors.inkMuted}>
            {t('speech.dialogMiss')}
          </Text>
        ) : null}
        <SpeechFallback access={access} tone={tone} onAllow={() => void practice.capture.begin()} />
        {practice.capture.notice === 'none' ? null : (
          <Text variant="body" color={colors.inkMuted}>
            {t(practice.capture.notice === 'no-speech' ? 'speech.noSpeech' : 'speech.error')}
          </Text>
        )}
      </View>

      {mode === 'step' ? (
        <SpeakActions
          listening={practice.capture.listening}
          volume={practice.capture.volume}
          micDisabled={micDisabled}
          passed={practice.passed}
          onMic={onMic}
          onSample={onSample}
          onSkip={() => onSkip?.()}
          onContinue={() => onContinue?.()}
        />
      ) : (
        <SpeakPracticeControls
          listening={practice.capture.listening}
          volume={practice.capture.volume}
          micDisabled={micDisabled}
          showSample={mode !== 'dialog'}
          sampleTitle={t(fallback ? 'speech.listenAndRepeat' : 'speech.listenSample')}
          closeTitle={t(practice.passed ? 'speech.practiceDone' : 'common.close')}
          closePrimary={practice.passed}
          onMic={onMic}
          onSample={onSample}
          onClose={() => onClose?.()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.md,
  },
  step: {
    flex: 1,
    justifyContent: 'space-between',
    gap: space.lg,
  },
  body: {
    gap: space.md,
  },
});
