import { useEffect, type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { motion } from '@/theme/tokens';

type AppearProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Cascade delay in ms. Skipped when reduced motion is on. */
  delay?: number;
};

export function Appear({ children, style, delay = 0 }: AppearProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(reduceMotion ? 0 : 12);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    opacity.value = withDelay(delay, withTiming(1, { duration: motion.pop.duration }));
    translateY.value = withDelay(delay, withSpring(0, motion.spring));
  }, [delay, opacity, reduceMotion, translateY]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
