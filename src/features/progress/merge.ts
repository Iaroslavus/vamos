import type { LessonProgress } from './types';

/** Mirrors public.save_lesson_progress: the higher accuracy wins; a tie keeps the stored completed_at. */
export function resolveLessonConflict(
  incoming: LessonProgress,
  stored: LessonProgress | null,
): LessonProgress {
  if (!stored) return incoming;

  const incomingAccuracy = incoming.bestAccuracy ?? -1;
  const storedAccuracy = stored.bestAccuracy ?? -1;
  const incomingWins = incomingAccuracy > storedAccuracy;
  const best = Math.max(incomingAccuracy, storedAccuracy);
  const completed = incoming.status === 'completed' || stored.status === 'completed';

  return {
    lessonId: incoming.lessonId,
    status: completed ? 'completed' : incoming.status,
    bestAccuracy: best < 0 ? null : roundAccuracy(best),
    completedAt: !completed
      ? null
      : incomingWins
        ? (incoming.completedAt ?? stored.completedAt)
        : (stored.completedAt ?? incoming.completedAt),
  };
}

export function roundAccuracy(value: number): number {
  return Math.round(value * 100) / 100;
}

export function retryDelayMs(attempts: number): number {
  const exponent = Math.min(Math.max(attempts, 1), 5) - 1;
  return 1000 * 2 ** exponent;
}
