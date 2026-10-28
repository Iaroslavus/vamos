import { getItem, getLesson, getTopic } from '@/features/content/loader';
import type { Item } from '@/features/content/schema';

/** Every unit taught in a topic, in lesson order, without duplicates. */
export function itemsForTopic(topicId: string): Item[] {
  const topic = getTopic(topicId);
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const lessonId of topic.lessons) {
    let lesson: ReturnType<typeof getLesson>;
    try {
      lesson = getLesson(lessonId);
    } catch {
      continue;
    }
    for (const id of lesson.items) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  const items: Item[] = [];
  for (const id of ids) {
    try {
      items.push(getItem(id));
    } catch {
      // A broken link is reported by the content check, not by the cache.
    }
  }
  return items;
}
