import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { Text } from '@/components/Text';
import { displayText } from '@/features/content/displayText';
import { AccentBar } from '@/features/lesson/components/AccentBar';
import {
  AnswerTextField,
  type AnswerTextFieldHandle,
} from '@/features/lesson/components/AnswerTextField';
import { colors, space } from '@/theme/tokens';

import type { TestAnswerValue, TestQuestion } from '../testMode';
import { TestPairs } from './TestPairs';

type TestQuestionViewProps = {
  question: TestQuestion;
  answer: TestAnswerValue | undefined;
  onAnswer: (value: TestAnswerValue) => void;
};

export function TestQuestionView({ question, answer, onAnswer }: TestQuestionViewProps) {
  const { t } = useTranslation();

  if (question.kind === 'pairs') {
    const matched = answer?.kind === 'pairs' ? answer.matched : {};
    return (
      <View style={styles.root}>
        <Text variant="caption" color={colors.inkMuted}>
          {t('study.test.promptPairs')}
        </Text>
        <TestPairs
          question={question}
          matched={matched}
          onChange={(next) => onAnswer({ kind: 'pairs', matched: next })}
        />
      </View>
    );
  }

  if (question.kind === 'true_false') {
    const picked = answer?.kind === 'bool' ? answer.value : null;
    return (
      <View style={styles.root}>
        <Text variant="caption" color={colors.inkMuted}>
          {t('study.test.promptBool')}
        </Text>
        <Text variant="h2">{displayText(question.prompt)}</Text>
        <Text variant="body">{t('study.test.claim', { claim: displayText(question.claim) })}</Text>
        <View style={styles.options}>
          <BoolChip
            label={t('study.test.true')}
            selected={picked === true}
            onPress={() => onAnswer({ kind: 'bool', value: true })}
          />
          <BoolChip
            label={t('study.test.false')}
            selected={picked === false}
            onPress={() => onAnswer({ kind: 'bool', value: false })}
          />
        </View>
      </View>
    );
  }

  const text = answer?.kind === 'text' ? answer.value : '';
  if (question.kind === 'choice') {
    return (
      <View style={styles.root}>
        <Text variant="caption" color={colors.inkMuted}>
          {t('study.test.promptChoice')}
        </Text>
        <Text variant="h2">{displayText(question.prompt)}</Text>
        <View style={styles.options}>
          {question.options.map((option) => (
            <Chip
              key={option}
              label={displayText(option)}
              selected={text === option}
              onPress={() => onAnswer({ kind: 'text', value: option })}
              style={styles.chip}
            />
          ))}
        </View>
      </View>
    );
  }

  return <TestInput question={question} value={text} onAnswer={onAnswer} />;
}

function TestInput({
  question,
  value,
  onAnswer,
}: {
  question: Extract<TestQuestion, { kind: 'input' }>;
  value: string;
  onAnswer: (value: TestAnswerValue) => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<AnswerTextFieldHandle>(null);
  const spanish = question.direction === 'ru_to_es';

  return (
    <View style={styles.root}>
      <Text variant="caption" color={colors.inkMuted}>
        {t('study.test.promptInput')}
      </Text>
      <Text variant="h2">{displayText(question.prompt)}</Text>
      <AnswerTextField
        ref={inputRef}
        value={value}
        onChangeText={(next) => onAnswer({ kind: 'text', value: next })}
        accessibilityLabel={t('study.test.answer')}
      />
      {spanish ? <AccentBar onInsert={(symbol) => inputRef.current?.insertSymbol(symbol)} /> : null}
    </View>
  );
}

function BoolChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return <Chip label={label} selected={selected} onPress={onPress} style={styles.chip} />;
}

const styles = StyleSheet.create({
  root: {
    gap: space.md,
  },
  options: {
    gap: space.sm,
  },
  chip: {
    alignSelf: 'stretch',
  },
});
