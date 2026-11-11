import { SPEECH_PASS_SCORE } from '@/features/speech/score';

import { DEFAULT_TEST_COUNT, STUDY_MODES, type AccentStrictness, type StudyMode } from './types';

/** A mode that is not ready stays on the sheet as «скоро». */
export const STUDY_MODE_READY: Record<StudyMode, boolean> = {
  learn: true,
  flashcards: true,
  blitz: true,
  speak: true,
  test: true,
};

/** Minutes × 10 per item, so the estimate does not depend on binary fractions. */
const MINUTE_TENTHS: Record<StudyMode, number> = {
  learn: 6,
  flashcards: 2,
  blitz: 4,
  speak: 7,
  test: 5,
};

/**
 * Pass line for a speak step.
 * Standard stays on the speech scorer's own threshold.
 */
export const ACCENT_PASS_SCORE: Record<AccentStrictness, number> = {
  relaxed: SPEECH_PASS_SCORE - 15,
  standard: SPEECH_PASS_SCORE,
  strict: SPEECH_PASS_SCORE + 15,
};

export function isStudyMode(value: unknown): value is StudyMode {
  return typeof value === 'string' && (STUDY_MODES as readonly string[]).includes(value);
}

export function isPlayableStudyMode(mode: StudyMode): boolean {
  return STUDY_MODE_READY[mode];
}

/** «Вчити» stays first. The sheet does not reshuffle around the last session. */
export function orderedStudyModes(): StudyMode[] {
  return [...STUDY_MODES];
}

/** Rough session length. Blitz is a fixed two-minute warm-up. At least one minute. */
export function estimateStudyMinutes(mode: StudyMode, itemCount: number): number {
  if (mode === 'blitz') return 2;
  const available = Math.max(0, itemCount);
  const count = mode === 'test' ? Math.min(DEFAULT_TEST_COUNT, available) : available;
  if (count === 0) return 1;
  return Math.max(1, Math.round((count * MINUTE_TENTHS[mode]) / 10));
}
