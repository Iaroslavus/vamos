import { selectDueCards } from './fsrs';

/** A review of one unit is counted as a quarter of a minute, then rounded up. */
export const REVIEW_SECONDS_PER_UNIT = 15;

/**
 * Units with at least one card due at `now`.
 * Recognition and recall are separate cards; the unit counts once.
 */
export function dueUnitCount(cards: readonly { itemId: string; due: string }[], now: Date): number {
  const ids = new Set<string>();
  for (const card of selectDueCards(cards, now)) {
    if (card.itemId.length === 0) continue;
    ids.add(card.itemId);
  }
  return ids.size;
}

/** Units that have an FSRS card, whatever the direction or the schedule. */
export function learnedUnitCount(cards: readonly { itemId: string }[]): number {
  const ids = new Set<string>();
  for (const card of cards) {
    if (card.itemId.length === 0) continue;
    ids.add(card.itemId);
  }
  return ids.size;
}

/** Milliseconds until the soonest card that is not due yet. */
export function nextDueInMs(cards: readonly { due: string }[], now: Date): number | null {
  const nowMs = now.getTime();
  let best: number | null = null;
  for (const card of cards) {
    const at = Date.parse(card.due);
    if (!Number.isFinite(at) || at <= nowMs) continue;
    if (best === null || at < best) best = at;
  }
  return best === null ? null : best - nowMs;
}

/** Minutes to review `dueUnits`, at {@link REVIEW_SECONDS_PER_UNIT} each, rounded up. */
export function reviewMinutes(dueUnits: number): number {
  if (!Number.isInteger(dueUnits) || dueUnits <= 0) return 0;
  return Math.ceil((dueUnits * REVIEW_SECONDS_PER_UNIT) / 60);
}
