import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, depth, motion, radius, space, type } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'success';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

type VariantColors = {
  face: string;
  sole: string;
  label: string;
  border?: string;
};

const variantColors: Record<ButtonVariant, VariantColors> = {
  primary: {
    face: colors.coral,
    sole: colors.coralDeep,
    label: colors.inkOnDark,
  },
  secondary: {
    face: colors.surface,
    sole: colors.borderStrong,
    label: colors.ink,
    border: colors.borderStrong,
  },
  success: {
    face: colors.teal,
    sole: colors.tealDeep,
    label: colors.inkOnDark,
  },
};

const disabledColors: VariantColors = {
  face: colors.surfaceSunken,
  sole: colors.borderStrong,
  label: colors.inkDisabled,
};

export function Button({
  title,
  variant = 'primary',
  disabled = false,
  onPress,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: ButtonProps) {
  const reduceMotion = useReduceMotion();
  const pressOffset = useSharedValue(0);
  const faceOpacity = useSharedValue(1);

  const palette = disabled ? disabledColors : variantColors[variant];
  const soleHeight = depth.button;

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressOffset.value }],
    opacity: faceOpacity.value,
  }));

  const animatePress = (pressed: boolean) => {
    if (disabled) return;

    if (reduceMotion) {
      // Reanimated shared values are intentionally mutated via `.value`.
      // eslint-disable-next-line react-hooks/immutability -- shared value write
      faceOpacity.value = withTiming(pressed ? 0.72 : 1, {
        duration: motion.press.duration,
      });
      return;
    }

    // eslint-disable-next-line react-hooks/immutability -- shared value write
    pressOffset.value = withTiming(pressed ? soleHeight : 0, {
      duration: motion.press.duration,
    });
  };

  const handlePressIn: PressableProps['onPressIn'] = (event) => {
    animatePress(true);
    if (!disabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPressIn?.(event);
  };

  const handlePressOut: PressableProps['onPressOut'] = (event) => {
    animatePress(false);
    onPressOut?.(event);
  };

  return (
    <View style={[styles.wrap, style]} pointerEvents={disabled ? 'none' : 'auto'}>
      <View style={[styles.sole, { backgroundColor: palette.sole, top: soleHeight }]} />
      <Animated.View
        style={[
          styles.face,
          faceStyle,
          {
            backgroundColor: palette.face,
            borderColor: palette.border ?? 'transparent',
            borderWidth: palette.border ? 2 : 0,
            marginBottom: soleHeight,
          },
        ]}
      >
        <Pressable
          {...rest}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={disabled ? undefined : onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.pressable}
        >
          <Text style={[styles.label, { color: palette.label }]}>{title}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  sole: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.md,
  },
  face: {
    borderRadius: radius.md,
    minHeight: 44,
  },
  pressable: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  label: {
    fontFamily: type.button.fontFamily,
    fontSize: type.button.fontSize,
    textAlign: 'center',
  },
});
