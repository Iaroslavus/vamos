import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import type { TypeTranslationItem } from '../store';
import { AnswerTextField, type AnswerTextFieldHandle } from './AnswerTextField';

type TypeTranslationExerciseProps = {
  exercise: TypeTranslationItem;
  value: string;
  disabled?: boolean;
  onChangeText: (value: string) => void;
  inputRef?: Ref<AnswerTextFieldHandle>;
};

export function TypeTranslationExercise({
  exercise,
  value,
  disabled = false,
  onChangeText,
  inputRef,
}: TypeTranslationExerciseProps) {
  const { t } = useTranslation();
  const directionHint =
    exercise.direction === 'ru_to_es' ? t('lesson.directionRuToEs') : t('lesson.directionEsToRu');

  return (
    <View style={styles.root}>
      <Text variant="caption" color={colors.inkMuted}>
        {exercise.prompt_ru}
      </Text>
      <Text variant="caption" color={colors.inkMuted}>
        {directionHint}
      </Text>
      <Text variant="h2" style={styles.prompt}>
        {exercise.prompt}
      </Text>
      <AnswerTextField
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        disabled={disabled}
        autoFocus
        placeholder={t('lesson.typeAnswerPlaceholder')}
        accessibilityLabel={t('lesson.typeAnswerPlaceholder')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.md,
  },
  prompt: {
    marginBottom: space.sm,
  },
});
