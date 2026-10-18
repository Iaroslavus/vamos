import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, radius } from '@/theme/tokens';

export type ProgressBarProps = {
  /** Progress from 0 to 1 */
  progress: number;
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function ProgressBar({
  progress,
  color = colors.coral,
  trackColor = colors.surfaceSunken,
  style,
  accessibilityLabel,
}: ProgressBarProps) {
  const reduceMotion = useReduceMotion();
  const fill = useSharedValue(0);
  const target = clamp01(progress);

  useEffect(() => {
    if (reduceMotion) {
      fill.value = target;
      return;
    }

    fill.value = withTiming(target, {
      duration: motion.progress.duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [fill, reduceMotion, target]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
  }));

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}
      style={[styles.track, { backgroundColor: trackColor }, style]}
    >
      <Animated.View style={[styles.fill, fillStyle, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 12,
    borderRadius: radius.pill,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    width: '100%',
    borderRadius: radius.pill,
    transformOrigin: 'left center',
  },
});
