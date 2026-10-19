import { useQueryClient } from '@tanstack/react-query';
import { useContext } from 'react';

import { useSession } from '@/features/auth/useSession';
import { saveLessonCompletion, type LessonResult } from '@/features/lesson/completion';
import { useLessonStore } from '@/features/lesson/store';
import { ProgressRepositoryContext } from '@/features/progress/context';
import { progressQueryKey } from '@/features/progress/useProgress';

/** Writes a completed lesson to the progress repository, then clears the session. */
export function useFinishLesson() {
  const repository = useContext(ProgressRepositoryContext);
  const { session } = useSession();
  const queryClient = useQueryClient();
  const reset = useLessonStore((s) => s.reset);

  return async function finishLesson(summary: LessonResult): Promise<void> {
    const userId = session?.user.id;
    try {
      if (repository && userId) {
        const snapshot = await saveLessonCompletion(repository, userId, summary);
        if (snapshot) {
          queryClient.setQueryData(progressQueryKey(userId), snapshot);
        }
      }
    } catch {
      // A failed local write must not trap the learner on the summary screen.
    } finally {
      reset();
    }
  };
}
