import type { ContentBundle } from '../integrity';
import type { Item } from '../schema';

/** Ten phrases from starter days 1–7, in day and lesson order. */
export function comparePhrases(bundle: ContentBundle, limit = 10): Item[] {
  const topics = bundle.topics
    .filter((topic) => topic.starter_day != null)
    .sort((a, b) => (a.starter_day ?? 0) - (b.starter_day ?? 0) || a.id.localeCompare(b.id));
  const lessons = new Map(bundle.lessons.map((lesson) => [lesson.id, lesson]));
  const items = new Map(bundle.items.map((item) => [item.id, item]));
  const picked: Item[] = [];
  const seen = new Set<string>();
  for (const topic of topics) {
    for (const lessonId of topic.lessons) {
      const lesson = lessons.get(lessonId);
      if (!lesson) continue;
      for (const id of lesson.items) {
        const item = items.get(id);
        if (!item || item.type !== 'phrase' || seen.has(item.id)) continue;
        seen.add(item.id);
        picked.push(item);
        if (picked.length >= limit) return picked;
      }
    }
  }
  return picked;
}

export function compareClipName(index: number, itemId: string, provider: string): string {
  const slug = itemId
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${String(index + 1).padStart(2, '0')}-${slug}-${provider}.m4a`;
}
