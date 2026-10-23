import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useContext } from 'react';

import { useSession } from '@/features/auth/useSession';
import { saveLessonCompletion } from '@/features/lesson/completion';
import { useLessonStore } from '@/features/lesson/store';
import { ProgressRepositoryContext } from '@/features/progress/context';
import { progressQueryKey } from '@/features/progress/useProgress';
import { reviewRepository } from '@/features/review/defaultRepository';
import { introduceCompletedLesson } from '@/features/review/sources';

/**
 * Persists a finished lesson once, then leaves the frozen summary in the store
 * for the summary screen to read. Call this before navigating to the summary.
 */
export function useFinishLesson() {
  const repository = useContext(ProgressRepositoryContext);
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useCallback(async () => {
    const summary = useLessonStore.getState().finishLesson();
    if (!summary || !repository || !userId) return;
    if (!useLessonStore.getState().claimCompletionSave()) return;

    try {
      const snapshot = await saveLessonCompletion(repository, userId, summary);
      if (snapshot) {
        queryClient.setQueryData(progressQueryKey(userId), snapshot);
      }
    } catch {
      // A failed local write must not block the summary screen.
    }

    try {
      await introduceCompletedLesson(reviewRepository, userId, summary);
    } catch {
      // A failed card write must not block the summary screen.
    }
  }, [queryClient, repository, userId]);
}
