import type { CefrLevel, Item } from '@/features/content/schema';

export type AudioPreference = 'es' | 'latam';

const BEGINNER_LEVELS: ReadonlySet<CefrLevel> = new Set(['A1', 'A2']);

/** Cyrillic pronunciation hint is only shown while the learner is a beginner. */
export function showsSayRu(level: CefrLevel): boolean {
  return BEGINNER_LEVELS.has(level);
}

/** Recording for the preferred region, then the other track, then none. */
export function itemAudioPath(item: Item, preference: AudioPreference = 'es'): string | null {
  const primary = preference === 'latam' ? item.audio.latam : item.audio.es;
  const fallback = preference === 'latam' ? item.audio.es : item.audio.latam;
  return primary ?? fallback;
}

/** Leftward distance that counts as «Дальше» even without a flick. */
export const SWIPE_NEXT_DISTANCE = 72;
const SWIPE_FLICK_DISTANCE = 24;
/**
 * PanResponder `vx` is points per millisecond.
 * 0.5 ≈ a short flick (about 500 pt/s).
 */
const SWIPE_FLICK_VELOCITY = 0.5;

export function shouldAdvanceOnSwipe(translationX: number, velocityX: number): boolean {
  if (translationX <= -SWIPE_NEXT_DISTANCE) return true;
  return translationX <= -SWIPE_FLICK_DISTANCE && velocityX <= -SWIPE_FLICK_VELOCITY;
}
