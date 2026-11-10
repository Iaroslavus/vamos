import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { formatInterval, type IntervalUnit } from '@/features/review/session';
import { reviewMinutes } from '@/features/review/units';
import { colors, space } from '@/theme/tokens';

type VocabHeaderProps = {
  learned: number;
  due: number;
  nextInMs: number | null;
  onReview: () => void;
};

const NEXT_KEY: Record<IntervalUnit, string> = {
  minutes: 'vocab.nextMinutes',
  hours: 'vocab.nextHours',
  days: 'vocab.nextDays',
};

export function VocabHeader({ learned, due, nextInMs, onReview }: VocabHeaderProps) {
  const { t } = useTranslation();
  const caption =
    due === 0
      ? t('vocab.caughtUp', { when: nextLabel(nextInMs, t) })
      : t('vocab.waitingLine', {
          waiting: t('vocab.waiting', { count: due }),
          minutes: t('vocab.eta', { count: reviewMinutes(due) }),
        });

  return (
    <View style={styles.block}>
      <View style={styles.copy}>
        <Text variant="h1" accessibilityRole="header">
          {t('vocab.learned', { count: learned })}
        </Text>
        <Text variant="body" color={colors.inkMuted}>
          {caption}
        </Text>
      </View>
      <Button title={t('vocab.reviewAll')} disabled={due === 0} onPress={onReview} />
    </View>
  );
}

function nextLabel(nextInMs: number | null, t: TFunction): string {
  if (nextInMs == null) return t('vocab.nextLater');
  const label = formatInterval(nextInMs);
  return t(NEXT_KEY[label.unit], { count: label.count });
}

const styles = StyleSheet.create({
  block: {
    gap: space.lg,
  },
  copy: {
    gap: space.sm,
  },
});
