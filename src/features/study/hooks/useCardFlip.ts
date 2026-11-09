import { useEffect } from 'react';
import { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { motion } from '@/theme/tokens';

/** 3D flip, or a fade when the learner asked to reduce motion. */
export function useCardFlip(cardKey: string, revealed: boolean) {
  const reduceMotion = useReduceMotion();
  const spin = useSharedValue(revealed ? 180 : 0);
  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const target = revealed ? 180 : 0;
    if (reduceMotion || !revealed) {
      spin.value = target;
      return;
    }
    spin.value = withSpring(target, motion.spring);
  }, [reduceMotion, revealed, spin]);

  useEffect(() => {
    if (reduceMotion) {
      offset.value = 0;
      opacity.value = withTiming(1, { duration: motion.press.duration });
      return;
    }
    offset.value = 12;
    opacity.value = 0;
    offset.value = withSpring(0, motion.spring);
    opacity.value = withTiming(1, { duration: motion.progress.duration });
  }, [cardKey, offset, opacity, reduceMotion]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));

  const frontStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: spin.value >= 90 ? 0 : 1 };
    return { transform: [{ perspective: 1200 }, { rotateY: `${spin.value}deg` }] };
  });

  const backStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: spin.value >= 90 ? 1 : 0 };
    return { transform: [{ perspective: 1200 }, { rotateY: `${spin.value + 180}deg` }] };
  });

  return { enterStyle, frontStyle, backStyle };
}
