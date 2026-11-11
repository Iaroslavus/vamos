/** A blitz warm-up lasts two minutes and does not grade the deck. */
export const BLITZ_MS = 2 * 60 * 1000;

export function blitzRemainingMs(startedAt: number, now: number): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return BLITZ_MS;
  const elapsed = Math.max(0, now - startedAt);
  return Math.max(0, BLITZ_MS - elapsed);
}

/** `2:00` while the warm-up is running, `0:00` when it is over. */
export function formatBlitzClock(ms: number): string {
  const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  const totalSeconds = Math.ceil(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
