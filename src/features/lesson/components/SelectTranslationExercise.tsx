import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import type { SelectTranslationItem } from '../store';

type SelectTranslationExerciseProps = {
  exercise: SelectTranslationItem;
  selected: string;
  disabled?: boolean;
  onSelect: (option: string) => void;
};

export function SelectTranslationExercise({
  exercise,
  selected,
  disabled = false,
  onSelect,
}: SelectTranslationExerciseProps) {
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
              used={!isSelected && selected.length > 0}
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
