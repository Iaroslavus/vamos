import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip, type ChipTone } from '@/components/Chip';
import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import type { GradeStatus } from '../grading';
import type { BuildSentenceItem } from '../store';

type BuildSentenceExerciseProps = {
  exercise: BuildSentenceItem;
  disabled?: boolean;
  gradeStatus?: GradeStatus | null;
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

function resultTone(gradeStatus: GradeStatus | null | undefined): ChipTone {
  if (!gradeStatus) return 'neutral';
  if (gradeStatus === 'wrong') return 'error';
  return 'success';
}

export function BuildSentenceExercise({
  exercise,
  disabled = false,
  gradeStatus = null,
  onAnswerChange,
}: BuildSentenceExerciseProps) {
  const { t } = useTranslation();
  const [bank, setBank] = useState(() => toSlots(exercise.tiles));
  const [selected, setSelected] = useState<TileSlot[]>([]);
  const revealed = Boolean(gradeStatus);
  const tone = resultTone(gradeStatus);

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

      <View style={styles.answerWell} accessibilityLabel={t('lesson.builtAnswer')}>
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
                selected={!revealed}
                tone={tone}
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
