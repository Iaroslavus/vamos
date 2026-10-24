import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { speechWords, type SpeechScore, type WordMark } from '@/features/speech/score';
import { colors, space } from '@/theme/tokens';

const markColor: Record<WordMark | 'pending', string> = {
  ok: colors.teal,
  close: colors.saffronDeep,
  miss: colors.errorInk,
  pending: colors.ink,
};

type ColoredPhraseProps = {
  phrase: string;
  score: SpeechScore | null;
};

export function ColoredPhrase({ phrase, score }: ColoredPhraseProps) {
  const pending = speechWords(phrase).map((expected) => ({
    expected,
    mark: 'pending' as const,
  }));
  const words = score?.words ?? pending;

  if (words.length === 0) {
    return <Text variant="h1">{phrase}</Text>;
  }

  return (
    <View style={styles.row} accessibilityRole="text" accessibilityLabel={phrase}>
      {words.map((word, index) => (
        <Text
          key={`${word.expected}-${index}`}
          variant="h1"
          color={markColor[word.mark]}
          style={styles.word}
        >
          {word.expected}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: space.sm,
  },
  word: {
    flexShrink: 1,
  },
});
