import type { Ref } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { getItem } from '@/features/content/loader';
import { displayEs } from '@/features/content/displayText';
import { textOf, type ContentLocale } from '@/features/content/text';
import { showsSayRu } from '@/features/lesson/intro';
import { LessonExerciseBody } from '@/features/lesson/components/LessonExerciseBody';
import { SpeakRepeatStep } from '@/features/lesson/components/SpeakRepeatStep';
import type { GradeStatus } from '@/features/lesson/grading';
import type { LessonExerciseItem } from '@/features/lesson/store';
import type { AnswerTextFieldHandle } from '@/features/lesson/components/AnswerTextField';
import { space } from '@/theme/tokens';

import type { TopicTestTask } from '../assemble';

type TopicTestTaskViewProps = {
  task: TopicTestTask;
  exercise: LessonExerciseItem | null;
  answer: string;
  disabled: boolean;
  gradeStatus: GradeStatus | null;
  language: ContentLocale;
  onSelect: (value: string) => void;
  onAnswerChange: (value: string) => void;
  onSpeak: (passed: boolean) => void;
  inputRef: Ref<AnswerTextFieldHandle>;
};

export function TopicTestTaskView({
  task,
  exercise,
  answer,
  disabled,
  gradeStatus,
  language,
  onSelect,
  onAnswerChange,
  onSpeak,
  inputRef,
}: TopicTestTaskViewProps) {
  if (task.step.type === 'speak_repeat') {
    const item = itemOf(task.itemId);
    return (
      <SpeakRepeatStep
        promptEs={displayEs(task.step.prompt_es)}
        audio={task.step.audio}
        sayRu={item && showsSayRu(item.level) ? textOf(item.say, language) || null : null}
        parts={item?.parts.map((part) => ({ es: part.es, ru: textOf(part.tr, language) })) ?? []}
        confusables={item?.confusables ?? []}
        featuresPath={item?.audio.features ?? null}
        onSkip={() => onSpeak(false)}
        onContinue={(passed) => onSpeak(passed)}
      />
    );
  }

  if (!exercise) return null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <LessonExerciseBody
        exercise={exercise}
        userAnswer={answer}
        disabled={disabled}
        gradeStatus={gradeStatus}
        onSelect={onSelect}
        onAnswerChange={onAnswerChange}
        onMatchSolved={() => undefined}
        inputRef={inputRef}
      />
    </ScrollView>
  );
}

function itemOf(itemId: string) {
  try {
    return getItem(itemId);
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.lg,
  },
});
