import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import type { BuildSentenceItem } from '../store';

type BuildSentenceExerciseProps = {
  exercise: BuildSentenceItem;
  disabled?: boolean;
  onAnswerChange: (answer: string) => void;
};

type TileSlot = {
  key: string;
  label: string;
};

function toSlots(tiles: readonly string[]): TileSlot[] {
  return tiles.map((label, index) => ({ key: `${index}-${label}`, label }));
}

function joinAnswer(slots: readonly TileSlot[]): string {
  return slots.map((slot) => slot.label).join(' ');
}

export function BuildSentenceExercise({
  exercise,
  disabled = false,
  onAnswerChange,
}: BuildSentenceExerciseProps) {
  const [bank, setBank] = useState(() => toSlots(exercise.tiles));
  const [selected, setSelected] = useState<TileSlot[]>([]);

  const pick = (slot: TileSlot) => {
    if (disabled) return;
    const nextSelected = [...selected, slot];
    setBank((prev) => prev.filter((item) => item.key !== slot.key));
    setSelected(nextSelected);
    onAnswerChange(joinAnswer(nextSelected));
  };

  const unpick = (slot: TileSlot) => {
    if (disabled) return;
    const nextSelected = selected.filter((item) => item.key !== slot.key);
    setSelected(nextSelected);
    setBank((prev) => [...prev, slot]);
    onAnswerChange(joinAnswer(nextSelected));
  };

  return (
    <View style={styles.root}>
      <Text variant="caption" color={colors.inkMuted}>
        {exercise.prompt_ru}
      </Text>

      <View style={styles.answerWell} accessibilityLabel="Собранный ответ">
        {selected.length === 0 ? (
          <Text variant="body" color={colors.inkDisabled}>
            —
          </Text>
        ) : (
          <View style={styles.row}>
            {selected.map((slot) => (
              <Chip
                key={slot.key}
                label={slot.label}
                disabled={disabled}
                onPress={() => unpick(slot)}
                accessibilityRole="button"
                style={styles.chip}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.row}>
        {bank.map((slot) => (
          <Chip
            key={slot.key}
            label={slot.label}
            disabled={disabled}
            onPress={() => pick(slot)}
            accessibilityRole="button"
            style={styles.chip}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.lg,
  },
  answerWell: {
    minHeight: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    marginBottom: space.xs,
  },
});
