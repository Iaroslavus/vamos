import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts, space } from '@/theme/tokens';

import type { FillGapItem } from '../store';
import { AnswerTextField, type AnswerTextFieldHandle } from './AnswerTextField';

type FillGapExerciseProps = {
  exercise: FillGapItem;
  value: string;
  disabled?: boolean;
  onChangeText: (value: string) => void;
  inputRef?: Ref<AnswerTextFieldHandle>;
};

function renderSentence(sentence: string) {
  const parts = sentence.split('___');
  return (
    <Text variant="h3" style={styles.sentence}>
      {parts.map((part, index) => (
        <Text key={`${index}-${part}`} variant="h3">
          {part}
          {index < parts.length - 1 ? (
            <Text variant="h3" color={colors.coral} style={styles.gap}>
              {' ___ '}
            </Text>
          ) : null}
        </Text>
      ))}
    </Text>
  );
}

export function FillGapExercise({
  exercise,
  value,
  disabled = false,
  onChangeText,
  inputRef,
}: FillGapExerciseProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      <Text variant="caption" color={colors.inkMuted}>
        {exercise.prompt_ru}
      </Text>
      {renderSentence(exercise.sentence_es)}
      <AnswerTextField
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        disabled={disabled}
        autoFocus
        placeholder={t('lesson.fillGapPlaceholder')}
        accessibilityLabel={t('lesson.fillGapPlaceholder')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.lg,
  },
  sentence: {
    fontFamily: fonts.display,
  },
  gap: {
    letterSpacing: 1,
  },
});
