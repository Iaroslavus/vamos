import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

type MetricCardProps = {
  label: string;
  value: string;
  accessibilityLabel: string;
};

export function MetricCard({ label, value, accessibilityLabel }: MetricCardProps) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.card}>
      <Text variant="h3">{value}</Text>
      <Text variant="caption" color={colors.inkMuted}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 88,
    justifyContent: 'center',
    gap: space.xs,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
  },
});
