import type { StudyFlashcardStep, StudyStep } from './types';

export type FlashMark = 'know' | 'again';

export type FlashRound = {
  cards: StudyFlashcardStep[];
  index: number;
  know: string[];
  again: string[];
};

export type FlashSummary = {
  know: number;
  again: number;
  againIds: string[];
};

/** Distance that counts as a decision even without a flick. */
export const SWIPE_COMMIT_DISTANCE = 96;
/** Shorter travel that still counts when the flick is fast. */
export const SWIPE_FLICK_DISTANCE = 28;
/**
 * Gesture Handler `velocityX` is points per second.
 * 800 is a short flick.
 */
export const SWIPE_FLICK_VELOCITY = 800;
export const SWIPE_TILT_LIMIT = 12;
const TILT_RANGE = 160;

export function flashcardSteps(steps: readonly StudyStep[]): StudyFlashcardStep[] {
  return steps.filter((step): step is StudyFlashcardStep => step.type === 'flashcard');
}

export function startRound(cards: readonly StudyFlashcardStep[]): FlashRound {
  return { cards: [...cards], index: 0, know: [], again: [] };
}

export function currentCard(round: FlashRound): StudyFlashcardStep | null {
  return round.cards[round.index] ?? null;
}

export function cardsLeft(round: FlashRound): number {
  return Math.max(0, round.cards.length - round.index);
}

export function applyMark(round: FlashRound, mark: FlashMark): FlashRound {
  const card = currentCard(round);
  if (!card) return round;
  return {
    ...round,
    index: round.index + 1,
    know: mark === 'know' ? [...round.know, card.itemId] : round.know,
    again: mark === 'again' ? [...round.again, card.itemId] : round.again,
  };
}

/** Still-learning cards, in the order they sit in the deck now. */
export function repeatStillLearning(round: FlashRound): FlashRound {
  const again = new Set(round.again);
  return startRound(round.cards.filter((card) => again.has(card.itemId)));
}

export function flashSummary(round: FlashRound): FlashSummary {
  const againIds: string[] = [];
  for (const itemId of round.again) {
    if (!againIds.includes(itemId)) againIds.push(itemId);
  }
  return { know: round.know.length, again: round.again.length, againIds };
}

/** Shuffles cards that have not been marked yet. Answered cards stay put. */
export function shuffleRemaining(round: FlashRound, random: () => number): FlashRound {
  if (round.index >= round.cards.length - 1) return round;
  const head = round.cards.slice(0, round.index);
  const tail = shuffleCopy(round.cards.slice(round.index), random);
  return { ...round, cards: [...head, ...tail] };
}

/**
 * Right is «Знаю», left is «Ещё учу».
 * A long drag counts on its own. A shorter drag counts only with a flick.
 */
export function markForSwipe(translationX: number, velocityX: number): FlashMark | null {
  'worklet';
  if (translationX >= SWIPE_COMMIT_DISTANCE) return 'know';
  if (translationX <= -SWIPE_COMMIT_DISTANCE) return 'again';
  if (translationX >= SWIPE_FLICK_DISTANCE && velocityX >= SWIPE_FLICK_VELOCITY) return 'know';
  if (translationX <= -SWIPE_FLICK_DISTANCE && velocityX <= -SWIPE_FLICK_VELOCITY) return 'again';
  return null;
}

/** Card lean, in degrees. Positive translation leans clockwise. */
export function swipeTilt(translationX: number): number {
  'worklet';
  const span = Math.max(-TILT_RANGE, Math.min(TILT_RANGE, translationX));
  return (span / TILT_RANGE) * SWIPE_TILT_LIMIT;
}

/** Overlay strength for the teal «Знаю» wash and the coral «Ещё учу» wash. */
export function swipeTint(translationX: number): { know: number; again: number } {
  'worklet';
  return {
    know: Math.max(0, Math.min(1, translationX / SWIPE_COMMIT_DISTANCE)),
    again: Math.max(0, Math.min(1, -translationX / SWIPE_COMMIT_DISTANCE)),
  };
}

function shuffleCopy<T>(items: readonly T[], random: () => number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = next[index] as T;
    next[index] = next[swapIndex] as T;
    next[swapIndex] = current;
  }
  return next;
}
