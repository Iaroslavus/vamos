import type { Lesson } from './schema';
import type { LessonExerciseItem } from './store';

export const FIRST_A1_LESSON_ID = 'a1-u01-l01';

/** Exercise kinds the lesson player implements today. */
export const PLAYABLE_TYPES = ['select_translation', 'build_sentence'] as const;
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
    if (exercise.type === 'select_translation') {
      items.push({
        id: `e${index}`,
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
        id: `e${index}`,
        type: 'build_sentence',
        prompt_ru: exercise.prompt_ru,
        tiles: exercise.tiles,
        answer: exercise.answer,
        accepted: exercise.accepted,
      });
    }
  });

  return items;
}
