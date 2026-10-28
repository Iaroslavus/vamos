import { selectClip, type AudioPreference, type AudioSpeed } from '@/features/audio/select';
import type { CefrLevel, Item } from '@/features/content/schema';

export type { AudioPreference, AudioSpeed };

const BEGINNER_LEVELS: ReadonlySet<CefrLevel> = new Set(['A1', 'A2']);

/** Cyrillic pronunciation hint is only shown while the learner is a beginner. */
export function showsSayRu(level: CefrLevel): boolean {
  return BEGINNER_LEVELS.has(level);
}

/**
 * Recording for the preferred region and speed, then the other region at that speed.
 * A missing slow file is null: the player uses speech instead of stretching the normal file.
 */
export function itemAudioPath(
  item: Item,
  preference: AudioPreference = 'es',
  speed: AudioSpeed = 'normal',
): string | null {
  return selectClip(item.audio, preference, speed);
}

/** One `parts` chip. Index matches `item.parts` and `item.audio.parts`. */
export function partAudioPath(
  item: Item,
  partIndex: number,
  preference: AudioPreference = 'es',
  speed: AudioSpeed = 'normal',
): string | null {
  return selectClip(item.audio, preference, speed, partIndex);
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
