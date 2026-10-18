import { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, depth, motion, radius, space, type } from '@/theme/tokens';

export type ChipTone = 'neutral' | 'success' | 'error';

export type ChipProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /** Empty / spent bank tile (sunken, not pressable). */
  used?: boolean;
  /** Neutral ink selection highlight before grading. */
  selected?: boolean;
  /** Post-check correctness colors (teal / coral). */
  tone?: ChipTone;
  style?: StyleProp<ViewStyle>;
};

type ChipPalette = {
  face: string;
  sole: string;
  border: string;
  label: string;
};

function paletteFor(used: boolean, selected: boolean, tone: ChipTone): ChipPalette {
  if (tone === 'success') {
    return {
      face: colors.tealSoft,
      sole: colors.tealDeep,
      border: colors.teal,
      label: colors.teal,
    };
  }
  if (tone === 'error') {
    return {
      face: colors.errorSoft,
      sole: colors.coralDeep,
      border: colors.coral,
      label: colors.errorInk,
    };
  }
  if (used) {
    return {
      face: colors.surfaceSunken,
      sole: colors.border,
      border: colors.border,
      label: colors.inkDisabled,
    };
  }
  if (selected) {
    return {
      face: colors.surface,
      sole: colors.ink,
      border: colors.ink,
      label: colors.ink,
    };
  }
  return {
    face: colors.surface,
    sole: colors.borderStrong,
    border: colors.borderStrong,
    label: colors.ink,
  };
}

export function Chip({
  label,
  used = false,
  selected = false,
  tone = 'neutral',
  disabled = false,
  onPress,
  style,
  ...rest
}: ChipProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const isDisabled = Boolean(disabled || used);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = withTiming(1, { duration: motion.press.duration });
      return;
    }
    opacity.value = withTiming(1, { duration: Math.round(motion.pop.duration / 2) });
  }, [opacity, reduceMotion]);

  useEffect(() => {
    if (!selected || reduceMotion || tone !== 'neutral') return;
    const half = Math.round(motion.pop.duration / 2);
    scale.value = withSequence(
      withTiming(motion.pop.from, { duration: 0 }),
      withTiming(motion.pop.overshoot, { duration: half }),
      withTiming(1, { duration: half }),
    );
  }, [reduceMotion, scale, selected, tone]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const palette = paletteFor(used, selected, tone);

  return (
    <Animated.View style={[styles.wrap, animatedStyle, style]}>
      <View style={[styles.sole, { backgroundColor: palette.sole, top: depth.chip }]} />
      <View
        style={[
          styles.face,
          {
            backgroundColor: palette.face,
            borderColor: palette.border,
            marginBottom: depth.chip,
          },
        ]}
      >
        <Pressable
          {...rest}
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled, selected }}
          disabled={isDisabled}
          onPress={isDisabled ? undefined : onPress}
          style={styles.pressable}
        >
          <Text style={[styles.label, { color: palette.label }]}>{label}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  sole: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.sm,
  },
  face: {
    borderRadius: radius.sm,
    borderWidth: 2,
    minHeight: 44,
  },
  pressable: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  label: {
    fontFamily: type.bodyBold.fontFamily,
    fontSize: type.bodyBold.fontSize,
    lineHeight: type.bodyBold.lineHeight,
    textAlign: 'center',
  },
});
