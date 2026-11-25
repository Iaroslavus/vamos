import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { displayEs } from '@/features/content/displayText';
import { colors, space } from '@/theme/tokens';

import { decoratePhrase } from '../phrase';
import type { SpeechScore } from '../score';
import { speechTips, tipRuleKey } from '../tips';
import { speechVerdict, wordMarkColor } from '../verdict';

type SpeechFeedbackProps = {
  phrase: string;
  score: SpeechScore;
  heard: string | null;
  mineDisabled: boolean;
  onPlayWord: (word: string) => void;
  onPlayMine: () => void;
  onPlaySample: () => void;
};

export function SpeechFeedback({
  phrase,
  score,
  heard,
  mineDisabled,
  onPlayWord,
  onPlayMine,
  onPlaySample,
}: SpeechFeedbackProps) {
  const { t, i18n } = useTranslation();
  const pieces = decoratePhrase(displayEs(phrase), score.words);
  const verdict = speechVerdict(score.score);
  const title =
    verdict === 'great'
      ? t('lesson.speechGreat')
      : verdict === 'almost'
        ? t('lesson.speechAlmost')
        : t('lesson.speechRetry');
  const tips = speechTips(
    score.words.filter((word) => word.mark !== 'ok'),
    i18n.language,
  );

  return (
    <View style={styles.root}>
      <View style={styles.words} accessibilityRole="text">
        {pieces.map((piece, index) => {
          const color = piece.mark ? wordMarkColor(piece.mark) : colors.ink;
          const word = piece.word;
          return (
            <Pressable
              key={`${piece.text}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={piece.text}
              disabled={!word}
              style={styles.hit}
              onPress={() => {
                if (word) onPlayWord(word);
              }}
            >
              <Text variant="h1" color={color}>
                {piece.text}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {heard ? (
        <Text variant="body" color={colors.inkMuted}>
          {t('lesson.speechHeard', { text: heard })}
        </Text>
      ) : null}
      {tips.map((tip) => (
        <Text key={`${tip.word}-${tip.ruleId}`} variant="body">
          {t('lesson.speechTip', {
            word: tip.word,
            rule: t(tipRuleKey(tip.ruleId, tip.word)),
            say: tip.say,
          })}
        </Text>
      ))}
      <View style={styles.verdict}>
        <Text variant="h2" style={styles.verdictTitle}>
          {title}
        </Text>
        <Text variant="caption" color={colors.inkMuted} style={styles.center}>
          {t('lesson.speechPercent', { score: score.score })}
        </Text>
      </View>
      <View style={styles.row}>
        <Button
          title={t('lesson.speechMine')}
          variant="secondary"
          footer
          disabled={mineDisabled}
          onPress={onPlayMine}
          style={styles.half}
        />
        <Button
          title={t('lesson.speechSample')}
          variant="secondary"
          footer
          onPress={onPlaySample}
          style={styles.half}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.md,
  },
  words: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: space.sm,
  },
  hit: {
    minHeight: 44,
    justifyContent: 'flex-end',
  },
  verdict: {
    alignItems: 'center',
    gap: space.xs,
  },
  center: {
    textAlign: 'center',
  },
  verdictTitle: {
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
  },
  half: {
    flex: 1,
    minWidth: 0,
  },
});
