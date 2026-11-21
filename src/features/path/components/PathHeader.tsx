import { Flame, RefreshCw, Search } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, depth, radius, space } from '@/theme/tokens';

type PathHeaderProps = {
  /** Small line above the city, e.g. «A1 · ТИЖДЕНЬ 1». */
  eyebrow: string;
  city: string;
  /** Full header for screen readers, e.g. «A1 · Тиждень 1 · Мадрид». */
  a11yTitle: string;
  streakLabel: string;
  streak: number;
  reviewLabel: string;
  reviewCount: number;
  onReview: () => void;
  searchLabel: string;
  onSearch: () => void;
  paddingTop: number;
};

export function PathHeader({
  eyebrow,
  city,
  a11yTitle,
  streakLabel,
  streak,
  reviewLabel,
  reviewCount,
  onReview,
  searchLabel,
  onSearch,
  paddingTop,
}: PathHeaderProps) {
  return (
    <View style={[styles.bar, { paddingTop }]}>
      <View style={styles.row}>
        <View
          style={styles.titles}
          accessible
          accessibilityRole="header"
          accessibilityLabel={a11yTitle}
        >
          <Text variant="label" color={colors.teal} numberOfLines={1}>
            {eyebrow}
          </Text>
          <Text variant="h2" numberOfLines={1}>
            {city}
          </Text>
        </View>
        <View accessible accessibilityLabel={streakLabel} style={[styles.chip, styles.streak]}>
          <Flame color={colors.coral} fill={colors.coral} size={18} strokeWidth={2} />
          <Text variant="bodyBold" color={colors.coralDeep}>
            {streak}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={reviewLabel}
          onPress={onReview}
          style={({ pressed }) => [styles.chip, styles.review, pressed ? styles.pressed : null]}
        >
          <RefreshCw color={colors.inkOnDark} size={18} strokeWidth={2.4} />
          <Text variant="bodyBold" color={colors.inkOnDark}>
            {reviewCount}
          </Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={searchLabel}
        onPress={onSearch}
        style={styles.search}
      >
        <Search color={colors.ink} size={18} strokeWidth={2.4} />
        <Text
          variant="bodyBold"
          color={colors.inkMuted}
          numberOfLines={1}
          style={styles.searchText}
        >
          {searchLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: space.sm + 2,
    paddingHorizontal: space.xl,
    paddingBottom: space.sm,
    backgroundColor: colors.ground,
    zIndex: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  chip: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs + 2,
  },
  streak: {
    backgroundColor: colors.surface,
    shadowColor: colors.border,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  review: {
    backgroundColor: colors.teal,
    shadowColor: colors.tealDeep,
    shadowOffset: { width: 0, height: depth.chip },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  pressed: {
    transform: [{ translateY: depth.chip }],
    shadowOpacity: 0,
  },
  search: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    paddingHorizontal: space.md + 2,
    shadowColor: colors.border,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  searchText: {
    flex: 1,
  },
});
