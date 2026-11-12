import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { Botas } from '@/components/hero/Botas';
import { colors, radius, space } from '@/theme/tokens';

import { WALK_MS } from '../layout';

const HERO_WIDTH = 76;
const HERO_HEIGHT = 92;

type MapHeroProps = {
  x: number;
  y: number;
  line: string;
  reduceMotion: boolean;
  jumpToken: number;
};

export function MapHero({ x, y, line, reduceMotion, jumpToken }: MapHeroProps) {
  const left = useSharedValue(x - HERO_WIDTH / 2);
  const top = useSharedValue(y - HERO_HEIGHT - 6);
  const tilt = useSharedValue(0.5);
  const lift = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    if (reduceMotion) {
      tilt.value = 0.5;
      return;
    }
    tilt.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [reduceMotion, tilt]);

  useEffect(() => {
    const nextLeft = x - HERO_WIDTH / 2;
    const nextTop = y - HERO_HEIGHT - 6;
    if (!placed.current || reduceMotion) {
      left.value = nextLeft;
      top.value = nextTop;
      placed.current = true;
      return;
    }
    left.value = withTiming(nextLeft, { duration: WALK_MS });
    top.value = withTiming(nextTop, { duration: WALK_MS });
  }, [left, reduceMotion, top, x, y]);

  useEffect(() => {
    if (jumpToken === 0 || reduceMotion) return;
    lift.value = withSequence(withTiming(-18, { duration: 180 }), withTiming(0, { duration: 220 }));
  }, [jumpToken, lift, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: left.value },
      { translateY: top.value + lift.value },
      { rotate: `${(tilt.value - 0.5) * 8}deg` },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.hero, style]}>
      <View style={styles.bubble}>
        <Text variant="caption">{line}</Text>
      </View>
      <Botas />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: 'absolute',
    zIndex: 3,
    width: HERO_WIDTH,
    alignItems: 'center',
  },
  bubble: {
    position: 'absolute',
    top: -34,
    left: -28,
    width: 132,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
