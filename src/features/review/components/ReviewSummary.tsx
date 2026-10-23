import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { XpCounter } from '@/features/lesson/components/XpCounter';
import { formatAccuracyPercent } from '@/features/lesson/format';
import { colors, space } from '@/theme/tokens';

type ReviewSummaryProps = {
  reviewed: number;
  accuracy: number;
  xp: number;
  onDone: () => void;
};

export function ReviewSummary({ reviewed, accuracy, xp, onDone }: ReviewSummaryProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.content}>
      <Text variant="h1" style={styles.title}>
        {t('review.summaryTitle')}
      </Text>
      <XpCounter xp={xp} label={t('review.summaryXp')} />
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text variant="caption" color={colors.inkMuted}>
            {t('review.summaryCards')}
          </Text>
          <Text variant="h2">{reviewed}</Text>
        </View>
        <View style={styles.stat}>
          <Text variant="caption" color={colors.inkMuted}>
            {t('review.summaryAccuracy')}
          </Text>
          <Text variant="h2" color={colors.teal}>
            {formatAccuracyPercent(accuracy)}
          </Text>
        </View>
      </View>
      <Button title={t('review.summaryContinue')} variant="primary" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: space.xxl,
    paddingHorizontal: space.xl,
  },
  title: {
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.xxl,
  },
  stat: {
    alignItems: 'center',
    gap: space.xs,
    minWidth: 100,
  },
});
