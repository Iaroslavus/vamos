import type { ReviewRating } from './fsrs';

/** How long «Вернётся через …» stays up before the next card slides in. */
export const REVIEW_CAPTION_MS = 500;
/** The rated card leaves the stage. */
export const REVIEW_EXIT_MS = 280;
/** The card that was already mounted eases into the center. */
export const REVIEW_ENTER_MS = 320;

/** Read at flight time so tests can shorten the pause without faking the clock. */
export const reviewTiming = {
  captionMs: REVIEW_CAPTION_MS,
  exitMs: REVIEW_EXIT_MS,
  enterMs: REVIEW_ENTER_MS,
};

export type FlightDirection = 'left' | 'right';
export type FlightPhase = 'fly' | 'enter' | 'done';

export type ReviewFlight<T> = {
  leaving: T;
  arriving: T | null;
  direction: FlightDirection;
  rating: ReviewRating;
  phase: FlightPhase;
};

export type ReviewSlot<T> = {
  card: T;
  role: 'front' | 'back';
};

/** Again and Hard leave to the left. Good and Easy leave to the right. */
export function flightDirection(rating: ReviewRating): FlightDirection {
  return rating === 'again' || rating === 'hard' ? 'left' : 'right';
}

export function flightCaughtUp<T extends { key: string }>(
  card: T,
  flight: ReviewFlight<T>,
): boolean {
  if (flight.arriving) return card.key === flight.arriving.key;
  return card.key !== flight.leaving.key;
}

/**
 * The next card is the back slot before anyone rates, so the exit never
 * unmounts the only face and leaves a blank card.
 * While a flight is in progress the same two objects stay mounted, even if
 * the parent has already moved the index forward.
 */
export function reviewSlots<T extends { key: string }>(
  card: T,
  next: T | null,
  flight: ReviewFlight<T> | null,
): ReviewSlot<T>[] {
  const holding = flight != null && (flight.phase !== 'done' || !flightCaughtUp(card, flight));
  if (holding) {
    return [
      ...(flight.arriving ? [{ card: flight.arriving, role: 'back' as const }] : []),
      { card: flight.leaving, role: 'front' as const },
    ];
  }
  return [
    ...(next ? [{ card: next, role: 'back' as const }] : []),
    { card, role: 'front' as const },
  ];
}
