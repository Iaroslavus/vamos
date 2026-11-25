import { Volume2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { playLessonAudio, SLOW_RATE, stopLessonAudio } from '@/features/audio/playback';
import { colors, fonts, space } from '@/theme/tokens';

import { useSampleDuration } from '../hooks/useSampleDuration';
import { useSpeakPractice, type SpeakPracticeMode } from '../hooks/useSpeakPractice';
import { useUnitFeatures } from '../hooks/useUnitFeatures';
import type { SpeechOption, SpeechScore } from '../score';
import { ColoredPhrase } from './ColoredPhrase';
import { MicButton } from './MicButton';
import { SpeakPracticeFooter } from './SpeakPracticeFooter';
import { SpeechFallback, type SpeechFallbackTone } from './SpeechFallback';
import { SpeechFeedback } from './SpeechFeedback';

type Part = { es: string; ru: string };

export type SpeakPracticeProps = {
  phrase: string;
  audio?: string | null;
  sayRu?: string | null;
  parts?: readonly Part[];
  mode: SpeakPracticeMode;
  confusables?: readonly string[];
  options?: readonly SpeechOption[];
  /** Options that count as a correct dialog line. */
  acceptIds?: readonly string[];
  /** Shown instead of the phrase until the learner has spoken. A digit, for example. */
  cue?: string | null;
  /** Gendered lines. Each one has its own sound button, and any of them counts. */
  lines?: readonly { es: string; audio?: string | null }[];
  onMatch?: (optionId: string) => void;
  onSkip?: () => void;
  /** `passed` is false when the learner moves on after a miss. `score` is 0–100. */
  onContinue?: (passed: boolean, score: number | null) => void;
  onClose?: () => void;
  attemptsUsed?: number;
  onAttemptsUsed?: (count: number) => void;
  /** Storage path of the unit's MFCC reference. Missing path keeps the text score. */
  featuresPath?: string | null;
  /** Understood at this score. Omitted in a lesson, where the speech default applies. */
  passScore?: number;
  /**
   * Dev gallery only. A release build ignores it, so a fake score cannot ship.
   */
  preview?: SpeechScore | null;
  /** Dev gallery only. The line under the colored words. */
  previewHeard?: string | null;
};

export function SpeakPractice({
  phrase,
  audio = null,
  mode,
  confusables = [],
  options,
  acceptIds,
  cue = null,
  lines,
  onMatch,
  onSkip,
  onContinue,
  onClose,
  attemptsUsed,
  onAttemptsUsed,
  featuresPath = null,
  passScore,
  preview = null,
  previewHeard = null,
}: SpeakPracticeProps) {
  const { t } = useTranslation();
  const sampleDurationMs = useSampleDuration(audio);
  const references = useUnitFeatures(featuresPath);
  const spokenOptions =
    lines && lines.length > 1
      ? lines.map((line, index) => ({ id: String(index), es: line.es }))
      : options;
  const practice = useSpeakPractice({
    phrase,
    mode,
    options: spokenOptions,
    acceptIds,
    confusables,
    onMatch,
    attemptsUsed,
    onAttemptsUsed,
    references,
    passScore,
    sampleDurationMs,
  });
  const access = practice.capture.access;
  const fallback = access === 'unavailable' || access === 'denied' || access === 'blocked';
  const tone: SpeechFallbackTone = mode === 'step' ? 'step' : mode;
  const listening = practice.recording || practice.capture.listening;
  const shown = __DEV__ && preview ? preview : practice.shown;
  const answered = shown != null || (mode === 'dialog' && practice.dialogMiss);
  const micDisabled = practice.grading || ((practice.locked || practice.micBlocked) && !listening);
  const reference = practice.reference || phrase;

  const onSample = () => {
    practice.cancelRecording();
    if (practice.capture.listening) practice.capture.stop();
    if (!phrase) return;
    void playLessonAudio({ audio, text: phrase });
  };

  return (
    <View style={[styles.root, mode === 'step' ? styles.step : null]}>
      <View style={styles.top}>
        {shown ? (
          <SpeechFeedback
            phrase={reference}
            score={shown}
            heard={preview ? previewHeard : practice.heard}
            mineDisabled={!practice.clip && preview == null}
            onPlayWord={(word) => {
              void playLessonAudio({ text: word, rate: SLOW_RATE });
            }}
            onPlayMine={() => {
              if (!practice.clip) return;
              void playLessonAudio({ audio: practice.clip, text: reference });
            }}
            onPlaySample={() => {
              const line = lines?.find((item) => item.es === reference);
              void playLessonAudio({ audio: line?.audio ?? audio, text: reference });
            }}
          />
        ) : cue ? (
          <Text style={styles.cue}>{cue}</Text>
        ) : mode === 'dialog' || phrase.length === 0 ? null : lines && lines.length > 1 ? (
          lines.map((line) => (
            <View key={line.es} style={styles.phraseRow}>
              <View style={styles.phrase}>
                <ColoredPhrase phrase={line.es} color={colors.ink} />
              </View>
              <IconButton
                accessibilityLabel={t('speech.listenSample')}
                onPress={() => {
                  practice.cancelRecording();
                  void playLessonAudio({ audio: line.audio, text: line.es });
                }}
              >
                <Volume2 size={22} color={colors.ink} strokeWidth={2.2} />
              </IconButton>
            </View>
          ))
        ) : (
          <View style={styles.phraseRow}>
            <View style={styles.phrase}>
              <ColoredPhrase phrase={phrase} color={colors.ink} />
            </View>
            <IconButton accessibilityLabel={t('speech.listenSample')} onPress={onSample}>
              <Volume2 size={22} color={colors.ink} strokeWidth={2.2} />
            </IconButton>
          </View>
        )}
        {mode === 'dialog' && practice.dialogMiss && !shown ? (
          <Text variant="body" color={colors.inkMuted}>
            {t('speech.dialogMiss')}
          </Text>
        ) : null}
        <SpeechFallback access={access} tone={tone} onAllow={() => void practice.capture.begin()} />
        {practice.micUnavailable && !fallback ? (
          <Text variant="bodyBold">{t('speech.permissionTitle')}</Text>
        ) : null}
        {practice.capture.notice === 'none' ? null : (
          <Text variant="body" color={colors.inkMuted}>
            {t(practice.capture.notice === 'no-speech' ? 'speech.noSpeech' : 'speech.error')}
          </Text>
        )}
      </View>

      <View style={styles.stage}>
        {shown || answered ? null : (
          <MicButton
            listening={listening}
            disabled={micDisabled}
            accessibilityLabel={t(listening ? 'speech.micStop' : 'speech.micStart')}
            onPress={() => {
              void stopLessonAudio();
              practice.onMic();
            }}
          />
        )}
      </View>

      <SpeakPracticeFooter
        answered={answered}
        againDisabled={practice.locked || practice.micBlocked || practice.grading}
        onAgain={() => {
          void stopLessonAudio();
          practice.onAgain();
        }}
        onNext={() => {
          if (mode === 'dialog') {
            if (practice.matchedId) onMatch?.(practice.matchedId);
            else onClose?.();
            return;
          }
          if (onContinue) onContinue(practice.passed, shown?.score ?? null);
          else onClose?.();
        }}
        onSkip={() => {
          practice.cancelRecording();
          if (onSkip) onSkip();
          else onClose?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    minHeight: 420,
    justifyContent: 'space-between',
    gap: space.lg,
  },
  step: {
    flex: 1,
    minHeight: 0,
  },
  top: {
    gap: space.md,
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  phrase: {
    flex: 1,
  },
  stage: {
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cue: {
    fontFamily: fonts.display,
    fontSize: 72,
    lineHeight: 80,
    color: colors.ink,
    textAlign: 'center',
  },
});
