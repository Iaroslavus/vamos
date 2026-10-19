import { Flame } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Ring } from '@/components/Ring';
import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { StudyStats } from '@/features/progress/study';
import { colors, radius, space } from '@/theme/tokens';

const ICON_STROKE = 2.2;

type HomeStatsProps = {
  stats: StudyStats;
};

export function HomeStats({ stats }: HomeStatsProps) {
  const { t } = useTranslation();
  const goalMet = stats.goalProgress >= 1;
  const fraction = `${stats.todayMinutes}/${stats.goalMinutes}`;

  return (
    <View style={styles.card}>
      <View
        accessible
        accessibilityLabel={t('learn.streakLabel', { count: stats.streak })}
        style={styles.streak}
      >
        <StreakFlame active={stats.streak > 0} />
        <View>
          <Text variant="h3">{stats.streak}</Text>
          <Text variant="caption" color={colors.inkMuted}>
            {t('learn.streakCaption')}
          </Text>
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={t('learn.xpLabel', { xp: stats.totalXp })}
        style={styles.xp}
      >
        <Text variant="label" color={colors.saffronDeep}>
          {t('learn.xpShort')}
        </Text>
        <Text variant="h3">{stats.totalXp}</Text>
      </View>

      <View style={styles.goal}>
        <Ring
          progress={stats.goalProgress}
          size={64}
          label={fraction}
          color={goalMet ? colors.teal : colors.saffron}
          accessibilityLabel={t('learn.dayGoalRing', {
            done: stats.todayMinutes,
            goal: stats.goalMinutes,
          })}
        />
        <Text variant="caption" color={colors.inkMuted}>
          {t('learn.dayGoalLabel')}
        </Text>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.sm,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    flexShrink: 1,
  },
  xp: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.saffronSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  goal: {
    alignItems: 'center',
    gap: space.xs,
    flexShrink: 0,
  },
});
