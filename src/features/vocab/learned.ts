import { foldPhrase } from './phraseSearch';
import { cleanItemId } from './model';

export type LearnedLesson = {
  id: string;
  topicId: string;
  itemIds: readonly string[];
};

export type LearnedCompletion = {
  lessonId: string;
  completedAt: string | null;
};

export type LearnedSeed = {
  itemId: string;
  addedAt: string;
  topicId: string;
};

/**
 * One row per item the learner has met in a finished lesson.
 * The earliest completion wins when the same item sits in several lessons.
 */
export function learnedFromLessons(
  lessons: readonly LearnedLesson[],
  completed: readonly LearnedCompletion[],
  fallbackAt: string,
): LearnedSeed[] {
  const completedAt = new Map<string, string>();
  for (const lesson of completed) {
    const at = lesson.completedAt?.trim();
    completedAt.set(lesson.lessonId, at && at.length > 0 ? at : fallbackAt);
  }

  const best = new Map<string, LearnedSeed>();
  for (const lesson of lessons) {
    const at = completedAt.get(lesson.id);
    if (at === undefined) continue;
    const topicId = lesson.topicId.trim();
    if (topicId.length === 0) continue;
    for (const raw of lesson.itemIds) {
      const itemId = cleanItemId(raw);
      if (!itemId) continue;
      const prev = best.get(itemId);
      if (prev && prev.addedAt <= at) continue;
      best.set(itemId, { itemId, addedAt: at, topicId });
    }
  }

  return [...best.values()].sort(
    (left, right) =>
      left.addedAt.localeCompare(right.addedAt) || left.itemId.localeCompare(right.itemId),
  );
}

export type LearnedFilter = 'all' | 'due' | 'difficult';

/** Keeps `itemIds` order. Due and difficult are subsets; unknown ids stay out of those filters. */
export function filterLearnedIds(
  itemIds: readonly string[],
  filter: LearnedFilter,
  dueIds: ReadonlySet<string>,
  difficultIds: ReadonlySet<string>,
): string[] {
  if (filter === 'all') return [...itemIds];
  const allowed = filter === 'due' ? dueIds : difficultIds;
  return itemIds.filter((id) => allowed.has(id));
}

export type LearnedMember = {
  itemId: string;
  addedAt: string;
  topicId: string | null;
  own: boolean;
};

export type LearnedGroupBy = 'topic' | 'date';

export type LearnedGroup = {
  key: string;
  topicId: string | null;
  day: string | null;
  own: boolean;
  itemIds: string[];
};

export function groupLearned(
  members: readonly LearnedMember[],
  by: LearnedGroupBy,
): LearnedGroup[] {
  if (by === 'date') return groupByDate(members);
  return groupByTopic(members);
}

/** An empty query keeps every row. Accents and case do not matter. */
export function matchesLearnedQuery(es: string, translation: string, query: string): boolean {
  const needle = foldPhrase(query);
  if (!needle) return true;
  return foldPhrase(es).includes(needle) || foldPhrase(translation).includes(needle);
}

export function membersFromFolder(
  items: readonly { itemId: string; addedAt: string; userItemId: string | null }[],
  lessons: readonly { topicId: string; itemIds: readonly string[] }[],
): LearnedMember[] {
  const topics = new Map<string, string>();
  for (const lesson of lessons) {
    for (const itemId of lesson.itemIds) {
      if (!topics.has(itemId)) topics.set(itemId, lesson.topicId);
    }
  }
  return items.map((item) => {
    const own = item.userItemId != null;
    return {
      itemId: item.itemId,
      addedAt: item.addedAt,
      own,
      topicId: own ? null : (topics.get(item.itemId) ?? null),
    };
  });
}

export function learnedDay(addedAt: string): string {
  const day = addedAt.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : 'unknown';
}

function groupByTopic(members: readonly LearnedMember[]): LearnedGroup[] {
  const groups = new Map<string, LearnedMember[]>();
  const own: LearnedMember[] = [];
  for (const member of members) {
    if (member.own || !member.topicId) {
      own.push(member);
      continue;
    }
    const list = groups.get(member.topicId) ?? [];
    list.push(member);
    groups.set(member.topicId, list);
  }

  const topicGroups = [...groups.entries()]
    .map(([topicId, list]) => ({
      at: list.reduce(
        (min, member) => (member.addedAt < min ? member.addedAt : min),
        list[0]?.addedAt ?? '',
      ),
      group: toGroup(`topic:${topicId}`, topicId, null, false, list),
    }))
    .sort(
      (left, right) =>
        left.at.localeCompare(right.at) || left.group.key.localeCompare(right.group.key),
    )
    .map((entry) => entry.group);

  if (own.length === 0) return topicGroups;
  return [...topicGroups, toGroup('own', null, null, true, own)];
}

function groupByDate(members: readonly LearnedMember[]): LearnedGroup[] {
  const groups = new Map<string, LearnedMember[]>();
  for (const member of members) {
    const day = learnedDay(member.addedAt);
    const list = groups.get(day) ?? [];
    list.push(member);
    groups.set(day, list);
  }
  return [...groups.entries()]
    .map(([day, list]) => toGroup(`day:${day}`, null, day, false, list))
    .sort((left, right) => (right.day ?? '').localeCompare(left.day ?? ''));
}

function toGroup(
  key: string,
  topicId: string | null,
  day: string | null,
  own: boolean,
  members: readonly LearnedMember[],
): LearnedGroup {
  const itemIds = [...members]
    .sort(
      (left, right) =>
        left.addedAt.localeCompare(right.addedAt) || left.itemId.localeCompare(right.itemId),
    )
    .map((member) => member.itemId);
  return { key, topicId, day, own, itemIds };
}
