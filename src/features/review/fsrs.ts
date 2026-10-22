import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card,
  type ReviewLog,
} from 'ts-fsrs';

/** Desired retention. Matches the ts-fsrs default of 0.9; set explicitly so it stays put. */
export const DESIRED_RETENTION = 0.9;

/**
 * Stock FSRS parameters with desired retention 0.9.
 * Fuzz stays at the library default (off), so the same card and rating always
 * schedule the same interval.
 */
export const reviewParameters = generatorParameters({
  request_retention: DESIRED_RETENTION,
});

const scheduler = fsrs(reviewParameters);

export const REVIEW_RATINGS = ['again', 'hard', 'good', 'easy'] as const;
export type ReviewRating = (typeof REVIEW_RATINGS)[number];

/** ts-fsrs State: 0 New, 1 Learning, 2 Review, 3 Relearning. */
export type CardState = 0 | 1 | 2 | 3;

export type FsrsCard = {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview: Date | null;
};

/** One review, shaped like a ts-fsrs ReviewLog (state is the state before the rating). */
export type FsrsReviewLog = {
  rating: ReviewRating;
  state: CardState;
  elapsedDays: number;
  scheduledDays: number;
  reviewedAt: Date;
};

export type ScheduledInterval = {
  /** Milliseconds from the review instant until the next due date. */
  intervalMs: number;
  scheduledDays: number;
};

export type IntervalPreview = Record<ReviewRating, ScheduledInterval>;

const RATING_TO_GRADE = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
} as const;

export function ratingToValue(rating: ReviewRating): number {
  return RATING_TO_GRADE[rating];
}

export function ratingFromValue(value: number): ReviewRating {
  const match = REVIEW_RATINGS.find((rating) => RATING_TO_GRADE[rating] === value);
  if (!match) throw new Error('Invalid review rating');
  return match;
}

export function createCard(now: Date = new Date()): FsrsCard {
  return fromLibrary(createEmptyCard(now));
}

export function rateCard(
  card: FsrsCard,
  rating: ReviewRating,
  now: Date,
): { card: FsrsCard; log: FsrsReviewLog } {
  const result = scheduler.next(toLibrary(card), now, RATING_TO_GRADE[rating]);
  return { card: fromLibrary(result.card), log: fromLog(result.log) };
}

/** Next interval for Again, Hard, Good, and Easy if the card were rated at `now`. */
export function previewIntervals(card: FsrsCard, now: Date): IntervalPreview {
  const preview = scheduler.repeat(toLibrary(card), now);
  return {
    again: toInterval(preview[Rating.Again].card, now),
    hard: toInterval(preview[Rating.Hard].card, now),
    good: toInterval(preview[Rating.Good].card, now),
    easy: toInterval(preview[Rating.Easy].card, now),
  };
}

/** Cards whose due date is now or earlier, oldest first. */
export function selectDueCards<T extends { due: Date | string }>(
  cards: readonly T[],
  now: Date,
): T[] {
  const nowMs = now.getTime();
  return cards
    .filter((card) => dueMs(card.due) <= nowMs)
    .sort((left, right) => dueMs(left.due) - dueMs(right.due));
}

function toInterval(card: Card, now: Date): ScheduledInterval {
  return {
    intervalMs: Math.max(0, card.due.getTime() - now.getTime()),
    scheduledDays: card.scheduled_days,
  };
}

function dueMs(due: Date | string): number {
  return due instanceof Date ? due.getTime() : new Date(due).getTime();
}

function toLibrary(card: FsrsCard): Card {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.lastReview ?? undefined,
  };
}

function fromLibrary(card: Card): FsrsCard {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: asState(card.state),
    lastReview: card.last_review ?? null,
  };
}

function fromLog(log: ReviewLog): FsrsReviewLog {
  return {
    rating: ratingFromValue(log.rating),
    state: asState(log.state),
    elapsedDays: log.elapsed_days,
    scheduledDays: log.scheduled_days,
    reviewedAt: log.review,
  };
}

function asState(value: number): CardState {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  throw new Error('Invalid card state');
}
