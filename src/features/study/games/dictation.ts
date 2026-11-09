import type { GradeStatus } from '@/features/lesson/grading';

import type { StudyGrade } from '../types';

/** Every dictated phrase starts here. One revealed letter costs one point. */
export const DICTATION_BASE = 10;

/**
 * Letters still hidden are `·`. Spaces and punctuation stay, so the shape is visible.
 * `revealed` counts letters from the left, not characters.
 */
export function dictationMask(answer: string, revealed: number): string {
  let left = Math.max(0, revealed);
  let mask = '';
  for (const char of [...answer]) {
    if (!isLetter(char)) {
      mask += char;
      continue;
    }
    if (left > 0) {
      mask += char;
      left -= 1;
    } else {
      mask += '·';
    }
  }
  return mask;
}

export function dictationLetterCount(answer: string): number {
  return [...answer].filter((char) => isLetter(char)).length;
}

/** Opens one more letter. Stops when every letter is already open. */
export function nextReveal(answer: string, revealed: number): number {
  const letters = dictationLetterCount(answer);
  return Math.min(letters, Math.max(0, revealed) + 1);
}

/**
 * Points left after the check.
 * A wrong answer scores nothing. A near miss (accent or typo) costs one more point.
 */
export function dictationPoints(status: GradeStatus, reveals: number): number {
  if (status === 'wrong') return 0;
  const cost = Math.max(0, reveals) + (status === 'almost' ? 1 : 0);
  return Math.max(0, DICTATION_BASE - cost);
}

/**
 * A clean first try is Good. A hint or a near miss is Hard.
 * A retry outcome from the study check is left as it is.
 */
export function dictationGrade(
  settled: StudyGrade | null,
  status: GradeStatus,
  reveals: number,
): StudyGrade | null {
  if (settled !== 'correct_first') return settled;
  if (reveals > 0 || status === 'almost') return 'correct_after_error';
  return 'correct_first';
}

function isLetter(char: string): boolean {
  return char.toLowerCase() !== char.toUpperCase();
}
