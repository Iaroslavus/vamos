import { SPEECH_PASS_SCORE } from '@/features/speech/score';

import { QUICK5_LIMIT, STUDY_MODES, type AccentStrictness, type StudyMode } from './types';

/**
 * Test holds feedback until the end.
 * The planner still builds those steps. The folder sheet marks them «скоро».
 */
export const STUDY_MODE_READY: Record<StudyMode, boolean> = {
  review: true,
  flashcards: true,
  learn: true,
  test: false,
  match: true,
  spell: true,
  speak: true,
  quick5: true,
};

/** Minutes × 10 per item, so the estimate does not depend on binary fractions. */
const MINUTE_TENTHS: Record<StudyMode, number> = {
  review: 4,
  flashcards: 2,
  learn: 8,
  test: 5,
  match: 4,
  spell: 5,
  speak: 7,
  quick5: 4,
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

/** Last mode leads. The rest keep the catalog order. */
export function orderedStudyModes(last: StudyMode | null): StudyMode[] {
  if (!last) return [...STUDY_MODES];
  return [last, ...STUDY_MODES.filter((mode) => mode !== last)];
}

/** Rough session length shown on a mode card. At least one minute. */
export function estimateStudyMinutes(mode: StudyMode, itemCount: number): number {
  const count =
    mode === 'quick5' ? Math.min(QUICK5_LIMIT, Math.max(0, itemCount)) : Math.max(0, itemCount);
  if (count === 0) return 1;
  return Math.max(1, Math.round((count * MINUTE_TENTHS[mode]) / 10));
}
