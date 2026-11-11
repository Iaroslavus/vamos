import { Volume2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Ring } from '@/components/Ring';
import { Text } from '@/components/Text';
import { playLessonAudio, stopLessonAudio } from '@/features/audio/playback';
import { colors, space } from '@/theme/tokens';

import { pronunciationCoach } from '../coach';
import { useSampleDuration } from '../hooks/useSampleDuration';
import { useSpeakPractice, type SpeakPracticeMode } from '../hooks/useSpeakPractice';
import { useUnitFeatures } from '../hooks/useUnitFeatures';
import type { SpeechOption, SpeechScore } from '../score';
import { speechScoreColor } from '../scoreColor';
import { ColoredPhrase } from './ColoredPhrase';
import { MicButton } from './MicButton';
import { SpeakPracticeFooter } from './SpeakPracticeFooter';
import { SpeechFallback, type SpeechFallbackTone } from './SpeechFallback';

type Part = { es: string; ru: string };

export type SpeakPracticeProps = {
  phrase: string;
  audio?: string | null;
  sayRu?: string | null;
  parts?: readonly Part[];
  mode: SpeakPracticeMode;
  confusables?: readonly string[];
  options?: readonly SpeechOption[];
  onMatch?: (optionId: string) => void;
  onSkip?: () => void;
  /** `passed` is false when the learner moves on after a miss. */
  onContinue?: (passed: boolean) => void;
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
};

export function SpeakPractice({
  phrase,
  audio = null,
  sayRu = null,
  mode,
  confusables = [],
  options,
  onMatch,
  onSkip,
  onContinue,
  onClose,
  attemptsUsed,
  onAttemptsUsed,
  featuresPath = null,
  passScore,
  preview = null,
}: SpeakPracticeProps) {
  const { t } = useTranslation();
  const sampleDurationMs = useSampleDuration(audio);
  const references = useUnitFeatures(featuresPath);
  const practice = useSpeakPractice({
    phrase,
    mode,
    options,
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
  const scoreColor = shown ? speechScoreColor(shown.score) : colors.ink;
  const hint = shown?.problem ? coachLine(t, phrase, shown.problem.expected, sayRu) : null;
  const micDisabled = practice.grading || ((practice.locked || practice.micBlocked) && !listening);

  const onSample = () => {
    practice.cancelRecording();
    if (practice.capture.listening) practice.capture.stop();
    if (!phrase) return;
    void playLessonAudio({ audio, text: phrase });
  };

  return (
    <View style={[styles.root, mode === 'step' ? styles.step : null]}>
      <View style={styles.top}>
        {mode === 'dialog' || phrase.length === 0 ? null : (
          <View style={styles.phraseRow}>
            <View style={styles.phrase}>
              <ColoredPhrase phrase={phrase} color={scoreColor} />
            </View>
            <IconButton accessibilityLabel={t('speech.listenSample')} onPress={onSample}>
              <Volume2 size={22} color={colors.ink} strokeWidth={2.2} />
            </IconButton>
          </View>
        )}
        {hint ? (
          <Text variant="body" accessibilityLiveRegion="polite">
            {hint}
          </Text>
        ) : null}
        {mode === 'dialog' && practice.dialogMiss ? (
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
        {shown ? (
          <Ring
            progress={shown.score / 100}
            size={120}
            strokeWidth={10}
            color={scoreColor}
            labelColor={scoreColor}
            prominent
            accessibilityLabel={t('speech.scoreA11y', { score: shown.score })}
          />
        ) : answered ? null : (
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
          if (onContinue) onContinue(practice.passed);
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

function coachLine(
  translate: (key: string, options?: Record<string, string>) => string,
  phrase: string,
  problemWord: string,
  say: string | null,
): string | null {
  const rule = pronunciationCoach(phrase, problemWord);
  const tip = rule ? translate(rule.hintKey) : null;
  const spoken = say?.trim() ? say.trim() : null;
  if (tip && spoken) return translate('speech.coachLine', { tip, say: spoken });
  return tip ?? spoken;
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
});
