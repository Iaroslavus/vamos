import { calendarDate } from '@/features/progress/streak';

import { previewIntervals, selectDueCards, type FsrsCard, type ReviewRating } from './fsrs';
import { isSuccessfulRating } from './sources';
import type { ReviewDirection, StoredCard } from './types';

/** New cards introduced into a study day. A card is new while its FSRS state is 0. */
export const NEW_CARDS_PER_DAY = 20;
/** Ratings of cards that are already in learning, review, or relearning. */
export const REVIEWS_PER_DAY = 200;

/** One award for a finished session that included at least this many ratings. */
export const REVIEW_XP_MIN_CARDS = 10;
export const REVIEW_SESSION_XP = 5;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type IntervalUnit = 'minutes' | 'hours' | 'days';

export type IntervalLabel = {
  unit: IntervalUnit;
  count: number;
};

export type ReviewActivity = {
  reviewedAt: string;
  /** Card state before the rating. 0 means the card was new. */
  state: number;
};

export type ReviewQueue = {
  cards: StoredCard[];
  /** Due cards were left out because today's new or review cap is full. */
  capped: boolean;
};

export function reviewSessionXp(reviewedCount: number): number {
  if (!Number.isInteger(reviewedCount) || reviewedCount < REVIEW_XP_MIN_CARDS) return 0;
  return REVIEW_SESSION_XP;
}

/** Share of ratings that still count as remembering the card. Again is a miss. */
export function reviewAccuracy(ratings: readonly ReviewRating[]): number {
  if (ratings.length === 0) return 0;
  let remembered = 0;
  for (const rating of ratings) {
    if (isSuccessfulRating(rating)) remembered += 1;
  }
  return remembered / ratings.length;
}

/** Short label for the gap until a card is due again: «10 мин», «2 ч», «3 дн». */
export function formatInterval(intervalMs: number): IntervalLabel {
  const safe = Number.isFinite(intervalMs) ? Math.max(0, intervalMs) : 0;
  const minutes = Math.max(1, Math.round(safe / MINUTE_MS));
  if (minutes < 60) return { unit: 'minutes', count: minutes };
  const hours = Math.round(safe / HOUR_MS);
  if (hours < 24) return { unit: 'hours', count: Math.max(1, hours) };
  return { unit: 'days', count: Math.max(1, Math.round(safe / DAY_MS)) };
}

export function describeIntervals(
  card: StoredCard,
  now: Date,
): Record<ReviewRating, IntervalLabel> {
  const preview = previewIntervals(toFsrs(card), now);
  return {
    again: formatInterval(preview.again.intervalMs),
    hard: formatInterval(preview.hard.intervalMs),
    good: formatInterval(preview.good.intervalMs),
    easy: formatInterval(preview.easy.intervalMs),
  };
}

/**
 * Cards to study now.
 * Reviews come first, then new cards. Each bucket stops at what's left of today's cap.
 * A log counts toward the cap of the civil day in `timeZone`.
 */
export function buildReviewQueue(input: {
  cards: readonly StoredCard[];
  logs: readonly ReviewActivity[];
  now: Date;
  timeZone: string;
}): ReviewQueue {
  const nowMs = input.now.getTime();
  const today = calendarDate(input.now.toISOString(), input.timeZone);
  let newUsed = 0;
  let reviewUsed = 0;

  for (const log of input.logs) {
    if (!countsToday(log.reviewedAt, input.timeZone, today, nowMs)) continue;
    if (log.state === 0) newUsed += 1;
    else reviewUsed += 1;
  }

  const due = selectDueCards(input.cards, input.now);
  const reviews = due.filter((card) => card.state !== 0);
  const fresh = due.filter((card) => card.state === 0);
  const takenReviews = reviews.slice(0, Math.max(0, REVIEWS_PER_DAY - reviewUsed));
  const takenNew = fresh.slice(0, Math.max(0, NEW_CARDS_PER_DAY - newUsed));

  return {
    cards: [...takenReviews, ...takenNew],
    capped: takenReviews.length < reviews.length || takenNew.length < fresh.length,
  };
}

export function faceText(
  direction: ReviewDirection,
  word: { es: string; ru: string },
): { front: string; back: string } {
  if (direction === 'ru_to_es') return { front: word.ru, back: word.es };
  return { front: word.es, back: word.ru };
}

function countsToday(reviewedAt: string, timeZone: string, today: string, nowMs: number): boolean {
  const parsed = Date.parse(reviewedAt);
  if (Number.isNaN(parsed) || parsed > nowMs) return false;
  return calendarDate(reviewedAt, timeZone) === today;
}

function toFsrs(card: StoredCard): FsrsCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsedDays,
    scheduledDays: card.scheduledDays,
    learningSteps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: asState(card.state),
    lastReview: card.lastReview ? new Date(card.lastReview) : null,
  };
}

function asState(value: number): FsrsCard['state'] {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  throw new Error('Invalid card state');
}
