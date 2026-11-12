import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

type PairsBoardStatusProps = {
  found: number;
  total: number;
  round: number;
  rounds: number;
  timer: string | null;
};

export function PairsBoardStatus({ found, total, round, rounds, timer }: PairsBoardStatusProps) {
  const { t } = useTranslation();
  const foundLabel = t('session.found', { found, total });
  const roundLabel = t('session.round', { current: round, total: rounds });
  const progress = total === 0 ? 0 : found / total;

  return (
    <View style={styles.root}>
      <Text variant="bodyBold">{foundLabel}</Text>
      <ProgressBar progress={progress} color={colors.teal} accessibilityLabel={foundLabel} />
      <View style={styles.rounds}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.dots}
        >
          {Array.from({ length: rounds }, (_, index) => {
            const place = index + 1;
            return <View key={place} style={[styles.dot, dotTone(place, round)]} />;
          })}
        </View>
        <Text variant="caption" color={colors.inkMuted}>
          {roundLabel}
        </Text>
      </View>
      {timer ? (
        <Text variant="caption" color={colors.inkMuted}>
          {timer}
        </Text>
      ) : null}
    </View>
  );
}

function dotTone(place: number, round: number) {
  if (place === round) return styles.current;
  if (place < round) return styles.done;
  return styles.upcoming;
}

const styles = StyleSheet.create({
  root: {
    gap: space.sm,
  },
  rounds: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  dot: {
    borderRadius: 999,
  },
  upcoming: {
    width: 8,
    height: 8,
    backgroundColor: colors.surfaceSunken,
  },
  done: {
    width: 8,
    height: 8,
    backgroundColor: colors.teal,
  },
  current: {
    width: 12,
    height: 12,
    backgroundColor: colors.coral,
  },
});
