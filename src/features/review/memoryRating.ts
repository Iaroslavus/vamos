import type { ReviewRating } from './fsrs';

/** A remembered card rated sooner than this after the flip is Easy. */
export const FAST_REMEMBER_MS = 3_000;

/** A long drag counts on its own. A shorter drag counts only with a flick. */
export const SWIPE_COMMIT_DISTANCE = 96;
export const SWIPE_FLICK_DISTANCE = 28;
/** Gesture Handler `velocityX` is points per second. */
export const SWIPE_FLICK_VELOCITY = 800;

export type MemoryChoice = 'forgot' | 'remember';

/**
 * «Не помню» is Again.
 * «Помню» is Easy when the answer comes back in under 3 seconds, otherwise Good.
 */
export function ratingForMemory(choice: MemoryChoice, elapsedSinceFlipMs: number): ReviewRating {
  if (choice === 'forgot') return 'again';
  if (!Number.isFinite(elapsedSinceFlipMs) || elapsedSinceFlipMs >= FAST_REMEMBER_MS) {
    return 'good';
  }
  return 'easy';
}

/**
 * Right is «Помню», left is «Не помню».
 * A long drag counts on its own. A shorter drag counts only with a flick.
 */
export function memoryForSwipe(translationX: number, velocityX: number): MemoryChoice | null {
  if (!Number.isFinite(translationX) || !Number.isFinite(velocityX)) return null;
  if (translationX >= SWIPE_COMMIT_DISTANCE) return 'remember';
  if (translationX <= -SWIPE_COMMIT_DISTANCE) return 'forgot';
  if (translationX >= SWIPE_FLICK_DISTANCE && velocityX >= SWIPE_FLICK_VELOCITY) return 'remember';
  if (translationX <= -SWIPE_FLICK_DISTANCE && velocityX <= -SWIPE_FLICK_VELOCITY) return 'forgot';
  return null;
}

/** Swipe uses the same grades as the two buttons, including the fast Easy. */
export function ratingForSwipe(
  translationX: number,
  velocityX: number,
  elapsedSinceFlipMs: number,
): ReviewRating | null {
  const choice = memoryForSwipe(translationX, velocityX);
  if (!choice) return null;
  return ratingForMemory(choice, elapsedSinceFlipMs);
}
