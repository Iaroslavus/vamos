import { Flame, Search } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

const ICON_STROKE = 2.2;

type PathHeaderProps = {
  title: string;
  streakLabel: string;
  streak: number;
  reviewLabel: string;
  reviewChip: string;
  searchLabel: string;
  onReview: () => void;
  onSearch: () => void;
  paddingTop: number;
};

export function PathHeader({
  title,
  streakLabel,
  streak,
  reviewLabel,
  reviewChip,
  searchLabel,
  onReview,
  onSearch,
  paddingTop,
}: PathHeaderProps) {
  return (
    <View style={[styles.wrap, { paddingTop }]}>
      <View style={styles.bar}>
        <Text variant="h3" numberOfLines={2} style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <View accessibilityLabel={streakLabel} style={styles.chip}>
          <Flame color={colors.saffronDeep} size={16} strokeWidth={ICON_STROKE} />
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={searchLabel}
        onPress={onSearch}
        style={styles.search}
      >
        <Search color={colors.inkMuted} size={18} strokeWidth={ICON_STROKE} />
        <Text variant="body" color={colors.inkDisabled} numberOfLines={1} style={styles.searchText}>
          {searchLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    backgroundColor: colors.ground,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  search: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  searchText: {
    flex: 1,
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
