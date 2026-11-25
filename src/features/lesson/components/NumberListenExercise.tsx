import { Volume2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { playLessonAudio, stopLessonAudio } from '@/features/audio/playback';
import { space } from '@/theme/tokens';

import type { NumberListenItem } from '../store';
import { AnswerTextField } from './AnswerTextField';
import { ListenRoundButton } from './ListenRoundButton';

type NumberListenExerciseProps = {
  exercise: NumberListenItem;
  value: string;
  disabled?: boolean;
  onChangeText: (value: string) => void;
};

/** Hear the Spanish number and type its digits. */
export function NumberListenExercise({
  exercise,
  value,
  disabled = false,
  onChangeText,
}: NumberListenExerciseProps) {
  const { t } = useTranslation();
  const spoken = exercise.phraseEs ?? '';

  useEffect(() => {
    if (!spoken) return;
    void playLessonAudio({ audio: exercise.audio, text: spoken });
    return () => {
      void stopLessonAudio();
    };
  }, [exercise.audio, exercise.id, spoken]);

  return (
    <View style={styles.root}>
      <Text variant="h2">{exercise.prompt_ru}</Text>
      <View style={styles.play}>
        <ListenRoundButton
          label={t('lesson.playAudio')}
          Icon={Volume2}
          size="large"
          tone="primary"
          disabled={disabled}
          onPress={() => {
            void playLessonAudio({ audio: exercise.audio, text: spoken });
          }}
        />
      </View>
      <AnswerTextField
        value={value}
        onChangeText={onChangeText}
        placeholder={t('lesson.typeAnswerPlaceholder')}
        disabled={disabled}
        accessibilityLabel={t('lesson.numberType')}
        keyboardType="number-pad"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.lg,
  },
  play: {
    alignItems: 'center',
    paddingVertical: space.md,
  },
});
