import type { Ref } from 'react';

import type { GradeStatus } from '../grading';
import type { MatchPairsOutcome } from '../hooks/useMatchPairs';
import type { LessonExerciseItem } from '../store';
import type { AnswerTextFieldHandle } from './AnswerTextField';
import { BuildSentenceExercise } from './BuildSentenceExercise';
import { FillGapExercise } from './FillGapExercise';
import { ListenSelectExercise } from './ListenSelectExercise';
import { MatchPairsExercise } from './MatchPairsExercise';
import { SelectTranslationExercise } from './SelectTranslationExercise';
import { TypeTranslationExercise } from './TypeTranslationExercise';

type LessonExerciseBodyProps = {
  exercise: LessonExerciseItem;
  userAnswer: string;
  disabled: boolean;
  gradeStatus: GradeStatus | null;
  onSelect: (value: string) => void;
  onAnswerChange: (value: string) => void;
  onMatchSolved: (outcome: MatchPairsOutcome) => void;
  inputRef: Ref<AnswerTextFieldHandle>;
};

export function LessonExerciseBody({
  exercise,
  userAnswer,
  disabled,
  gradeStatus,
  onSelect,
  onAnswerChange,
  onMatchSolved,
  inputRef,
}: LessonExerciseBodyProps) {
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

  if (exercise.type === 'build_sentence') {
    return (
      <BuildSentenceExercise
        key={exercise.id}
        exercise={exercise}
        disabled={disabled}
        gradeStatus={gradeStatus}
        onAnswerChange={onAnswerChange}
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

  if (exercise.type === 'match_pairs') {
    return (
      <MatchPairsExercise
        key={exercise.id}
        exercise={exercise}
        disabled={disabled}
        onSolved={onMatchSolved}
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
        onChangeText={onAnswerChange}
        inputRef={inputRef}
      />
    );
  }

  return (
    <FillGapExercise
      key={exercise.id}
      exercise={exercise}
      value={userAnswer}
      disabled={disabled}
      onChangeText={onAnswerChange}
      inputRef={inputRef}
    />
  );
}
