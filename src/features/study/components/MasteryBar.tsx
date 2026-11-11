import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, radius, space } from '@/theme/tokens';

import type { MasteryCounts } from '../types';

type MasteryBarProps = {
  counts: MasteryCounts;
};

const SEGMENTS = [
  { key: 'new', color: colors.inkDisabled, label: 'study.masteryNew' },
  { key: 'learning', color: colors.saffron, label: 'study.masteryLearning' },
  { key: 'known', color: colors.teal, label: 'study.masteryKnown' },
] as const;

export function MasteryBar({ counts }: MasteryBarProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const grow = useSharedValue(reduceMotion ? 1 : 0);
  const total = counts.new + counts.learning + counts.known;

  useEffect(() => {
    const target = total === 0 ? 0 : 1;
    if (reduceMotion) {
      grow.value = target;
      return;
    }
    grow.value = 0;
    grow.value = withTiming(target, {
      duration: motion.progress.duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [counts.known, counts.learning, counts.new, grow, reduceMotion, total]);

  const summary = t('study.masterySummary', counts);

  return (
    <View accessibilityLabel={summary} style={styles.root}>
      <Text variant="caption" color={colors.inkMuted}>
        {t('study.masteryLabel')}
      </Text>
      <View style={styles.track}>
        {total === 0
          ? null
          : SEGMENTS.map((segment) => (
              <Segment
                key={segment.key}
                color={segment.color}
                share={counts[segment.key] / total}
                grow={grow}
              />
            ))}
      </View>
      <View style={styles.legend}>
        {SEGMENTS.map((segment) => (
          <View key={segment.key} style={styles.legendItem}>
            <View
              testID={`mastery-${segment.key}`}
              style={[styles.dot, { backgroundColor: segment.color }]}
            />
            <Text variant="caption" color={colors.inkMuted}>
              {t(segment.label)} {counts[segment.key]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Segment({
  color,
  share,
  grow,
}: {
  color: string;
  share: number;
  grow: { value: number };
}) {
  const style = useAnimatedStyle(() => ({
    flexGrow: share * grow.value,
    flexBasis: 0,
  }));

  if (share <= 0) return null;

  return <Animated.View style={[styles.segment, style, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  root: {
    gap: space.sm,
  },
  track: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  segment: {
    height: '100%',
    minWidth: 0,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 44,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
});
