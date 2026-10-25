import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { playLessonAudio, stopLessonAudio } from '@/features/audio/playback';
import { ColoredPhrase } from '@/features/speech/components/ColoredPhrase';
import { SpeakActions } from '@/features/speech/components/SpeakActions';
import { SpeakFeedback } from '@/features/speech/components/SpeakFeedback';
import { SpeechFallback } from '@/features/speech/components/SpeechFallback';
import { useSpeechCapture } from '@/features/speech/hooks/useSpeechCapture';
import { SPEECH_MAX_ATTEMPTS } from '@/features/speech/options';
import { isSpeechPass, scoreSpeech, speechWords, type SpeechScore } from '@/features/speech/score';
import { colors, space } from '@/theme/tokens';

type SpeakPart = { es: string; ru: string };

type SpeakRepeatStepProps = {
  promptEs: string;
  audio: string | null;
  sayRu?: string | null;
  parts?: readonly SpeakPart[];
  onSkip: () => void;
  onContinue: () => void;
};

export function SpeakRepeatStep({
  promptEs,
  audio,
  sayRu = null,
  parts = [],
  onSkip,
  onContinue,
}: SpeakRepeatStepProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [attempts, setAttempts] = useState(0);
  const [scored, setScored] = useState<SpeechScore | null>(null);
  const hints = [promptEs, ...speechWords(promptEs)];

  const onFinal = useCallback(
    (text: string) => {
      const next = scoreSpeech(promptEs, text);
      setScored(next);
      setAttempts((count) => Math.min(SPEECH_MAX_ATTEMPTS, count + 1));
      void Haptics.notificationAsync(
        isSpeechPass(next)
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
    },
    [promptEs],
  );

  const capture = useSpeechCapture(hints, onFinal);
  const shown = capture.transcript ? scoreSpeech(promptEs, capture.transcript) : scored;
  const passed = scored !== null && isSpeechPass(scored);
  const locked = attempts >= SPEECH_MAX_ATTEMPTS;
  const micBlocked = capture.access === 'blocked' || capture.access === 'unavailable';
  const attemptsLeft = SPEECH_MAX_ATTEMPTS - attempts;

  const onMic = () => {
    void stopLessonAudio();
    if (capture.listening) {
      capture.stop();
      return;
    }
    if (locked || micBlocked) return;
    void capture.begin();
  };

  const onSample = () => {
    if (capture.listening) capture.stop();
    void playLessonAudio({ audio, text: promptEs });
  };

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
      <View style={styles.body}>
        <Text variant="label" color={colors.inkMuted}>
          {t('speech.title')}
        </Text>
        <Text variant="caption" color={colors.inkMuted}>
          {t('speech.honesty')}
        </Text>
        <ColoredPhrase phrase={promptEs} score={shown} />
        {shown ? (
          <SpeakFeedback score={shown} attemptsLeft={attemptsLeft} sayRu={sayRu} parts={parts} />
        ) : (
          <Text variant="body" color={colors.inkMuted}>
            {t('speech.attemptsLeft', { count: attemptsLeft })}
          </Text>
        )}
        <SpeechFallback access={capture.access} onAllow={() => void capture.begin()} />
        {capture.notice === 'none' ? null : (
          <Text variant="body" color={colors.inkMuted}>
            {t(capture.notice === 'no-speech' ? 'speech.noSpeech' : 'speech.error')}
          </Text>
        )}
      </View>

      <SpeakActions
        listening={capture.listening}
        volume={capture.volume}
        micDisabled={locked || micBlocked}
        passed={passed}
        onMic={onMic}
        onSample={onSample}
        onSkip={onSkip}
        onContinue={onContinue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    justifyContent: 'space-between',
    gap: space.lg,
  },
  body: {
    gap: space.md,
  },
});
