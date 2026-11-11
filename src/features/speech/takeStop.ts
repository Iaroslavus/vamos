/** Stop about a second after speech has fallen silent. */
export const SILENCE_AFTER_SPEECH_MS = 1000;

/** A take never holds the microphone longer than this. */
export const MAX_TAKE_MS = 8_000;

/**
 * Normalized meter (0…1) that counts as speech.
 * Anything quieter is silence for the auto-stop clock.
 */
export const SPEECH_LEVEL = 0.2;

export type TakeStop = 'silence' | 'limit';

/**
 * Twice the sample, and never more than {@link MAX_TAKE_MS}.
 * An unknown or empty sample uses the cap on its own.
 */
export function takeLimitMs(sampleDurationMs: number | null | undefined): number {
  if (sampleDurationMs == null || !Number.isFinite(sampleDurationMs) || sampleDurationMs <= 0) {
    return MAX_TAKE_MS;
  }
  return Math.min(MAX_TAKE_MS, Math.round(sampleDurationMs * 2));
}

/** Silence only counts after speech. The duration cap wins even while the learner is still talking. */
export function takeStopReason(input: {
  elapsedMs: number;
  limitMs: number;
  speechHeard: boolean;
  silenceMs: number;
}): TakeStop | null {
  if (input.elapsedMs >= input.limitMs) return 'limit';
  if (input.speechHeard && input.silenceMs >= SILENCE_AFTER_SPEECH_MS) return 'silence';
  return null;
}
