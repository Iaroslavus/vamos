import { Turtle, Volume2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip, type ChipTone } from '@/components/Chip';
import { Text } from '@/components/Text';
import { Appear } from '@/features/auth/components/Appear';
import { useAudioPreference } from '@/features/audio/preference';
import {
  NORMAL_RATE,
  SLOW_RATE,
  playLessonAudio,
  stopLessonAudio,
} from '@/features/audio/playback';
import { selectClip, speechLocale, type AudioPreference } from '@/features/audio/select';
import { displayText } from '@/features/content/displayText';
import { getItem } from '@/features/content/loader';
import { motion, space } from '@/theme/tokens';

import type { GradeStatus } from '../grading';
import type { ListenSelectItem } from '../store';
import { ListenRoundButton } from './ListenRoundButton';

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
  const { t } = useTranslation();
  const revealed = Boolean(gradeStatus);
  const preference = useAudioPreference();
  const clips = clipsFor(exercise, preference);

  useEffect(() => {
    if (disabled) return undefined;
    void playLessonAudio({
      audio: clips.normal,
      text: exercise.speakText,
      rate: NORMAL_RATE,
      language: speechLocale(preference),
    });
    return () => {
      void stopLessonAudio();
    };
  }, [clips.normal, disabled, exercise.id, exercise.speakText, preference]);

  const play = (rate: number) => {
    if (disabled) return;
    const slow = rate < 1;
    void playLessonAudio({
      audio: slow ? (clips.slow ?? null) : (clips.normal ?? null),
      text: exercise.speakText,
      rate,
      language: speechLocale(preference),
    });
  };

  return (
    <View style={styles.root}>
      <Text variant="h2">{exercise.prompt_ru}</Text>

      <View style={styles.controls}>
        <ListenRoundButton
          label={t('lesson.playAudio')}
          Icon={Volume2}
          size="large"
          tone="primary"
          disabled={disabled}
          onPress={() => play(NORMAL_RATE)}
          testID="listen-play"
        />
        <ListenRoundButton
          label={t('lesson.playSlow')}
          Icon={Turtle}
          size="small"
          tone="secondary"
          disabled={disabled}
          onPress={() => play(SLOW_RATE)}
          testID="listen-slow"
        />
      </View>

      <View style={styles.options}>
        {exercise.options.map((option, index) => {
          const isSelected = selected === option;
          return (
            <Appear key={option} delay={index * motion.stagger} style={styles.option}>
              <Chip
                label={displayText(option)}
                fill
                selected={isSelected && !revealed}
                tone={optionTone(option, selected, gradeStatus, exercise.answer)}
                disabled={disabled}
                onPress={() => onSelect(isSelected ? '' : option)}
                accessibilityState={{ selected: isSelected, disabled }}
              />
            </Appear>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.lg,
    width: '100%',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.xl,
  },
  options: {
    width: '100%',
    gap: space.sm,
  },
  option: {
    width: '100%',
  },
});
