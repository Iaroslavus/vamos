import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

type RetryNoteProps = {
  title: string;
  action: string;
  onPress: () => void;
};

export function RetryNote({ title, action, onPress }: RetryNoteProps) {
  return (
    <View style={styles.wrap}>
      <Text variant="body" color={colors.inkMuted} style={styles.title}>
        {title}
      </Text>
      <Button title={action} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.ground,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    gap: space.lg,
  },
  title: {
    textAlign: 'center',
  },
});
