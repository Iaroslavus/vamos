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

import { serializePairs, shuffleInPlace } from '../pairs';
import type { MatchPair, MatchPairsItem } from '../store';

type MatchPairsExerciseProps = {
  exercise: MatchPairsItem;
  disabled?: boolean;
  /** After «Проверить» — show teal/coral per provisional pair. */
  revealResult?: boolean;
  onAnswerChange: (answer: string) => void;
};

type Side = 'left' | 'right';
type TileTone = 'idle' | 'selected' | 'success' | 'error';

function isExpectedPair(pairs: readonly MatchPair[], left: string, right: string): boolean {
  return pairs.some((pair) => pair.left === left && pair.right === right);
}

function PairTile({
  label,
  tone,
  disabled,
  onPress,
}: {
  label: string;
  tone: TileTone;
  disabled: boolean;
  onPress: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion || tone !== 'selected') return;
    const half = Math.round(motion.pop.duration / 2);
    scale.value = withSequence(
      withTiming(motion.pop.from, { duration: 0 }),
      withTiming(motion.pop.overshoot, { duration: half }),
      withTiming(1, { duration: half }),
    );
  }, [reduceMotion, scale, tone]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
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

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected: tone === 'selected', disabled }}
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
  revealResult = false,
  onAnswerChange,
}: MatchPairsExerciseProps) {
  // Component is remounted with key={exercise.id}; shuffle once per mount.
  const [leftItems] = useState(() => shuffleInPlace(exercise.pairs.map((pair) => pair.left)));
  const [rightItems] = useState(() => shuffleInPlace(exercise.pairs.map((pair) => pair.right)));

  const [paired, setPaired] = useState<MatchPair[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);

  const commitPair = (left: string, right: string) => {
    const next = [...paired, { left, right }];
    setPaired(next);
    setSelectedLeft(null);
    setSelectedRight(null);
    onAnswerChange(serializePairs(next));
  };

  const unpair = (pair: MatchPair) => {
    const next = paired.filter((item) => item.left !== pair.left || item.right !== pair.right);
    setPaired(next);
    setSelectedLeft(null);
    setSelectedRight(null);
    onAnswerChange(serializePairs(next));
  };

  const select = (side: Side, value: string) => {
    if (disabled) return;

    const existing =
      side === 'left'
        ? paired.find((pair) => pair.left === value)
        : paired.find((pair) => pair.right === value);

    if (existing) {
      unpair(existing);
      return;
    }

    if (side === 'left') {
      const nextLeft = selectedLeft === value ? null : value;
      setSelectedLeft(nextLeft);
      if (nextLeft && selectedRight) {
        commitPair(nextLeft, selectedRight);
      }
      return;
    }

    const nextRight = selectedRight === value ? null : value;
    setSelectedRight(nextRight);
    if (selectedLeft && nextRight) {
      commitPair(selectedLeft, nextRight);
    }
  };

  const tileTone = (side: Side, value: string): TileTone => {
    const pair =
      side === 'left'
        ? paired.find((item) => item.left === value)
        : paired.find((item) => item.right === value);

    if (pair && revealResult) {
      return isExpectedPair(exercise.pairs, pair.left, pair.right) ? 'success' : 'error';
    }

    if (pair) return 'selected';
    if (side === 'left' && selectedLeft === value) return 'selected';
    if (side === 'right' && selectedRight === value) return 'selected';
    return 'idle';
  };

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
              tone={tileTone('left', label)}
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
              tone={tileTone('right', label)}
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
