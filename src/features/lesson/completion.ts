import type { ProgressRepository, ProgressSnapshot } from '@/features/progress/types';

/** Lesson summary fields needed to persist a result. Accuracy is a 0–1 ratio. */
export type LessonResult = {
  status: string;
  lessonId: string | null;
  accuracy: number;
  xpEarned: number;
};

export type CompletionWriter = Pick<ProgressRepository, 'recordCompletion'>;

/** Map a 0–1 lesson accuracy onto the 0–100 scale the progress repository stores. */
export function toCompletionAccuracy(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  const clamped = Math.min(1, Math.max(0, ratio));
  return Math.round(clamped * 10000) / 100;
}

/**
 * Persist a finished lesson. Failed and unfinished sessions are ignored.
 * Returns the snapshot after a successful completion, or null when nothing was written.
 */
export async function saveLessonCompletion(
  repository: CompletionWriter,
  userId: string,
  summary: LessonResult,
): Promise<ProgressSnapshot | null> {
  if (summary.status !== 'completed' || !summary.lessonId) return null;

  return repository.recordCompletion(userId, {
    lessonId: summary.lessonId,
    accuracy: toCompletionAccuracy(summary.accuracy),
    xp: summary.xpEarned,
  });
}
