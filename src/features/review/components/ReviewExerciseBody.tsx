import type { Ref } from 'react';

import type { AnswerTextFieldHandle } from '@/features/lesson/components/AnswerTextField';
import { ListenSelectExercise } from '@/features/lesson/components/ListenSelectExercise';
import { SelectTranslationExercise } from '@/features/lesson/components/SelectTranslationExercise';
import { TypeTranslationExercise } from '@/features/lesson/components/TypeTranslationExercise';
import type { GradeStatus } from '@/features/lesson/grading';
import type { LessonExerciseItem } from '@/features/lesson/store';

type ReviewExerciseBodyProps = {
  exercise: LessonExerciseItem;
  userAnswer: string;
  disabled: boolean;
  gradeStatus: GradeStatus | null;
  onSelect: (value: string) => void;
  onType: (value: string) => void;
  inputRef: Ref<AnswerTextFieldHandle>;
};

/** The three exercise types a quick review session can deal. */
export function ReviewExerciseBody({
  exercise,
  userAnswer,
  disabled,
  gradeStatus,
  onSelect,
  onType,
  inputRef,
}: ReviewExerciseBodyProps) {
  if (exercise.type === 'select_translation') {
    return (
      <SelectTranslationExercise
        exercise={exercise}
        selected={userAnswer}
        disabled={disabled}
        gradeStatus={gradeStatus}
        onSelect={onSelect}
      />
    );
  }

  if (exercise.type === 'listen_select') {
    return (
      <ListenSelectExercise
        exercise={exercise}
        selected={userAnswer}
        disabled={disabled}
        gradeStatus={gradeStatus}
        onSelect={onSelect}
      />
    );
  }

  if (exercise.type === 'type_translation') {
    return (
      <TypeTranslationExercise
        key={exercise.id}
        exercise={exercise}
        value={userAnswer}
        disabled={disabled}
        onChangeText={onType}
        inputRef={inputRef}
      />
    );
  }

  return null;
}
