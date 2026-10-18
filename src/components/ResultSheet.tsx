import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, radius, space, type } from '@/theme/tokens';

export type ResultSheetVariant = 'success' | 'error';

export type ResultSheetProps = {
  visible: boolean;
  variant: ResultSheetVariant;
  title: string;
  message?: string;
  continueLabel?: string;
  onContinue: () => void;
  style?: StyleProp<ViewStyle>;
};

const SHEET_OFFSET = 420;

const variantTheme = {
  success: {
    accent: colors.teal,
    soft: colors.tealSoft,
    icon: '✓',
  },
  error: {
    accent: colors.coral,
    soft: colors.errorSoft,
    icon: '!',
  },
} as const;

export function ResultSheet({
  visible,
  variant,
  title,
  message,
  continueLabel = 'Дальше',
  onContinue,
  style,
}: ResultSheetProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const translateY = useSharedValue(SHEET_OFFSET);
  const sheetOpacity = useSharedValue(0);
  const iconScale = useSharedValue<number>(motion.pop.from);
  const titleShakeX = useSharedValue(0);

  const theme = variantTheme[variant];

  useEffect(() => {
    if (!visible) {
      translateY.value = SHEET_OFFSET;

      sheetOpacity.value = 0;

      iconScale.value = motion.pop.from;

      titleShakeX.value = 0;
      return;
    }

    if (variant === 'success') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    if (reduceMotion) {
      translateY.value = 0;

      sheetOpacity.value = withTiming(1, { duration: motion.press.duration });

      iconScale.value = 1;
      return;
    }

    sheetOpacity.value = withTiming(1, { duration: motion.press.duration });

    translateY.value = withSpring(0, motion.spring);

    const half = Math.round(motion.pop.duration / 2);

    iconScale.value = withSequence(
      withTiming(motion.pop.overshoot, { duration: half }),
      withTiming(1, { duration: half }),
    );

    if (variant === 'error') {
      const shakeStep = motion.shake.duration;
      const distance = motion.shake.distance;

      titleShakeX.value = withSequence(
        withTiming(-distance, { duration: shakeStep }),
        withTiming(distance, { duration: shakeStep }),
        withTiming(-distance, { duration: shakeStep }),
        withTiming(distance, { duration: shakeStep }),
        withTiming(0, { duration: shakeStep }),
      );
    }
  }, [iconScale, reduceMotion, sheetOpacity, titleShakeX, translateY, variant, visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: sheetOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: titleShakeX.value }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[styles.overlay, style]}>
      <Animated.View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          styles.sheet,
          sheetStyle,
          {
            paddingBottom: Math.max(insets.bottom, space.lg) + space.sm,
            borderTopColor: theme.accent,
          },
        ]}
      >
        <Animated.View style={[styles.iconWrap, iconStyle, { backgroundColor: theme.soft }]}>
          <Text style={[styles.icon, { color: theme.accent }]}>{theme.icon}</Text>
        </Animated.View>

        <Animated.Text style={[styles.title, titleStyle, { color: theme.accent }]}>
          {title}
        </Animated.Text>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Button
          title={continueLabel}
          variant={variant === 'success' ? 'success' : 'primary'}
          onPress={onContinue}
          style={styles.button}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 4,
    paddingHorizontal: space.xl,
    paddingTop: space.xxl,
    gap: space.md,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  icon: {
    fontFamily: type.h2.fontFamily,
    fontSize: 32,
    lineHeight: 36,
  },
  title: {
    fontFamily: type.h3.fontFamily,
    fontSize: type.h3.fontSize,
    lineHeight: type.h3.lineHeight,
    textAlign: 'center',
  },
  message: {
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  button: {
    marginTop: space.md,
  },
});
