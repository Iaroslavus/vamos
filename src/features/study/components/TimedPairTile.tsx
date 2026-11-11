import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { displayText } from '@/features/content/displayText';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, radius, space } from '@/theme/tokens';

import { PAIR_EXIT_MS, type TimedTile } from '../games/timedPairs';

type TimedPairTileProps = {
  tile: TimedTile;
  selected: boolean;
  shaking: boolean;
  gone: boolean;
  disabled: boolean;
  onPress: (tile: TimedTile) => void;
  onRetired: (tileId: string) => void;
};

export function TimedPairTile({
  tile,
  selected,
  shaking,
  gone,
  disabled,
  onPress,
  onRetired,
}: TimedPairTileProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const [retired, setRetired] = useState(false);
  const onRetiredRef = useRef(onRetired);

  useEffect(() => {
    onRetiredRef.current = onRetired;
  }, [onRetired]);

  useEffect(() => {
    if (!gone) return undefined;
    const duration = reduceMotion ? motion.press.duration : PAIR_EXIT_MS;
    opacity.value = withTiming(0, { duration });
    scale.value = reduceMotion ? 1 : withTiming(motion.pop.from, { duration });
    const timer = setTimeout(() => {
      setRetired(true);
      onRetiredRef.current(tile.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [gone, opacity, reduceMotion, scale, tile.id]);

  useEffect(() => {
    if (!shaking || reduceMotion) {
      shakeX.value = 0;
      return;
    }
    const step = motion.shake.duration;
    const distance = motion.shake.distance;
    shakeX.value = withSequence(
      withTiming(-distance, { duration: step }),
      withTiming(distance, { duration: step }),
      withTiming(-distance, { duration: step }),
      withTiming(distance, { duration: step }),
      withTiming(0, { duration: step }),
    );
  }, [reduceMotion, shakeX, shaking]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: shakeX.value }, { scale: scale.value }],
  }));

  if (retired) return null;

  const shown = displayText(tile.label);
  const tone = gone
    ? styles.gone
    : shaking
      ? styles.error
      : selected
        ? styles.selected
        : styles.idle;
  const textColor = shaking && !gone ? colors.errorInk : colors.ink;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => onPress(tile)}
        disabled={disabled || gone}
        accessibilityRole="button"
        accessibilityLabel={shown}
        accessibilityState={{ selected, disabled: disabled || gone }}
        style={[styles.tile, tone]}
      >
        <Text variant="bodyBold" color={textColor}>
          {shown}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    justifyContent: 'center',
  },
  idle: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  selected: {
    backgroundColor: colors.surface,
    borderColor: colors.ink,
  },
  error: {
    backgroundColor: colors.errorSoft,
    borderColor: colors.coral,
  },
  gone: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal,
  },
});
