import type { LessonProgress } from '@/features/progress/types';

/** Lesson ids the home path should draw as completed. */
export function completedLessonIds(lessons: readonly LessonProgress[]): string[] {
  return lessons.filter((lesson) => lesson.status === 'completed').map((lesson) => lesson.lessonId);
}
