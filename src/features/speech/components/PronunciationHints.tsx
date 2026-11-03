import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import { pronunciationHints } from '../rules';

type PronunciationHintsProps = {
  phrase: string;
};

/** Coaching lines for sounds that are in the reference, in the interface language. */
export function PronunciationHints({ phrase }: PronunciationHintsProps) {
  const { t } = useTranslation();
  const rules = pronunciationHints(phrase);
  if (rules.length === 0) return null;

  return (
    <View style={styles.root} accessibilityRole="text">
      {rules.map((rule) => (
        <Text key={rule.id} variant="caption" color={colors.inkMuted}>
          {t(rule.hintKey)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.xs,
  },
});
