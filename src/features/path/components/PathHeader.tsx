import { Flame } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

type PathHeaderProps = {
  title: string;
  streakLabel: string;
  streak: number;
  reviewLabel: string;
  reviewChip: string;
  onReview: () => void;
  paddingTop: number;
};

export function PathHeader({
  title,
  streakLabel,
  streak,
  reviewLabel,
  reviewChip,
  onReview,
  paddingTop,
}: PathHeaderProps) {
  return (
    <View style={[styles.bar, { paddingTop }]}>
      <Text variant="h3" numberOfLines={2} style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <View accessibilityLabel={streakLabel} style={styles.chip}>
        <Flame color={colors.saffronDeep} size={16} strokeWidth={2.2} />
        <Text variant="bodyBold">{streak}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={reviewLabel}
        onPress={onReview}
        style={styles.chip}
      >
        <Text variant="bodyBold">{reviewChip}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    backgroundColor: colors.ground,
  },
  title: {
    flex: 1,
  },
  chip: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
});
