import * as Haptics from 'expo-haptics';
import { Check, Lock } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion } from '@/theme/tokens';

import type { PathNode, PathNodeStatus } from '../curriculum';
import { pathNodeStyles as styles } from './pathNodeStyles';

type PathNodeViewProps = {
  node: PathNode;
  onPress: () => void;
};

const ICON_STROKE = 2.2;

export function PathNodeView({ node, onPress }: PathNodeViewProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(1);
  const { status, side } = node;
  const interactive = status !== 'locked';
  const title = t(node.lesson.titleKey);
  const accessibilityLabel = t('learn.nodeLabel', {
    title,
    status: t(`learn.status.${status}`),
  });

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

  const palette = facePalette(status);

  return (
    <View style={[styles.row, side === 'left' ? styles.alignLeft : styles.alignRight]}>
      <View style={styles.nodeWrap}>
        {status === 'current' ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.ring, reduceMotion ? styles.ringStatic : ringStyle]}
          />
        ) : null}
        <Pressable
          disabled={!interactive}
          accessibilityRole="button"
          accessibilityState={{ disabled: !interactive }}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={status === 'locked' ? t('learn.lockedHint') : undefined}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }}
          style={({ pressed }) => [
            styles.node,
            { backgroundColor: palette.face },
            pressed && interactive ? styles.pressed : null,
          ]}
        >
          <View style={[styles.sole, { backgroundColor: palette.sole }]} />
          <View style={[styles.face, { backgroundColor: palette.face }]}>
            {status === 'completed' ? (
              <Check size={28} color={palette.icon} strokeWidth={ICON_STROKE} />
            ) : null}
            {status === 'locked' ? (
              <Lock size={22} color={palette.icon} strokeWidth={ICON_STROKE} />
            ) : null}
            {status === 'current' ? (
              <Text variant="button" color={palette.icon}>
                {node.index + 1}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </View>
      <Text
        variant="caption"
        color={status === 'locked' ? colors.inkDisabled : colors.ink}
        style={[styles.label, side === 'left' ? styles.labelRight : styles.labelLeft]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </View>
  );
}

function facePalette(status: PathNodeStatus) {
  if (status === 'completed') {
    return { face: colors.teal, sole: colors.tealDeep, icon: colors.inkOnDark };
  }
  if (status === 'current') {
    return { face: colors.coral, sole: colors.coralDeep, icon: colors.inkOnDark };
  }
  return { face: colors.surfaceSunken, sole: colors.borderStrong, icon: colors.inkDisabled };
}
