import { StyleSheet, View } from 'react-native';

import { Chip, type ChipTone } from '@/components/Chip';
import { Text } from '@/components/Text';
import { AudioControls } from '@/features/audio/AudioControls';
import { useAudioPreference } from '@/features/audio/preference';
import { selectClip, type AudioPreference } from '@/features/audio/select';
import { getItem } from '@/features/content/loader';
import { colors, space } from '@/theme/tokens';

import type { GradeStatus } from '../grading';
import type { ListenSelectItem } from '../store';

type ListenSelectExerciseProps = {
  exercise: ListenSelectItem;
  selected: string;
  disabled?: boolean;
  gradeStatus?: GradeStatus | null;
  onSelect: (option: string) => void;
};

function clipsFor(
  exercise: ListenSelectItem,
  preference: AudioPreference,
): { normal: string | null; slow: string | null } {
  if (exercise.itemId) {
    try {
      const audio = getItem(exercise.itemId).audio;
      return {
        normal: selectClip(audio, preference, 'normal') ?? exercise.audio ?? null,
        slow: selectClip(audio, preference, 'slow') ?? exercise.slowAudio ?? null,
      };
    } catch {
      // Unknown id: use the paths stored on the exercise.
    }
  }
  return {
    normal: exercise.audio ?? null,
    slow: exercise.slowAudio ?? null,
  };
}

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

export function ListenSelectExercise({
  exercise,
  selected,
  disabled = false,
  gradeStatus = null,
  onSelect,
}: ListenSelectExerciseProps) {
  const revealed = Boolean(gradeStatus);
  const preference = useAudioPreference();
  const clips = clipsFor(exercise, preference);

  return (
    <View style={styles.root}>
      <Text variant="caption" color={colors.inkMuted}>
        {exercise.prompt_ru}
      </Text>

      <AudioControls
        text={exercise.speakText}
        audio={clips.normal}
        slowAudio={clips.slow}
        disabled={disabled}
      />

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
