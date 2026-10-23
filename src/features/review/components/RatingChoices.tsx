import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import type { ReviewRating } from '@/features/review/fsrs';
import type { IntervalLabel } from '@/features/review/session';
import { colors, space } from '@/theme/tokens';

const ROWS: readonly (readonly ReviewRating[])[] = [
  ['again', 'hard'],
  ['good', 'easy'],
];

type RatingChoicesProps = {
  intervals: Record<ReviewRating, IntervalLabel>;
  disabled?: boolean;
  onRate: (rating: ReviewRating) => void;
};

export function RatingChoices({ intervals, disabled = false, onRate }: RatingChoicesProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.grid}>
      {ROWS.map((row) => (
        <View key={row.join('-')} style={styles.row}>
          {row.map((rating) => {
            const when = t(`review.${intervals[rating].unit}`, {
              count: intervals[rating].count,
            });
            const title = t(`review.${rating}`);
            return (
              <View key={rating} style={styles.cell}>
                <Button
                  title={title}
                  variant="secondary"
                  disabled={disabled}
                  accessibilityLabel={t('review.rateLabel', { rating: title, when })}
                  onPress={() => onRate(rating)}
                />
                <Text variant="caption" color={colors.inkMuted} style={styles.when}>
                  {when}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: space.md,
  },
  row: {
    flexDirection: 'row',
    gap: space.md,
  },
  cell: {
    flex: 1,
    gap: space.xs,
  },
  when: {
    textAlign: 'center',
  },
});
