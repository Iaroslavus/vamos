import type { Lesson } from './schema';
import { serializePairs } from './pairs';
import type { LessonExerciseItem } from './store';

export const FIRST_A1_LESSON_ID = 'a1-u01-l01';

/** Exercise kinds the lesson player implements today. */
export const PLAYABLE_TYPES = [
  'select_translation',
  'build_sentence',
  'listen_select',
  'match_pairs',
] as const;
export type PlayableType = (typeof PLAYABLE_TYPES)[number];

export function isPlayableType(type: string): type is PlayableType {
  return (PLAYABLE_TYPES as readonly string[]).includes(type);
}

/**
 * Map a lesson JSON into store items, keeping only MVP playable types
 * and assigning stable ids (`e0`, `e1`, …).
 */
export function toPlayableExercises(lesson: Lesson): LessonExerciseItem[] {
  const items: LessonExerciseItem[] = [];

  lesson.exercises.forEach((exercise, index) => {
    const id = `e${index}`;

    if (exercise.type === 'select_translation') {
      items.push({
        id,
        type: 'select_translation',
        prompt_ru: exercise.prompt_ru,
        prompt: exercise.prompt,
        options: exercise.options,
        answer: exercise.answer,
      });
      return;
    }

    if (exercise.type === 'build_sentence') {
      items.push({
        id,
        type: 'build_sentence',
        prompt_ru: exercise.prompt_ru,
        tiles: exercise.tiles,
        answer: exercise.answer,
        accepted: exercise.accepted,
      });
      return;
    }

    if (exercise.type === 'listen_select') {
      items.push({
        id,
        type: 'listen_select',
        prompt_ru: exercise.prompt_ru,
        options: exercise.options,
        answer: exercise.answer,
        audio: exercise.audio,
        speakText: exercise.answer,
      });
      return;
    }

    if (exercise.type === 'match_pairs') {
      items.push({
        id,
        type: 'match_pairs',
        prompt_ru: exercise.prompt_ru,
        pairs: exercise.pairs,
        answer: serializePairs(exercise.pairs),
      });
    }
  });

  return items;
}
