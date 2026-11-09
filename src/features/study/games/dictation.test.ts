import { gradeAnswer } from '@/features/lesson/grading';

import { settleStudyCheck } from '../fsrs';
import {
  DICTATION_BASE,
  dictationGrade,
  dictationLetterCount,
  dictationMask,
  dictationPoints,
  nextReveal,
} from './dictation';

describe('dictation', () => {
  it('hides letters and keeps spaces and punctuation', () => {
    expect(dictationMask('¿hola!', 0)).toBe('¿····!');
    expect(dictationMask('buenos días', 1)).toBe('b····· ····');
    expect(dictationMask('buenos días', 7)).toBe('buenos d···');
    expect(dictationLetterCount('¿hola!')).toBe(4);
  });

  it('opens one letter at a time and stops at the end', () => {
    expect(nextReveal('adiós', 0)).toBe(1);
    expect(nextReveal('adiós', 4)).toBe(5);
    expect(nextReveal('adiós', 5)).toBe(5);
    expect(dictationMask('adiós', nextReveal('adiós', 0))).toBe('a····');
  });

  it('grades through grading.ts and charges a revealed letter', () => {
    const answer = 'adiós';
    const reveals = nextReveal(answer, 0);
    const graded = gradeAnswer({ userAnswer: 'adiós', answer });
    const settled = settleStudyCheck([], graded.status);

    expect(graded.status).toBe('correct');
    expect(dictationPoints(graded.status, reveals)).toBe(DICTATION_BASE - 1);
    expect(dictationGrade(settled.outcome, graded.status, reveals)).toBe('correct_after_error');
  });

  it('keeps a clean pass at full points and a near miss one point lower', () => {
    const clean = gradeAnswer({ userAnswer: 'adiós', answer: 'adiós' });
    const almost = gradeAnswer({ userAnswer: 'adios', answer: 'adiós' });
    const wrong = gradeAnswer({ userAnswer: 'hola', answer: 'adiós' });

    expect(clean.status).toBe('correct');
    expect(dictationPoints(clean.status, 0)).toBe(DICTATION_BASE);
    expect(dictationGrade('correct_first', clean.status, 0)).toBe('correct_first');

    expect(almost.status).toBe('almost');
    expect(dictationPoints(almost.status, 0)).toBe(DICTATION_BASE - 1);
    expect(dictationGrade('correct_first', almost.status, 0)).toBe('correct_after_error');

    expect(wrong.status).toBe('wrong');
    expect(dictationPoints(wrong.status, 2)).toBe(0);
    expect(dictationGrade(settleStudyCheck([], wrong.status).outcome, wrong.status, 2)).toBeNull();
  });

  it('does not let the score fall below zero', () => {
    expect(dictationPoints('correct', DICTATION_BASE + 3)).toBe(0);
    expect(dictationPoints('almost', DICTATION_BASE)).toBe(0);
  });
});
