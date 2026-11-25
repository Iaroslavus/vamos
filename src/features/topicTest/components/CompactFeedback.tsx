import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

type CompactFeedbackProps = {
  correct: boolean;
  title: string;
  answer?: string;
};

/** One short line between tasks. The lesson result sheet stays out of the test. */
export function CompactFeedback({ correct, title, answer }: CompactFeedbackProps) {
  return (
    <View accessibilityRole="text" style={[styles.bar, correct ? styles.correct : styles.wrong]}>
      <Text variant="bodyBold" color={correct ? colors.tealDeep : colors.errorInk}>
        {title}
      </Text>
      {!correct && answer ? (
        <Text variant="caption" color={colors.errorInk} numberOfLines={2}>
          {answer}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.md,
  },
  correct: {
    backgroundColor: colors.tealSoft,
  },
  wrong: {
    backgroundColor: colors.errorSoft,
  },
});
