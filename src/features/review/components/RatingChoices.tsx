import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import type { ReviewRating } from '@/features/review/fsrs';
import type { MemoryChoice } from '@/features/review/memoryRating';
import { space } from '@/theme/tokens';

const ROWS: readonly (readonly ReviewRating[])[] = [
  ['again', 'hard'],
  ['good', 'easy'],
];

type RatingChoicesProps = {
  advanced: boolean;
  disabled?: boolean;
  onMemory: (choice: MemoryChoice) => void;
  onRate: (rating: ReviewRating) => void;
};

export function RatingChoices({
  advanced,
  disabled = false,
  onMemory,
  onRate,
}: RatingChoicesProps) {
  const { t } = useTranslation();

  if (!advanced) {
    return (
      <View style={styles.pair}>
        <Button
          title={t('review.forgot')}
          variant="secondary"
          large
          disabled={disabled}
          onPress={() => onMemory('forgot')}
          style={styles.grow}
        />
        <Button
          title={t('review.remember')}
          variant="success"
          large
          disabled={disabled}
          onPress={() => onMemory('remember')}
          style={styles.grow}
        />
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {ROWS.map((row) => (
        <View key={row.join('-')} style={styles.pair}>
          {row.map((rating) => (
            <Button
              key={rating}
              title={t(`review.${rating}`)}
              variant="secondary"
              disabled={disabled}
              onPress={() => onRate(rating)}
              style={styles.grow}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: space.md,
  },
  pair: {
    flexDirection: 'row',
    gap: space.md,
  },
  grow: {
    flex: 1,
  },
});
