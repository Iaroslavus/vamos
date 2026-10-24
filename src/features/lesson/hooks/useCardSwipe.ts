import * as Haptics from 'expo-haptics';
import { useEffect, useMemo } from 'react';
import { PanResponder } from 'react-native';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { motion } from '@/theme/tokens';

import { shouldAdvanceOnSwipe } from '../intro';

/** Drag the intro card left to fire the same action as «Дальше». */
export function useCardSwipe(onAdvance: () => void, cardKey: string) {
  const reduceMotion = useReduceMotion();
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = 0;
  }, [cardKey, translateX]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          gesture.dx < -10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_event, gesture) => {
          // Reanimated shared values are intentionally mutated via `.value`.
          // eslint-disable-next-line react-hooks/immutability -- shared value write
          translateX.value = Math.min(0, gesture.dx);
        },
        onPanResponderRelease: (_event, gesture) => {
          const advance = shouldAdvanceOnSwipe(gesture.dx, gesture.vx);
          // eslint-disable-next-line react-hooks/immutability -- shared value write
          translateX.value = reduceMotion || advance ? 0 : withSpring(0, motion.spring);
          if (!advance) return;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onAdvance();
        },
        onPanResponderTerminate: () => {
          // eslint-disable-next-line react-hooks/immutability -- shared value write
          translateX.value = reduceMotion ? 0 : withSpring(0, motion.spring);
        },
      }),
    [onAdvance, reduceMotion, translateX],
  );

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return { panHandlers: pan.panHandlers, style };
}
