import { useEffect } from 'react';
import { StyleSheet, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, radius } from '@/theme/tokens';

type BoneProps = {
  height: number;
  width?: DimensionValue;
  rounded?: 'pill' | 'card';
  style?: StyleProp<ViewStyle>;
};

export function Bone({ height, width = '100%', rounded = 'pill', style }: BoneProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }

    opacity.value = withRepeat(
      withTiming(0.45, {
        duration: motion.progress.duration,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [opacity, reduceMotion]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.bone,
        rounded === 'card' ? styles.card : styles.pill,
        { height, width },
        pulse,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bone: {
    backgroundColor: colors.surfaceSunken,
  },
  pill: {
    borderRadius: radius.pill,
  },
  card: {
    borderRadius: radius.lg,
  },
});
