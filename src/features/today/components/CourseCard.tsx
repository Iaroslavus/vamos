import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { CourseDay, DayStatus } from '@/features/today/course';
import { STARTER_DAYS } from '@/features/today/course';
import { colors, motion, radius, space } from '@/theme/tokens';

type CourseCardProps = {
  days: readonly CourseDay[];
  currentDay: number | null;
  finished: boolean;
  topicTitle: string | null;
  canContinue: boolean;
  onContinue: () => void;
};

export function CourseCard({
  days,
  currentDay,
  finished,
  topicTitle,
  canContinue,
  onContinue,
}: CourseCardProps) {
  const { t } = useTranslation();
  const day = currentDay ?? STARTER_DAYS;
  const action =
    finished && topicTitle ? t('today.continueTopic', { title: topicTitle }) : t('today.continue');

  return (
    <View style={styles.card}>
      <Text variant="h3">{t('today.courseTitle')}</Text>
      <Text variant="body" color={colors.inkMuted}>
        {t('today.dayCount', { day, total: STARTER_DAYS })}
      </Text>
      <View style={styles.dots}>
        {days.map((item) => (
          <DayDot key={item.day} status={item.status} />
        ))}
      </View>
      <Button title={action} disabled={!canContinue} onPress={onContinue} />
    </View>
  );
}

function DayDot({ status }: { status: DayStatus }) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (status !== 'current' || reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(withTiming(1.2, { duration: motion.pulse.period / 2 }), -1, true);
  }, [reduceMotion, scale, status]);

  const pulse = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        status === 'completed' ? styles.dotDone : null,
        status === 'current' ? styles.dotCurrent : null,
        pulse,
      ]}
    />
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
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
  },
  dotDone: {
    backgroundColor: colors.teal,
  },
  dotCurrent: {
    backgroundColor: colors.coral,
  },
});
