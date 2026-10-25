import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, radius, space } from '@/theme/tokens';

const BARS = [0, 1, 2, 3, 4] as const;

type SoundWaveProps = {
  active: boolean;
  level: number;
};

export function SoundWave({ active, level }: SoundWaveProps) {
  if (!active) return null;

  return (
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {BARS.map((index) => (
        <WaveBar key={index} index={index} level={level} />
      ))}
    </View>
  );
}

function WaveBar({ index, level }: { index: number; level: number }) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(0.45);
  const loudness = useSharedValue(level);

  useEffect(() => {
    loudness.value = level;
  }, [level, loudness]);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 0.75;
      return;
    }
    scale.value = withDelay(
      index * motion.stagger,
      withRepeat(
        withTiming(1, {
          duration: motion.pulse.period / 4,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );
  }, [index, reduceMotion, scale]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 0.35 + scale.value * (0.45 + loudness.value * 0.55) }],
  }));

  return <Animated.View style={[styles.bar, reduceMotion ? styles.barStill : barStyle]} />;
}

const styles = StyleSheet.create({
  row: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  bar: {
    width: 6,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.coral,
  },
  barStill: {
    height: 16,
    opacity: 0.7,
  },
});
