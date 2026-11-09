import * as Haptics from 'expo-haptics';
import { useEffect, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { motion } from '@/theme/tokens';

import { markForSwipe, swipeTilt, swipeTint, type FlashMark } from '../flashcards';

const EXIT_DISTANCE = 520;

/** Horizontal drag: the card leans, a wash shows the decision, then it flies off. */
export function useFlashDrag(cardKey: string, onMark: (mark: FlashMark) => void) {
  const reduceMotion = useReduceMotion();
  const translateX = useSharedValue(0);
  const allowMotion = useSharedValue(reduceMotion ? 0 : 1);

  useEffect(() => {
    allowMotion.value = reduceMotion ? 0 : 1;
  }, [allowMotion, reduceMotion]);

  useEffect(() => {
    translateX.value = 0;
  }, [cardKey, translateX]);

  const gesture = useMemo(() => {
    const finish = (mark: FlashMark) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onMark(mark);
    };

    return Gesture.Pan()
      .activeOffsetX([-16, 16])
      .failOffsetY([-24, 24])
      .onUpdate((event) => {
        if (allowMotion.value === 0) return;
        // Reanimated shared values are written through `.value`.
        // eslint-disable-next-line react-hooks/immutability -- shared value write
        translateX.value = event.translationX;
      })
      .onEnd((event) => {
        const mark = markForSwipe(event.translationX, event.velocityX);
        if (!mark) {
          // eslint-disable-next-line react-hooks/immutability -- shared value write
          translateX.value = allowMotion.value === 0 ? 0 : withSpring(0, motion.spring);
          return;
        }
        if (allowMotion.value === 0) {
          translateX.value = 0;
          runOnJS(finish)(mark);
          return;
        }
        const exit = mark === 'know' ? EXIT_DISTANCE : -EXIT_DISTANCE;
        translateX.value = withTiming(exit, { duration: 180 }, (finished) => {
          if (!finished) return;
          translateX.value = 0;
          runOnJS(finish)(mark);
        });
      });
  }, [allowMotion, onMark, translateX]);

  const dragStyle = useAnimatedStyle(() => {
    const shift = allowMotion.value === 0 ? 0 : translateX.value;
    const tilt = allowMotion.value === 0 ? 0 : swipeTilt(translateX.value);
    return { transform: [{ translateX: shift }, { rotateZ: `${tilt}deg` }] };
  });

  const knowStyle = useAnimatedStyle(() => ({
    opacity: swipeTint(translateX.value).know,
  }));

  const againStyle = useAnimatedStyle(() => ({
    opacity: swipeTint(translateX.value).again,
  }));

  return { gesture, dragStyle, knowStyle, againStyle };
}
