import { parseLesson, type Lesson } from './schema';

/**
 * Static registry of bundled lesson JSON.
 * Metro requires explicit `require()` paths — keep in sync with `content/`.
 */
const LESSON_MODULES: Record<string, unknown> = {
  'a1-u01-l01': require('../../../content/a1/unit-01/lesson-01.json'),
  'a1-u01-l02': require('../../../content/a1/unit-01/lesson-02.json'),
  'a1-u01-l03': require('../../../content/a1/unit-01/lesson-03.json'),
};

export function listLessonIds(): string[] {
  return Object.keys(LESSON_MODULES);
}

export function loadLesson(id: string): Lesson {
  const raw = LESSON_MODULES[id];
  if (raw === undefined) {
    throw new Error(`Unknown lesson id: ${id}`);
  }
  return parseLesson(raw);
}

export function loadAllLessons(): Lesson[] {
  return listLessonIds().map((id) => loadLesson(id));
}

/** Lessons that are ready for the learning path (non-draft). */
export function loadPublishedLessons(): Lesson[] {
  return loadAllLessons().filter((lesson) => !lesson.draft);
}
