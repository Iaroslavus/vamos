import { StyleSheet, View } from 'react-native';

import { Chip, type ChipTone } from '@/components/Chip';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import type { GradeStatus } from '../grading';
import type { SelectTranslationItem } from '../store';

type SelectTranslationExerciseProps = {
  exercise: SelectTranslationItem;
  selected: string;
  disabled?: boolean;
  /** Present after «Проверить» — drives teal/coral option colors. */
  gradeStatus?: GradeStatus | null;
  onSelect: (option: string) => void;
};

function optionTone(
  option: string,
  selected: string,
  gradeStatus: GradeStatus | null | undefined,
  correctAnswer: string,
): ChipTone {
  if (!gradeStatus) return 'neutral';
  const isCorrectOption = option === correctAnswer;
  if (gradeStatus === 'correct' || gradeStatus === 'almost') {
    return option === selected ? 'success' : 'neutral';
  }
  if (option === selected) return 'error';
  if (isCorrectOption) return 'success';
  return 'neutral';
}

export function SelectTranslationExercise({
  exercise,
  selected,
  disabled = false,
  gradeStatus = null,
  onSelect,
}: SelectTranslationExerciseProps) {
  const revealed = Boolean(gradeStatus);

  return (
    <View style={styles.root}>
      <Text variant="caption" color={colors.inkMuted}>
        {exercise.prompt_ru}
      </Text>
      <Text variant="h2" style={styles.prompt}>
        {exercise.prompt}
      </Text>
      <View style={styles.options}>
        {exercise.options.map((option) => {
          const isSelected = selected === option;
          return (
            <Chip
              key={option}
              label={option}
              selected={isSelected && !revealed}
              tone={optionTone(option, selected, gradeStatus, exercise.answer)}
              disabled={disabled}
              onPress={() => onSelect(isSelected ? '' : option)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled }}
              style={styles.chip}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.md,
  },
  prompt: {
    marginTop: space.xs,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.lg,
  },
  chip: {
    marginBottom: space.xs,
  },
});
