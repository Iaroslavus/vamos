import type { LocalizedText } from '@/features/content/schema';

export type LessonPhraseSource = {
  id: string;
  title: LocalizedText;
  itemIds: readonly string[];
};

export type PhraseGroup<T> = {
  lessonId: string;
  title: LocalizedText;
  items: T[];
};

/**
 * Phrases in lesson order. A phrase that appears in two lessons
 * stays with the earlier lesson.
 */
export function groupByLesson<T extends { id: string }>(
  lessons: readonly LessonPhraseSource[],
  items: ReadonlyMap<string, T>,
): PhraseGroup<T>[] {
  const seen = new Set<string>();
  const groups: PhraseGroup<T>[] = [];

  for (const lesson of lessons) {
    const rows: T[] = [];
    for (const id of lesson.itemIds) {
      if (seen.has(id)) continue;
      const item = items.get(id);
      if (!item) continue;
      seen.add(id);
      rows.push(item);
    }
    if (rows.length === 0) continue;
    groups.push({ lessonId: lesson.id, title: lesson.title, items: rows });
  }

  return groups;
}
