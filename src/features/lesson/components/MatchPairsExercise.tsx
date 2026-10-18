import * as Haptics from 'expo-haptics';
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
  onAnswerChange: (answer: string) => void;
};

type Side = 'left' | 'right';
type Feedback = 'idle' | 'match' | 'error';

function PairTile({
  label,
  selected,
  locked,
  feedback,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  locked: boolean;
  feedback: Feedback;
  disabled: boolean;
  onPress: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || feedback === 'idle') return;

    if (feedback === 'match') {
      scale.value = withSequence(
        withTiming(motion.pop.overshoot, { duration: motion.pop.duration / 2 }),
        withTiming(1, { duration: motion.pop.duration / 2 }),
      );
      return;
    }

    const d = motion.shake.distance;
    shakeX.value = withSequence(
      withTiming(-d, { duration: motion.shake.duration / 2 }),
      withTiming(d, { duration: motion.shake.duration / 2 }),
      withTiming(-d, { duration: motion.shake.duration / 2 }),
      withTiming(0, { duration: motion.shake.duration / 2 }),
    );
  }, [feedback, reduceMotion, scale, shakeX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { scale: scale.value }],
  }));

  let backgroundColor: string = colors.surface;
  let borderColor: string = colors.borderStrong;
  let textColor: string = colors.ink;

  if (locked || feedback === 'match') {
    backgroundColor = colors.tealSoft;
    borderColor = colors.teal;
    textColor = colors.teal;
  } else if (feedback === 'error') {
    backgroundColor = colors.errorSoft;
    borderColor = colors.coral;
    textColor = colors.errorInk;
  } else if (selected) {
    backgroundColor = colors.saffronSoft;
    borderColor = colors.saffron;
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled || locked}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled: disabled || locked }}
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
  onAnswerChange,
}: MatchPairsExerciseProps) {
  // Component is remounted with key={exercise.id}; shuffle once per mount.
  const [leftItems] = useState(() => shuffleInPlace(exercise.pairs.map((pair) => pair.left)));
  const [rightItems] = useState(() => shuffleInPlace(exercise.pairs.map((pair) => pair.right)));

  const [matched, setMatched] = useState<MatchPair[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ left?: string; right?: string; kind: Feedback } | null>(
    null,
  );

  const lockedLeft = new Set(matched.map((pair) => pair.left));
  const lockedRight = new Set(matched.map((pair) => pair.right));

  const tryMatch = (left: string | null, right: string | null) => {
    if (!left || !right) return;

    const expected = exercise.pairs.find((pair) => pair.left === left && pair.right === right);
    if (expected) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFlash({ left, right, kind: 'match' });
      const next = [...matched, expected];
      setMatched(next);
      setSelectedLeft(null);
      setSelectedRight(null);
      onAnswerChange(serializePairs(next));
      setTimeout(() => setFlash(null), 350);
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setFlash({ left, right, kind: 'error' });
    setTimeout(() => {
      setFlash(null);
      setSelectedLeft(null);
      setSelectedRight(null);
    }, 420);
  };

  const select = (side: Side, value: string) => {
    if (disabled) return;
    if (side === 'left' && lockedLeft.has(value)) return;
    if (side === 'right' && lockedRight.has(value)) return;

    if (side === 'left') {
      const nextLeft = selectedLeft === value ? null : value;
      setSelectedLeft(nextLeft);
      tryMatch(nextLeft, selectedRight);
      return;
    }

    const nextRight = selectedRight === value ? null : value;
    setSelectedRight(nextRight);
    tryMatch(selectedLeft, nextRight);
  };

  const tileFeedback = (side: Side, value: string): Feedback => {
    if (!flash) return 'idle';
    if (side === 'left' && flash.left === value) return flash.kind;
    if (side === 'right' && flash.right === value) return flash.kind;
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
              selected={selectedLeft === label}
              locked={lockedLeft.has(label)}
              feedback={tileFeedback('left', label)}
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
              selected={selectedRight === label}
              locked={lockedRight.has(label)}
              feedback={tileFeedback('right', label)}
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
