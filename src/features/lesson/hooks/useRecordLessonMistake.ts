import { useCallback, useMemo } from 'react';

import { useSession } from '@/features/auth/useSession';
import { reviewRepository } from '@/features/review/defaultRepository';
import { recordKnownWordMistake } from '@/features/review/sources';

import type { GradeStatus } from '../grading';
import { courseLexicon, exerciseReference } from '../reviewSources';
import type { LessonExerciseItem } from '../store';

/** Records Again for a wrong answer on a word that already has a card. */
export function useRecordLessonMistake() {
  const { session } = useSession();
  const userId = session?.user.id;
  const lexicon = useMemo(() => courseLexicon(), []);

  return useCallback(
    (exercise: LessonExerciseItem, status: GradeStatus) => {
      if (!userId) return;
      void recordKnownWordMistake(
        reviewRepository,
        userId,
        status,
        exerciseReference(exercise),
        lexicon,
      ).catch(() => undefined);
    },
    [lexicon, userId],
  );
}
