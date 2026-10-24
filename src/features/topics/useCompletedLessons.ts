import { useMemo } from 'react';

import { useProgress } from '@/features/progress/useProgress';

/** Lesson ids the progress repository has marked completed. */
export function useCompletedLessons() {
  const query = useProgress();
  const completedIds = useMemo(
    () =>
      (query.data?.lessons ?? [])
        .filter((lesson) => lesson.status === 'completed')
        .map((lesson) => lesson.lessonId),
    [query.data],
  );

  return { ...query, completedIds };
}
