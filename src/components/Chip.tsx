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

export type ChipProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  used?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, used = false, onPress, style, ...rest }: ChipProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(reduceMotion ? 1 : motion.pop.from);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = withTiming(1, { duration: motion.press.duration });
      return;
    }

    const half = Math.round(motion.pop.duration / 2);

    opacity.value = withTiming(1, { duration: half });

    scale.value = withSequence(
      withTiming(motion.pop.overshoot, { duration: half }),
      withTiming(1, { duration: half }),
    );
  }, [opacity, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const faceColor = used ? colors.surfaceSunken : colors.surface;
  const soleColor = used ? colors.border : colors.borderStrong;
  const labelColor = used ? colors.inkDisabled : colors.ink;

  return (
    <Animated.View style={[styles.wrap, animatedStyle, style]}>
      <View style={[styles.sole, { backgroundColor: soleColor, top: depth.chip }]} />
      <View
        style={[
          styles.face,
          {
            backgroundColor: faceColor,
            borderColor: used ? colors.border : colors.borderStrong,
            marginBottom: depth.chip,
          },
        ]}
      >
        <Pressable
          {...rest}
          accessibilityRole="button"
          accessibilityState={{ disabled: used, selected: used }}
          disabled={used}
          onPress={used ? undefined : onPress}
          style={styles.pressable}
        >
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
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
