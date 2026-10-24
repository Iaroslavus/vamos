import { listItems } from '@/features/content/loader';
import type { ExerciseReference, VocabularyRef } from '@/features/review/sources';

import type { LessonExerciseItem } from './store';

export type CourseWord = {
  id: string;
  es: string;
  ru: string;
  audio?: string;
};

let cachedLexicon: VocabularyRef[] | null = null;
let cachedWords: CourseWord[] | null = null;

/** Spanish form, translation, and bundled audio for every vocabulary id. */
export function courseVocabulary(): CourseWord[] {
  if (cachedWords) return cachedWords;
  cachedWords = listItems().map((item) => ({
    id: item.id,
    es: item.es,
    ru: item.ru,
    audio: item.audio.es ?? undefined,
  }));
  return cachedWords;
}

/** Spanish and Russian forms from every bundled lesson, keyed by vocabulary id. */
export function courseLexicon(): VocabularyRef[] {
  if (cachedLexicon) return cachedLexicon;
  cachedLexicon = listItems().map((item) => ({ id: item.id, es: item.es, ru: item.ru }));
  return cachedLexicon;
}

/** Surface forms a playable exercise can be matched to a vocabulary card. */
export function exerciseReference(exercise: LessonExerciseItem): ExerciseReference {
  if (exercise.type === 'match_pairs') {
    return { type: exercise.type, answer: exercise.answer, pairs: exercise.pairs };
  }
  if (exercise.type === 'type_translation') {
    return {
      type: exercise.type,
      prompt: exercise.prompt,
      answer: exercise.answer,
      direction: exercise.direction,
    };
  }
  if (exercise.type === 'select_translation') {
    return { type: exercise.type, prompt: exercise.prompt, answer: exercise.answer };
  }
  return { type: exercise.type, answer: exercise.answer };
}
