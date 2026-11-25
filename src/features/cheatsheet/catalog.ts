import { getItem, getLesson, listTopics } from '@/features/content/loader';
import type { Item, Topic } from '@/features/content/schema';

import { groupByLesson, type PhraseGroup } from './group';
import type { SearchTopic } from './search';

export type CheatsheetEntry = SearchTopic & {
  level: string;
  starterDay: number | null;
};

export function buildCheatsheetIndex(): CheatsheetEntry[] {
  return listTopics().map((topic) => {
    const groups = topicPhraseGroups(topic);
    return {
      id: topic.id,
      level: topic.level,
      starterDay: topic.starter_day ?? null,
      title: topic.title,
      canDo: topic.can_do,
      ...(topic.tags ? { tags: topic.tags } : {}),
      phrases: groups.flatMap((group) =>
        group.items.map((item) => ({ id: item.id, es: item.es, tr: item.tr })),
      ),
    };
  });
}

const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

/** Course topics grouped by CEFR level, in curriculum order inside each level. */
export function courseLevels(
  entries: readonly { id: string; level: string }[],
): { level: string; ids: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const entry of entries) {
    const ids = groups.get(entry.level) ?? [];
    ids.push(entry.id);
    groups.set(entry.level, ids);
  }
  return [...groups.keys()]
    .sort((left, right) => levelRank(left) - levelRank(right) || left.localeCompare(right))
    .map((level) => ({ level, ids: groups.get(level) ?? [] }));
}

function levelRank(level: string): number {
  const index = LEVEL_ORDER.indexOf(level as (typeof LEVEL_ORDER)[number]);
  return index === -1 ? LEVEL_ORDER.length : index;
}

/** Topics from the starter week, in day order. Otherwise the first topics. */
export function popularTopicIds(entries: readonly CheatsheetEntry[]): string[] {
  const starred = entries
    .filter((entry) => entry.starterDay != null)
    .sort(
      (left, right) =>
        (left.starterDay ?? 0) - (right.starterDay ?? 0) || left.id.localeCompare(right.id),
    );
  if (starred.length > 0) return starred.map((entry) => entry.id);
  return entries.slice(0, 8).map((entry) => entry.id);
}

export function topicPhraseGroups(topic: Topic): PhraseGroup<Item>[] {
  const items = new Map<string, Item>();
  const lessons: { id: string; title: Item['tr']; itemIds: readonly string[] }[] = [];

  for (const lessonId of topic.lessons) {
    let lesson;
    try {
      lesson = getLesson(lessonId);
    } catch {
      continue;
    }
    for (const itemId of lesson.items) {
      if (items.has(itemId)) continue;
      try {
        items.set(itemId, getItem(itemId));
      } catch {
        continue;
      }
    }
    lessons.push({ id: lesson.id, title: lesson.title, itemIds: lesson.items });
  }

  return groupByLesson(lessons, items);
}

/** First lesson the learner has not finished. A finished topic opens on lesson 1. */
export function lessonToStudy(topic: Topic, completed: ReadonlySet<string>): string | null {
  return topic.lessons.find((id) => !completed.has(id)) ?? topic.lessons[0] ?? null;
}
