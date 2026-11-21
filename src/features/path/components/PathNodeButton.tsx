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
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, depth, motion, radius, space } from '@/theme/tokens';

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
  const palette = facePalette(node.status);
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
        {selected ? (
          <View
            pointerEvents="none"
            style={[
              styles.selection,
              { width: size + 14, height: size + 14, borderRadius: (size + 14) / 2 },
            ]}
          />
        ) : null}
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
      <View style={[styles.pill, { backgroundColor: palette.pill }]}>
        <Text variant="label" numberOfLines={2} color={palette.pillText} style={styles.label}>
          {title}
        </Text>
      </View>
    </View>
  );
}

function NodeIcon({ status, color }: { status: PathNodeStatus; color: string }) {
  if (status === 'done') return <Check color={color} size={28} strokeWidth={3} />;
  if (status === 'current')
    return <Star color={color} fill={color} size={30} strokeWidth={ICON_STROKE} />;
  if (status === 'open')
    return <Play color={color} fill={color} size={22} strokeWidth={ICON_STROKE} />;
  return <ChestIcon />;
}

function ChestIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24">
      <Path d="M3 10a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v9H3z" fill={colors.hint} />
      <Path
        d="M3 10a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v9H3zM3 12h18M10 12v3h4v-3"
        stroke={colors.saffronDeep}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function facePalette(status: PathNodeStatus) {
  if (status === 'done') {
    return {
      face: colors.teal,
      sole: colors.tealDeep,
      icon: colors.inkOnDark,
      border: colors.teal,
      borderWidth: 0,
      pill: colors.surface,
      pillText: colors.tealDeep,
    };
  }
  if (status === 'current') {
    return {
      face: colors.coral,
      sole: colors.coralDeep,
      icon: colors.inkOnDark,
      border: colors.coral,
      borderWidth: 0,
      pill: colors.coral,
      pillText: colors.inkOnDark,
    };
  }
  if (status === 'chest') {
    return {
      face: colors.saffronSoft,
      sole: colors.saffron,
      icon: colors.saffronDeep,
      border: colors.saffronSoft,
      borderWidth: 0,
      pill: colors.surface,
      pillText: colors.saffronDeep,
    };
  }
  return {
    face: colors.surface,
    sole: colors.borderStrong,
    icon: colors.teal,
    border: colors.roadDone,
    borderWidth: 3,
    pill: colors.surface,
    pillText: colors.ink,
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
  selection: {
    position: 'absolute',
    top: -7,
    left: -7,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  pill: {
    marginTop: space.sm - 2,
    maxWidth: 112,
    paddingHorizontal: space.sm + 1,
    paddingVertical: 3,
    borderRadius: radius.sm - 2,
    shadowColor: colors.border,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  label: {
    textAlign: 'center',
    fontSize: 12,
    letterSpacing: 0,
  },
});
