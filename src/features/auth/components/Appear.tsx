import { useEffect, type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { motion } from '@/theme/tokens';

type AppearProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Appear({ children, style }: AppearProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(reduceMotion ? 0 : 12);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: motion.pop.duration });
    if (reduceMotion) return;

    translateY.value = withSpring(0, motion.spring);
  }, [opacity, reduceMotion, translateY]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
