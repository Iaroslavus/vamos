import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, type } from '@/theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type RingProps = {
  /** Progress from 0 to 1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function Ring({
  progress,
  size = 72,
  strokeWidth = 8,
  color = colors.saffron,
  trackColor = colors.surfaceSunken,
  label,
  style,
  accessibilityLabel,
}: RingProps) {
  const reduceMotion = useReduceMotion();
  const fill = useSharedValue(0);
  const target = clamp01(progress);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

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

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fill.value),
  }));

  const center = size / 2;
  const percentLabel = label ?? `${Math.round(target * 100)}%`;

  return (
    <View
      accessibilityLabel={accessibilityLabel ?? percentLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}
      style={[styles.wrap, { width: size, height: size }, style]}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.labelWrap} pointerEvents="none">
        <Text style={styles.label}>{percentLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: type.label.fontFamily,
    fontSize: type.label.fontSize,
    letterSpacing: type.label.letterSpacing,
    color: colors.ink,
  },
});
