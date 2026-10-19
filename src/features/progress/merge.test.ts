import { resolveLessonConflict, roundAccuracy } from './merge';
import type { LessonProgress } from './types';

function lesson(accuracy: number, completedAt: string): LessonProgress {
  return {
    lessonId: 'a1-u01-l01',
    status: 'completed',
    bestAccuracy: accuracy,
    completedAt,
  };
}

describe('resolveLessonConflict', () => {
  it('keeps the higher remote accuracy', () => {
    const winner = resolveLessonConflict(
      lesson(70, '2026-03-01T00:00:00.000Z'),
      lesson(92, '2024-01-01T00:00:00.000Z'),
    );

    expect(winner.bestAccuracy).toBe(92);
    expect(winner.completedAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('keeps the higher local accuracy', () => {
    const winner = resolveLessonConflict(
      lesson(99, '2026-06-01T00:00:00.000Z'),
      lesson(92, '2024-01-01T00:00:00.000Z'),
    );

    expect(winner.bestAccuracy).toBe(99);
    expect(winner.completedAt).toBe('2026-06-01T00:00:00.000Z');
  });

  it('keeps the stored completed_at when accuracy ties', () => {
    const winner = resolveLessonConflict(
      lesson(80, '2026-06-01T00:00:00.000Z'),
      lesson(80, '2024-01-01T00:00:00.000Z'),
    );

    expect(winner.bestAccuracy).toBe(80);
    expect(winner.completedAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('rounds accuracy to the database scale', () => {
    expect(roundAccuracy(80.126)).toBe(80.13);
  });
});
