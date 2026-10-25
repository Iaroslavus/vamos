import { Mic, Square } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, depth, motion } from '@/theme/tokens';

const SIZE = 84;
const ICON_STROKE = 2.2;

type MicButtonProps = {
  listening: boolean;
  disabled: boolean;
  accessibilityLabel: string;
  onPress: () => void;
};

export function MicButton({ listening, disabled, accessibilityLabel, onPress }: MicButtonProps) {
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(1);
  const showPulse = !disabled;

  useEffect(() => {
    if (!showPulse || reduceMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withTiming(listening ? 1.16 : 1.08, {
        duration: motion.pulse.period / 2,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [listening, pulse, reduceMotion, showPulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  const Icon = listening ? Square : Mic;
  const iconColor = disabled ? colors.inkDisabled : colors.inkOnDark;

  return (
    <View style={styles.wrap}>
      {showPulse ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, reduceMotion ? styles.ringStill : ringStyle]}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          styles.sole,
          { backgroundColor: disabled ? colors.borderStrong : colors.coralDeep },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled, busy: listening }}
        disabled={disabled}
        onPress={onPress}
        style={[styles.face, { backgroundColor: disabled ? colors.surfaceSunken : colors.coral }]}
      >
        <Icon size={32} color={iconColor} strokeWidth={ICON_STROKE} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE + 28,
    height: SIZE + 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: SIZE + 18,
    height: SIZE + 18,
    borderRadius: (SIZE + 18) / 2,
    borderWidth: 3,
    borderColor: colors.coral,
  },
  ringStill: {
    opacity: 0.45,
  },
  sole: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    transform: [{ translateY: depth.button }],
  },
  face: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
