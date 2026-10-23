import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import type { ReviewForecastDay } from '@/features/review/forecast';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, fonts, motion, radius, space } from '@/theme/tokens';

const TRACK_HEIGHT = 64;

function barColor(count: number, today: boolean): string {
  if (count === 0) return colors.surfaceSunken;
  if (today) return colors.coral;
  return colors.saffron;
}

type ReviewForecastProps = {
  days: readonly ReviewForecastDay[];
};

export function ReviewForecast({ days }: ReviewForecastProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  if (days.length === 0) return null;

  const peak = Math.max(...days.map((day) => day.count));

  return (
    <View style={styles.card}>
      <Text variant="h3" accessibilityRole="header">
        {t('progress.forecastTitle')}
      </Text>
      <View style={styles.row}>
        {days.map((day, index) => (
          <ForecastColumn
            key={day.date}
            day={day}
            scale={peak > 0 ? day.count / peak : 0}
            delay={index * motion.stagger}
            today={index === 0}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>
    </View>
  );
}

type ForecastColumnProps = {
  day: ReviewForecastDay;
  scale: number;
  delay: number;
  today: boolean;
  reduceMotion: boolean;
};

function ForecastColumn({ day, scale, delay, today, reduceMotion }: ForecastColumnProps) {
  const { t } = useTranslation();
  const weekday = t(`progress.weekdays.${day.weekday}`);
  const grown = useSharedValue(reduceMotion ? scale : 0);

  useEffect(() => {
    if (reduceMotion) {
      grown.value = scale;
      return;
    }
    grown.value = withDelay(
      delay,
      withTiming(scale, {
        duration: motion.progress.duration,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [delay, grown, reduceMotion, scale]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: grown.value }],
  }));
  const fillColor = barColor(day.count, today);

  return (
    <View
      accessible
      accessibilityLabel={t('progress.forecastDay', { weekday, count: day.count })}
      style={styles.column}
    >
      <Text variant="caption" color={day.count > 0 ? colors.ink : colors.inkMuted}>
        {day.count}
      </Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle, { backgroundColor: fillColor }]} />
      </View>
      <Text
        variant="caption"
        color={today ? colors.ink : colors.inkMuted}
        style={today ? styles.today : undefined}
      >
        {weekday}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
  },
  column: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: space.xs,
  },
  track: {
    height: TRACK_HEIGHT,
    width: '100%',
    maxWidth: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    height: '100%',
    width: '100%',
    borderRadius: radius.sm,
    transformOrigin: 'bottom',
  },
  today: {
    fontFamily: fonts.bodyHeavy,
  },
});
