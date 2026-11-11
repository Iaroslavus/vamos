import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { speechWords } from '@/features/speech/score';
import { space } from '@/theme/tokens';

type ColoredPhraseProps = {
  phrase: string;
  color: string;
};

/** The reference, one color for every word. */
export function ColoredPhrase({ phrase, color }: ColoredPhraseProps) {
  const words = speechWords(phrase);

  if (words.length === 0) {
    return (
      <Text variant="h1" color={color}>
        {phrase}
      </Text>
    );
  }

  return (
    <View style={styles.row} accessibilityRole="text" accessibilityLabel={phrase}>
      {words.map((word, index) => (
        <Text key={`${word}-${index}`} variant="h1" color={color} style={styles.word}>
          {word}
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
