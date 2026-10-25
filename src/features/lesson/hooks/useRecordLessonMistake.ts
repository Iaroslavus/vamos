import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { contentLocale } from '@/features/content/text';

import { useSession } from '@/features/auth/useSession';
import { reviewRepository } from '@/features/review/defaultRepository';
import { recordKnownWordMistake } from '@/features/review/sources';

import type { GradeStatus } from '../grading';
import { courseLexicon, exerciseReference } from '../reviewSources';
import type { LessonExerciseItem } from '../store';

/** Records Again for a wrong answer on a word that already has a card. */
export function useRecordLessonMistake() {
  const { i18n } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const language = contentLocale(i18n.language);
  const lexicon = useMemo(() => courseLexicon(language), [language]);

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
