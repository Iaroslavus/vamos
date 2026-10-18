import { Check, Lock } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, depth, motion, radius, space } from '@/theme/tokens';

import type { PathNode } from '../curriculum';

type PathNodeViewProps = {
  node: PathNode;
  onPress: () => void;
};

const NODE_SIZE = 64;

export function PathNodeView({ node, onPress }: PathNodeViewProps) {
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(1);
  const { status, lesson, side } = node;
  const interactive = status === 'current' || status === 'completed';

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

  let face: string = colors.surfaceSunken;
  let sole: string = colors.borderStrong;
  let iconColor: string = colors.inkDisabled;

  if (status === 'completed') {
    face = colors.teal;
    sole = colors.tealDeep;
    iconColor = colors.inkOnDark;
  } else if (status === 'current') {
    face = colors.coral;
    sole = colors.coralDeep;
    iconColor = colors.inkOnDark;
  }

  return (
    <View
      style={[styles.row, side === 'left' ? styles.alignLeft : styles.alignRight]}
      accessibilityElementsHidden={false}
    >
      <View style={styles.nodeWrap}>
        {status === 'current' && !reduceMotion ? (
          <Animated.View style={[styles.ring, ringStyle]} pointerEvents="none" />
        ) : null}
        {status === 'current' && reduceMotion ? (
          <View style={[styles.ring, styles.ringStatic]} pointerEvents="none" />
        ) : null}

        <Pressable
          onPress={onPress}
          disabled={!interactive}
          accessibilityRole="button"
          accessibilityState={{ disabled: !interactive }}
          accessibilityLabel={`${lesson.title_ru}, ${status}`}
          style={({ pressed }) => [
            styles.node,
            { backgroundColor: face, borderColor: sole },
            pressed && interactive && styles.pressed,
          ]}
        >
          <View style={[styles.sole, { backgroundColor: sole }]} />
          <View style={[styles.face, { backgroundColor: face }]}>
            {status === 'completed' ? (
              <Check size={28} color={iconColor} strokeWidth={2.6} />
            ) : null}
            {status === 'locked' ? <Lock size={22} color={iconColor} strokeWidth={2.2} /> : null}
            {status === 'current' ? (
              <Text variant="button" color={iconColor}>
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
        {lesson.title_ru}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: NODE_SIZE + depth.node + space.lg,
    marginVertical: space.md,
  },
  alignLeft: {
    justifyContent: 'flex-start',
    paddingLeft: '18%',
  },
  alignRight: {
    justifyContent: 'flex-end',
    paddingRight: '18%',
    flexDirection: 'row-reverse',
  },
  nodeWrap: {
    width: NODE_SIZE + 16,
    height: NODE_SIZE + 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: NODE_SIZE + 18,
    height: NODE_SIZE + 18,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.coral,
  },
  ringStatic: {
    opacity: 0.45,
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE + depth.node,
  },
  sole: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: NODE_SIZE,
    borderRadius: radius.pill,
  },
  face: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: NODE_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ translateY: depth.node }],
  },
  label: {
    flexShrink: 1,
    maxWidth: 120,
    marginHorizontal: space.md,
  },
  labelRight: {
    textAlign: 'left',
  },
  labelLeft: {
    textAlign: 'right',
  },
});
