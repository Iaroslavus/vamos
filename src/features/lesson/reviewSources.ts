import { contentLanguage, listItems } from '@/features/content/loader';
import { textOf, type ContentLocale } from '@/features/content/text';
import type { ExerciseReference, VocabularyRef } from '@/features/review/sources';

import type { LessonExerciseItem } from './store';

export type CourseWord = {
  id: string;
  es: string;
  ru: string;
  audio?: string;
};

const cachedLexicon = new Map<ContentLocale, VocabularyRef[]>();
const cachedWords = new Map<ContentLocale, CourseWord[]>();

/** Spanish form, translation, and bundled audio for every vocabulary id. */
export function courseVocabulary(language: ContentLocale = contentLanguage()): CourseWord[] {
  const cached = cachedWords.get(language);
  if (cached) return cached;
  const words = listItems().map((item) => ({
    id: item.id,
    es: item.es,
    ru: textOf(item.tr, language),
    audio: item.audio.es ?? undefined,
  }));
  cachedWords.set(language, words);
  return words;
}

/** Spanish form and the learner's gloss for every bundled unit. */
export function courseLexicon(language: ContentLocale = contentLanguage()): VocabularyRef[] {
  const cached = cachedLexicon.get(language);
  if (cached) return cached;
  const lexicon = listItems().map((item) => ({
    id: item.id,
    es: item.es,
    ru: textOf(item.tr, language),
  }));
  cachedLexicon.set(language, lexicon);
  return lexicon;
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
