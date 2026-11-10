import type { StudyGrade } from '../types';

/**
 * The first successful take is a clean pass.
 * A later take means an earlier one missed.
 */
export function gradeSpokenPass(attempts: number): StudyGrade {
  return attempts <= 1 ? 'correct_first' : 'correct_after_error';
}
