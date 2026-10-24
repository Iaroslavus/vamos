import { Flame } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, radius, space } from '@/theme/tokens';

const ICON_STROKE = 2.2;

type TodayHeaderProps = {
  greeting: string;
  streak: number;
  xp: number;
};

export function TodayHeader({ greeting, streak, xp }: TodayHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <Text variant="h2" accessibilityRole="header" style={styles.greeting}>
        {greeting}
      </Text>
      <View style={styles.stats}>
        <View
          accessible
          accessibilityLabel={t('learn.streakLabel', { count: streak })}
          style={styles.streak}
        >
          <StreakFlame active={streak > 0} />
          <Text variant="h3">{streak}</Text>
        </View>
        <View accessible accessibilityLabel={t('learn.xpLabel', { xp })} style={styles.xp}>
          <Text variant="label" color={colors.saffronDeep}>
            {t('learn.xpShort')}
          </Text>
          <Text variant="h3">{xp}</Text>
        </View>
      </View>
    </View>
  );
}

function StreakFlame({ active }: { active: boolean }) {
  const reduceMotion = useReduceMotion();
  const turn = useSharedValue(0);

  useEffect(() => {
    if (!active || reduceMotion) {
      turn.value = 0;
      return;
    }
    turn.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [active, reduceMotion, turn]);

  const wobble = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-6 + turn.value * 12}deg` }],
  }));

  return (
    <Animated.View style={wobble}>
      <Flame
        color={active ? colors.saffron : colors.inkDisabled}
        size={28}
        strokeWidth={ICON_STROKE}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: space.md,
  },
  greeting: {
    flexShrink: 1,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
  },
  xp: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.saffronSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
});
