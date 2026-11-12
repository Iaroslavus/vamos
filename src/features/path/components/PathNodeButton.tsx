import * as Haptics from 'expo-haptics';
import { Check, Play, Star } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, depth, motion, space } from '@/theme/tokens';

import { nodeSize } from '../layout';
import type { PathNode, PathNodeStatus } from '../map';

const LABEL_WIDTH = 116;
const ICON_STROKE = 2.2;

type PathNodeButtonProps = {
  node: PathNode;
  title: string;
  x: number;
  y: number;
  selected: boolean;
  onPress: () => void;
};

export function PathNodeButton({ node, title, x, y, selected, onPress }: PathNodeButtonProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(1);
  const size = nodeSize(node.status);
  const palette = facePalette(node.status, selected);
  const current = node.status === 'current';

  useEffect(() => {
    if (!current || reduceMotion) {
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
  }, [current, pulse, reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  return (
    <View
      style={[styles.slot, { left: x - LABEL_WIDTH / 2, top: y - size / 2, width: LABEL_WIDTH }]}
    >
      {current ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              width: size + 16,
              height: size + 16,
              borderRadius: (size + 16) / 2,
              left: (LABEL_WIDTH - (size + 16)) / 2,
            },
            reduceMotion ? styles.ringStill : ringStyle,
          ]}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('path.nodeLabel', {
          title,
          status: t(`path.status.${node.status}`),
        })}
        accessibilityState={{ selected }}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [
          styles.node,
          { width: size, height: size + depth.node },
          pressed ? styles.pressed : null,
        ]}
      >
        <View
          style={[
            styles.sole,
            {
              backgroundColor: palette.sole,
              height: size,
              borderRadius: size / 2,
              borderColor: palette.border,
              borderWidth: palette.borderWidth,
            },
          ]}
        />
        <View
          style={[
            styles.face,
            {
              backgroundColor: palette.face,
              height: size,
              borderRadius: size / 2,
              borderColor: palette.border,
              borderWidth: palette.borderWidth,
            },
          ]}
        >
          <NodeIcon status={node.status} color={palette.icon} />
        </View>
      </Pressable>
      <Text variant="caption" numberOfLines={2} style={styles.label}>
        {title}
      </Text>
    </View>
  );
}

function NodeIcon({ status, color }: { status: PathNodeStatus; color: string }) {
  if (status === 'done') return <Check color={color} size={28} strokeWidth={ICON_STROKE} />;
  if (status === 'current') return <Star color={color} size={28} strokeWidth={ICON_STROKE} />;
  if (status === 'open') return <Play color={color} size={24} strokeWidth={ICON_STROKE} />;
  return <ChestIcon />;
}

function ChestIcon() {
  return (
    <Svg width={32} height={26} viewBox="0 0 32 26">
      <Rect x={2} y={8} width={28} height={15} rx={3} fill={colors.saffronDeep} />
      <Path d="M3 10h26c0-6-6-8-13-8S3 4 3 10z" fill={colors.inkOnDark} />
      <Rect x={14} y={12} width={4} height={6} rx={1} fill={colors.ink} />
    </Svg>
  );
}

function facePalette(status: PathNodeStatus, selected: boolean) {
  if (status === 'done') {
    return {
      face: colors.teal,
      sole: colors.tealDeep,
      icon: colors.inkOnDark,
      border: colors.teal,
      borderWidth: 0,
    };
  }
  if (status === 'current') {
    return {
      face: colors.coral,
      sole: colors.coralDeep,
      icon: colors.inkOnDark,
      border: colors.coral,
      borderWidth: 0,
    };
  }
  if (status === 'chest') {
    return {
      face: colors.saffron,
      sole: colors.saffronDeep,
      icon: colors.ink,
      border: colors.saffronDeep,
      borderWidth: 0,
    };
  }
  return {
    face: colors.surface,
    sole: colors.borderStrong,
    icon: colors.coral,
    border: selected ? colors.coral : colors.borderStrong,
    borderWidth: 2,
  };
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 2,
  },
  ring: {
    position: 'absolute',
    top: -8,
    borderWidth: 3,
    borderColor: colors.coral,
  },
  ringStill: {
    opacity: 0.45,
  },
  node: {
    alignItems: 'center',
  },
  sole: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  face: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ translateY: depth.node }],
  },
  label: {
    marginTop: space.xs,
    textAlign: 'center',
    color: colors.ink,
  },
});
