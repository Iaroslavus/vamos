import type { GradeStatus } from '@/features/lesson/grading';
import type { ReviewRating } from '@/features/review/fsrs';
import type { ReviewRepository } from '@/features/review/types';

import type { MasteryBand, MasteryCounts, StudyGrade, StudyMode, StudyUnit } from './types';

/**
 * V1. How a finished mode treats the deck.
 * `rating` writes a review through the repository.
 * `none` leaves the schedule untouched.
 * Learn writes that review once, when a unit is learned, using
 * {@link ratingForStudyGrade}: no misses → Good, any miss → Hard.
 */
export const STUDY_FSRS = {
  learn: 'rating',
  test: 'rating',
  speak: 'rating',
  flashcards: 'none',
  blitz: 'none',
} as const satisfies Record<StudyMode, 'rating' | 'none'>;

/** FSRS difficulty is about 1–10 after a review. A new card stays at 0. */
export const HARD_DIFFICULTY = 6;

const GRADE_RATING = {
  correct_first: 'good',
  correct_after_error: 'hard',
  incorrect: 'again',
} as const satisfies Record<StudyGrade, ReviewRating>;

export function studyModeGrades(mode: StudyMode): boolean {
  return STUDY_FSRS[mode] === 'rating';
}

/** First-try pass → Good, pass after a miss → Hard, miss → Again. */
export function ratingForStudyGrade(grade: StudyGrade): ReviewRating {
  return GRADE_RATING[grade];
}

/**
 * Writes a rating when the mode is in the FSRS table.
 * `createIfMissing` stays false: a study session never introduces a unit.
 * Returns false when the mode does not grade.
 */
export async function recordStudyResult(
  repository: Pick<ReviewRepository, 'recordRating'>,
  userId: string,
  input: {
    mode: StudyMode;
    itemId: string;
    direction: 'es_to_ru' | 'ru_to_es';
    grade: StudyGrade;
    reviewedAt?: string;
    clientId?: string;
  },
): Promise<boolean> {
  if (!studyModeGrades(input.mode)) return false;
  await repository.recordRating(userId, {
    itemId: input.itemId,
    direction: input.direction,
    rating: ratingForStudyGrade(input.grade),
    reviewedAt: input.reviewedAt,
    clientId: input.clientId,
    createIfMissing: false,
  });
  return true;
}

/**
 * A flashcard marked «still learning».
 * Again makes the phrase due, so the next «Learn» session takes it first,
 * and a second Again inside the window fills «Difficult» on its own.
 * «Know» does not write a rating.
 */
export async function recordStillLearning(
  repository: Pick<ReviewRepository, 'recordRating'>,
  userId: string,
  input: {
    itemId: string;
    direction: 'es_to_ru' | 'ru_to_es';
    clientId: string;
    reviewedAt?: string;
  },
): Promise<void> {
  await repository.recordRating(userId, {
    itemId: input.itemId,
    direction: input.direction,
    rating: 'again',
    reviewedAt: input.reviewedAt,
    clientId: input.clientId,
    createIfMissing: false,
  });
}

export function cardIsHard(card: { difficulty: number; lapses: number; state: number }): boolean {
  return card.lapses > 0 || card.state === 3 || card.difficulty >= HARD_DIFFICULTY;
}

/**
 * Folder bar.
 * New: never introduced, or the recognition card is still new.
 * Learning: learning or relearning.
 * Known: review state.
 */
export function masteryBand(unit: Pick<StudyUnit, 'introduced' | 'state'>): MasteryBand {
  if (!unit.introduced || unit.state == null || unit.state === 0) return 'new';
  if (unit.state === 2) return 'known';
  return 'learning';
}

export function masteryCounts(
  units: readonly Pick<StudyUnit, 'introduced' | 'state'>[],
): MasteryCounts {
  const counts: MasteryCounts = { new: 0, learning: 0, known: 0 };
  for (const unit of units) counts[masteryBand(unit)] += 1;
  return counts;
}

/**
 * One check inside a step.
 * The first miss stays open for a retry. The second miss finishes as incorrect.
 * A pass on the first try is Good; a pass after a miss is Hard.
 */
export function settleStudyCheck(
  grades: readonly GradeStatus[],
  status: GradeStatus,
): { grades: GradeStatus[]; outcome: StudyGrade | null } {
  const next = [...grades, status];
  if (status === 'correct' || status === 'almost') {
    return {
      grades: next,
      outcome: grades.length === 0 ? 'correct_first' : 'correct_after_error',
    };
  }
  const misses = next.filter((grade) => grade === 'wrong').length;
  if (misses >= 2) return { grades: next, outcome: 'incorrect' };
  return { grades: next, outcome: null };
}
