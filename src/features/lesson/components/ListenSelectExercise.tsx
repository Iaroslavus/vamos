import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { Text } from '@/components/Text';
import { AudioControls } from '@/features/audio/AudioControls';
import { colors, space } from '@/theme/tokens';

import type { ListenSelectItem } from '../store';

type ListenSelectExerciseProps = {
  exercise: ListenSelectItem;
  selected: string;
  disabled?: boolean;
  onSelect: (option: string) => void;
};

export function ListenSelectExercise({
  exercise,
  selected,
  disabled = false,
  onSelect,
}: ListenSelectExerciseProps) {
  return (
    <View style={styles.root}>
      <Text variant="caption" color={colors.inkMuted}>
        {exercise.prompt_ru}
      </Text>

      <AudioControls text={exercise.speakText} audio={exercise.audio} disabled={disabled} />

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
    gap: space.lg,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    marginBottom: space.xs,
  },
});
