import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, radius, space } from '@/theme/tokens';

import { useMatchPairs, type MatchPairsOutcome, type MatchTileTone } from '../hooks/useMatchPairs';
import { shuffleInPlace } from '../pairs';
import type { MatchPairsItem } from '../store';

type MatchPairsExerciseProps = {
  exercise: MatchPairsItem;
  disabled?: boolean;
  onSolved: (outcome: MatchPairsOutcome) => void;
};

function PairTile({
  label,
  tone,
  disabled,
  onPress,
}: {
  label: string;
  tone: MatchTileTone;
  disabled: boolean;
  onPress: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      shakeX.value = 0;
      return;
    }

    if (tone === 'success') {
      const half = Math.round(motion.pop.duration / 2);
      scale.value = withSequence(
        withTiming(motion.pop.from, { duration: 0 }),
        withTiming(motion.pop.overshoot, { duration: half }),
        withTiming(1, { duration: half }),
      );
    }

    if (tone === 'error') {
      const step = motion.shake.duration;
      const distance = motion.shake.distance;
      shakeX.value = withSequence(
        withTiming(-distance, { duration: step }),
        withTiming(distance, { duration: step }),
        withTiming(-distance, { duration: step }),
        withTiming(distance, { duration: step }),
        withTiming(0, { duration: step }),
      );
    }
  }, [reduceMotion, scale, shakeX, tone]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { scale: scale.value }],
  }));

  let backgroundColor: string = colors.surface;
  let borderColor: string = colors.borderStrong;
  let textColor: string = colors.ink;

  if (tone === 'success') {
    backgroundColor = colors.tealSoft;
    borderColor = colors.teal;
    textColor = colors.teal;
  } else if (tone === 'error') {
    backgroundColor = colors.errorSoft;
    borderColor = colors.coral;
    textColor = colors.errorInk;
  } else if (tone === 'selected') {
    backgroundColor = colors.surface;
    borderColor = colors.ink;
    textColor = colors.ink;
  }

  const locked = tone === 'success';

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled || locked}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{
          selected: tone === 'selected' || locked,
          disabled: disabled || locked,
        }}
        style={[styles.tile, { backgroundColor, borderColor }]}
      >
        <Text variant="bodyBold" color={textColor}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function MatchPairsExercise({
  exercise,
  disabled = false,
  onSolved,
}: MatchPairsExerciseProps) {
  const [leftItems] = useState(() => shuffleInPlace(exercise.pairs.map((pair) => pair.left)));
  const [rightItems] = useState(() => shuffleInPlace(exercise.pairs.map((pair) => pair.right)));
  const { toneFor, select } = useMatchPairs(exercise, disabled, onSolved);

  return (
    <View style={styles.root}>
      <Text variant="caption" color={colors.inkMuted}>
        {exercise.prompt_ru}
      </Text>

      <View style={styles.columns}>
        <View style={styles.column}>
          {leftItems.map((label) => (
            <PairTile
              key={`L-${label}`}
              label={label}
              tone={toneFor('left', label)}
              disabled={disabled}
              onPress={() => select('left', label)}
            />
          ))}
        </View>
        <View style={styles.column}>
          {rightItems.map((label) => (
            <PairTile
              key={`R-${label}`}
              label={label}
              tone={toneFor('right', label)}
              disabled={disabled}
              onPress={() => select('right', label)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.lg,
  },
  columns: {
    flexDirection: 'row',
    gap: space.md,
  },
  column: {
    flex: 1,
    gap: space.sm,
  },
  tile: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    justifyContent: 'center',
  },
});
