import { useEffect, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { motion } from '@/theme/tokens';

export const FOLDER_SWIPE_ACTION_WIDTH = 88;
const OPEN = FOLDER_SWIPE_ACTION_WIDTH * 2;

export function useFolderRowSwipe(editable: boolean) {
  const reduceMotion = useReduceMotion();
  const translateX = useSharedValue(0);
  const opened = useSharedValue(0);
  const allowMotion = useSharedValue(reduceMotion ? 0 : 1);

  useEffect(() => {
    allowMotion.value = reduceMotion ? 0 : 1;
  }, [allowMotion, reduceMotion]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(editable)
        .activeOffsetX([-16, 16])
        .failOffsetY([-24, 24])
        .onUpdate((event) => {
          const base = opened.value === 1 ? -OPEN : 0;
          const next = clamp(base + event.translationX, -OPEN, 0);
          // eslint-disable-next-line react-hooks/immutability -- shared value write
          translateX.value = allowMotion.value === 0 ? snap(next) : next;
        })
        .onEnd((event) => {
          const base = opened.value === 1 ? -OPEN : 0;
          const next = clamp(base + event.translationX, -OPEN, 0);
          const shouldOpen = next < -OPEN / 2 || event.velocityX < -600;
          const target = shouldOpen ? -OPEN : 0;
          // eslint-disable-next-line react-hooks/immutability -- shared value write
          opened.value = shouldOpen ? 1 : 0;
          // eslint-disable-next-line react-hooks/immutability -- shared value write
          translateX.value = allowMotion.value === 0 ? target : withSpring(target, motion.spring);
        }),
    [allowMotion, editable, opened, translateX],
  );

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const close = () => {
    // eslint-disable-next-line react-hooks/immutability -- shared value write
    opened.value = 0;
    // eslint-disable-next-line react-hooks/immutability -- shared value write
    translateX.value = allowMotion.value === 0 ? 0 : withSpring(0, motion.spring);
  };

  return { gesture, cardStyle, close };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snap(value: number): number {
  return value < -OPEN / 2 ? -OPEN : 0;
}
