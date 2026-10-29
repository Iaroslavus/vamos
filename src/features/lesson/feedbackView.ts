import type { TFunction } from 'i18next';

import { formatExerciseAnswer, type AnswerLine } from './answerFormat';
import type { GradeResult } from './grading';
import type { LessonExerciseItem } from './store';

export type ResultSheetModel = {
  variant: 'success' | 'error';
  title: string;
  message?: string;
  phraseEs?: string;
  phraseTr?: string;
  pairs?: readonly AnswerLine[];
  correctLabel?: string;
  speakText?: string;
  audio?: string | null;
  itemIds: readonly string[];
  autoPlay: boolean;
};

const EMPTY: ResultSheetModel = {
  variant: 'error',
  title: '',
  itemIds: [],
  autoPlay: false,
};

/**
 * What the result sheet shows after any exercise.
 * The learner sees Spanish and a translation, never `::`, `|`, or a catalog id.
 */
export function buildResultSheetModel(input: {
  t: TFunction;
  exercise: LessonExerciseItem | null;
  grade: GradeResult | null;
  failed: boolean;
}): ResultSheetModel {
  const { t, exercise, grade, failed } = input;
  if (!grade || !exercise) return EMPTY;

  const formatted = formatExerciseAnswer(exercise, grade.wrongKeys ?? []);
  const match = exercise.type === 'match_pairs';
  const success = grade.status === 'correct' || grade.status === 'almost';
  const speakText = formatted.phraseEs;

  return {
    variant: success ? 'success' : 'error',
    title: sheetTitle(t, exercise, grade, failed),
    message: sheetMessage(t, exercise, grade, failed),
    phraseEs: match ? undefined : formatted.phraseEs || undefined,
    phraseTr: match ? undefined : formatted.phraseTr || undefined,
    pairs: match ? toPairs(formatted.lines) : undefined,
    correctLabel: grade.status === 'correct' ? undefined : t('lesson.feedbackCorrectLabel'),
    speakText: speakText || undefined,
    audio: match ? null : formatted.audio,
    itemIds: formatted.itemIds,
    autoPlay: grade.status === 'correct' && speakText.length > 0,
  };
}

function toPairs(lines: readonly AnswerLine[]): AnswerLine[] {
  return lines.map((line) => ({ text: line.text, wrong: line.wrong }));
}

function sheetTitle(
  t: TFunction,
  exercise: LessonExerciseItem,
  grade: GradeResult,
  failed: boolean,
): string {
  if (failed) return t('lesson.feedbackFailed');
  if (exercise.type === 'match_pairs') {
    const mistakes = grade.mistakes ?? 0;
    if (mistakes === 0 && grade.status === 'correct') return t('lesson.feedbackMatchClear');
    return t('lesson.feedbackMatchErrors', { count: mistakes });
  }
  if (grade.status === 'correct') return t('lesson.feedbackCorrect');
  if (grade.status === 'almost') return t('lesson.feedbackAlmost');
  return t('lesson.feedbackWrong');
}

function sheetMessage(
  t: TFunction,
  exercise: LessonExerciseItem,
  grade: GradeResult,
  failed: boolean,
): string | undefined {
  if (failed && exercise.type === 'match_pairs' && (grade.mistakes ?? 0) > 0) {
    return t('lesson.feedbackMatchErrors', { count: grade.mistakes ?? 0 });
  }
  if (grade.status === 'almost') return grade.note ?? t('lesson.feedbackAlmostHint');
  return undefined;
}
