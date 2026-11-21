import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { BOTAS_HEIGHT, BOTAS_WIDTH, Botas } from '@/components/hero/Botas';
import { colors, radius, space } from '@/theme/tokens';

import { WALK_MS, heroBox } from '../layout';

type MapHeroProps = {
  /** Centre of the node the hero stands next to. */
  x: number;
  y: number;
  /** Map width — the hero stands on the roomier side of the node. */
  width: number;
  line: string;
  reduceMotion: boolean;
  jumpToken: number;
};

export function MapHero({ x, y, width, line, reduceMotion, jumpToken }: MapHeroProps) {
  const box = heroBox(x, y, width);
  const left = useSharedValue(box.left);
  const top = useSharedValue(box.top);
  const bob = useSharedValue(0);
  const lift = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    if (reduceMotion) {
      bob.value = 0;
      return;
    }
    bob.value = withRepeat(
      withTiming(-4, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [bob, reduceMotion]);

  useEffect(() => {
    if (!placed.current || reduceMotion) {
      left.value = box.left;
      top.value = box.top;
      placed.current = true;
      return;
    }
    const easing = Easing.inOut(Easing.cubic);
    left.value = withTiming(box.left, { duration: WALK_MS, easing });
    top.value = withTiming(box.top, { duration: WALK_MS, easing });
  }, [box.left, box.top, left, reduceMotion, top]);

  useEffect(() => {
    if (jumpToken === 0 || reduceMotion) return;
    lift.value = withSequence(withTiming(-18, { duration: 180 }), withTiming(0, { duration: 220 }));
  }, [jumpToken, lift, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: left.value }, { translateY: top.value + lift.value }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));

  return (
    <Animated.View pointerEvents="none" style={[styles.hero, style]}>
      <View style={styles.bubble}>
        <Text variant="label" color={colors.inkOnDark} numberOfLines={1}>
          {line}
        </Text>
      </View>
      <Animated.View style={bodyStyle}>
        <Botas />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 3,
    width: BOTAS_WIDTH + 12,
    minHeight: BOTAS_HEIGHT + 28,
    alignItems: 'center',
    gap: 2,
  },
  bubble: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.sm - 2,
    backgroundColor: colors.ink,
  },
});
