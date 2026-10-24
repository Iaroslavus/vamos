import { Check, Lock, MessageCircle } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import type { SceneStatus, StepStatus } from '@/features/topics/catalog';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, radius } from '@/theme/tokens';

const ICON_STROKE = 2.2;
const MARK = 40;

type TopicStepMarkProps = {
  status: StepStatus | SceneStatus;
  index?: number;
};

export function TopicStepMark({ status, index }: TopicStepMarkProps) {
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (status !== 'current' || reduceMotion) {
      pulse.value = 1;
      return;
    }

    pulse.value = withRepeat(
      withTiming(1.18, {
        duration: motion.pulse.period / 2,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [pulse, reduceMotion, status]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  const palette = markPalette(status);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.wrap}
    >
      {status === 'current' ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, reduceMotion ? styles.ringStatic : ringStyle]}
        />
      ) : null}
      <View style={[styles.face, { backgroundColor: palette.face }]}>
        {status === 'completed' ? (
          <Check color={palette.icon} size={20} strokeWidth={ICON_STROKE} />
        ) : null}
        {status === 'locked' ? (
          <Lock color={palette.icon} size={18} strokeWidth={ICON_STROKE} />
        ) : null}
        {status === 'ready' ? (
          <MessageCircle color={palette.icon} size={18} strokeWidth={ICON_STROKE} />
        ) : null}
        {status === 'current' ? (
          <Text variant="bodyBold" color={palette.icon}>
            {index == null ? '' : index + 1}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function markPalette(status: StepStatus | SceneStatus) {
  if (status === 'completed') return { face: colors.teal, icon: colors.inkOnDark };
  if (status === 'current') return { face: colors.coral, icon: colors.inkOnDark };
  if (status === 'ready') return { face: colors.saffronSoft, icon: colors.ink };
  return { face: colors.surfaceSunken, icon: colors.inkDisabled };
}

const styles = StyleSheet.create({
  wrap: {
    width: MARK + 12,
    height: MARK + 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: MARK + 10,
    height: MARK + 10,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.coral,
  },
  ringStatic: {
    opacity: 0.45,
  },
  face: {
    width: MARK,
    height: MARK,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
