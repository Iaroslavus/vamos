import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

type ErrorNoteProps = {
  message: string;
};

export function ErrorNote({ message }: ErrorNoteProps) {
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text color={colors.errorInk}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
});
