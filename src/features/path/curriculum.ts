import { loadAllLessons } from '@/features/lesson/loader';
import type { Lesson } from '@/features/lesson/schema';

const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

function levelRank(level: Lesson['level']): number {
  const index = LEVEL_ORDER.indexOf(level);
  return index === -1 ? 99 : index;
}

/** Lessons from `content/` sorted for the home path (level → unit → id). */
export function getCurriculumLessons(): Lesson[] {
  return [...loadAllLessons()].sort((a, b) => {
    const byLevel = levelRank(a.level) - levelRank(b.level);
    if (byLevel !== 0) return byLevel;
    if (a.unit !== b.unit) return a.unit - b.unit;
    return a.id.localeCompare(b.id);
  });
}

export function getCurriculumLessonIds(): string[] {
  return getCurriculumLessons().map((lesson) => lesson.id);
}

export type PathNodeStatus = 'completed' | 'current' | 'locked';

export type PathNode = {
  lesson: Lesson;
  status: PathNodeStatus;
  /** Zigzag: even = left, odd = right. */
  side: 'left' | 'right';
  index: number;
};

export function buildPathNodes(
  lessons: readonly Lesson[],
  completedIds: readonly string[],
): PathNode[] {
  const completed = new Set(completedIds);
  const currentId = lessons.find((lesson) => !completed.has(lesson.id))?.id ?? null;

  return lessons.map((lesson, index) => {
    let status: PathNodeStatus = 'locked';
    if (completed.has(lesson.id)) {
      status = 'completed';
    } else if (lesson.id === currentId) {
      status = 'current';
    }

    return {
      lesson,
      status,
      side: index % 2 === 0 ? 'left' : 'right',
      index,
    };
  });
}
