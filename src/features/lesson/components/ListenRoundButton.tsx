import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, depth, motion, space } from '@/theme/tokens';

type ListenRoundButtonProps = {
  label: string;
  Icon: LucideIcon;
  size: 'large' | 'small';
  tone: 'primary' | 'secondary';
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
};

const DIAMETER = { large: 128, small: 88 } as const;
const ICON = { large: 32, small: 20 } as const;

export function ListenRoundButton({
  label,
  Icon,
  size,
  tone,
  disabled = false,
  onPress,
  testID,
}: ListenRoundButtonProps) {
  const reduceMotion = useReduceMotion();
  const pressOffset = useSharedValue(0);
  const faceOpacity = useSharedValue(1);
  const diameter = DIAMETER[size];
  const soleHeight = depth.button;
  const primary = tone === 'primary';
  const palette = colorsFor(primary, disabled);

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressOffset.value }],
    opacity: faceOpacity.value,
  }));

  const animatePress = (pressed: boolean) => {
    if (disabled) return;

    if (reduceMotion) {
      // Reanimated shared values are written through `.value`.
      // eslint-disable-next-line react-hooks/immutability -- shared value write
      faceOpacity.value = withTiming(pressed ? 0.72 : 1, { duration: motion.press.duration });
      return;
    }

    // eslint-disable-next-line react-hooks/immutability -- shared value write
    pressOffset.value = withTiming(pressed ? soleHeight : 0, { duration: motion.press.duration });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      onPressIn={() => {
        animatePress(true);
        if (!disabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={() => animatePress(false)}
      style={styles.hit}
    >
      <View style={[styles.stack, { width: diameter, height: diameter + soleHeight }]}>
        <View
          pointerEvents="none"
          style={[
            styles.sole,
            {
              width: diameter,
              height: diameter,
              borderRadius: diameter / 2,
              backgroundColor: palette.sole,
              top: soleHeight,
            },
          ]}
        />
        <Animated.View
          testID={testID}
          style={[
            styles.face,
            faceStyle,
            {
              width: diameter,
              height: diameter,
              borderRadius: diameter / 2,
              backgroundColor: palette.face,
              borderColor: primary ? colors.blue : colors.borderStrong,
              borderWidth: primary ? 0 : 2,
            },
          ]}
        >
          <Icon size={ICON[size]} color={palette.icon} strokeWidth={2.2} />
          <Text
            variant={size === 'large' ? 'bodyBold' : 'caption'}
            color={palette.label}
            style={styles.label}
            accessible={false}
          >
            {label}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

function colorsFor(primary: boolean, disabled: boolean) {
  if (disabled) {
    return {
      face: colors.surfaceSunken,
      sole: colors.borderStrong,
      icon: colors.inkDisabled,
      label: colors.inkDisabled,
    };
  }
  if (primary) {
    return {
      face: colors.blue,
      sole: colors.ink,
      icon: colors.inkOnDark,
      label: colors.inkOnDark,
    };
  }
  return {
    face: colors.surface,
    sole: colors.borderStrong,
    icon: colors.ink,
    label: colors.ink,
  };
}

const styles = StyleSheet.create({
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: {
    position: 'relative',
  },
  sole: {
    position: 'absolute',
    left: 0,
  },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
  },
  label: {
    textAlign: 'center',
  },
});
