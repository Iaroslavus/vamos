import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Ring } from '@/components/Ring';
import { Text } from '@/components/Text';
import { glossForWord, isSpeechPass, type SpeechScore } from '@/features/speech/score';
import { colors, radius, space } from '@/theme/tokens';

type SpeakFeedbackProps = {
  score: SpeechScore;
  attemptsLeft: number;
  sayRu: string | null;
  parts: readonly { es: string; ru: string }[];
};

function hintKey(score: SpeechScore): string {
  if (score.problem?.reason === 'accent') return 'speech.hintAccent';
  if (score.problem?.mark === 'close') return 'speech.hintClose';
  return 'speech.hintMiss';
}

export function SpeakFeedback({ score, attemptsLeft, sayRu, parts }: SpeakFeedbackProps) {
  const { t } = useTranslation();
  const problem = score.problem;
  const gloss = problem ? glossForWord(problem.expected, parts) : null;
  const passed = isSpeechPass(score);

  return (
    <View style={styles.root}>
      {problem ? (
        <View style={styles.hint} accessibilityLiveRegion="polite">
          <Text variant="bodyBold">{t(hintKey(score), { word: problem.expected })}</Text>
          {gloss ? <Text variant="body">{t('speech.hintGloss', { gloss })}</Text> : null}
          {sayRu ? (
            <Text variant="caption" color={colors.inkMuted}>
              {t('speech.hintSay', { say: sayRu })}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.scoreRow}>
        <Ring
          progress={score.score / 100}
          color={passed ? colors.teal : colors.coral}
          accessibilityLabel={t('speech.scoreA11y', { score: score.score })}
        />
        <Text variant="bodyBold">{t('speech.attemptsLeft', { count: attemptsLeft })}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.md,
  },
  hint: {
    gap: space.xs,
    backgroundColor: colors.hint,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
});
