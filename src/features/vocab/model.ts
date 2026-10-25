export const FOLDER_COLORS = ['coral', 'saffron', 'teal', 'blue', 'ink'] as const;
export type FolderColor = (typeof FOLDER_COLORS)[number];

export const FOLDER_NAME_MAX = 40;
export const ITEM_ID_MAX = 100;

/** Again ratings inside this window count toward «Сложные». */
export const DIFFICULT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
export const DIFFICULT_MIN_ERRORS = 2;

export type SystemKey = 'favorites' | 'difficult';

export type MistakeLog = {
  itemId: string;
  rating: string;
  reviewedAt: string;
};

export type TopicSeedSource = {
  id: string;
  title: string;
  lessonIds: readonly string[];
};

export type LessonSeedSource = {
  id: string;
  topicId: string;
  itemIds: readonly string[];
};

export type TopicSeed = {
  topicId: string;
  name: string;
  itemIds: readonly string[];
};

const LEGACY_ID_MAX = ITEM_ID_MAX;

export function isFolderColor(value: string): value is FolderColor {
  return (FOLDER_COLORS as readonly string[]).includes(value);
}

/** Trimmed name within the column limit, or null when the learner should edit it. */
export function parseFolderName(value: string): string | null {
  const name = value.trim();
  if (name.length < 1 || name.length > FOLDER_NAME_MAX) return null;
  return name;
}

export function cleanItemId(value: string): string | null {
  const id = value.trim();
  if (id.length < 1 || id.length > ITEM_ID_MAX) return null;
  return id;
}

/**
 * Items with at least {@link DIFFICULT_MIN_ERRORS} Again ratings in the window
 * ending at `now`. Hard, Good, and Easy are not errors. One mistake is not enough.
 */
export function difficultItemIds(logs: readonly MistakeLog[], now: Date): string[] {
  const end = now.getTime();
  const start = end - DIFFICULT_WINDOW_MS;
  const counts = new Map<string, number>();

  for (const log of logs) {
    if (log.rating !== 'again') continue;
    const at = Date.parse(log.reviewedAt);
    if (Number.isNaN(at) || at < start || at > end) continue;
    const itemId = cleanItemId(log.itemId);
    if (!itemId) continue;
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= DIFFICULT_MIN_ERRORS)
    .map(([itemId]) => itemId)
    .sort((left, right) => left.localeCompare(right));
}

/**
 * A topic folder appears once every lesson in the topic is completed.
 * Item ids follow lesson order, without duplicates. The name is clamped to the column.
 */
export function topicSeeds(
  topics: readonly TopicSeedSource[],
  lessons: readonly LessonSeedSource[],
  completedIds: readonly string[],
): TopicSeed[] {
  const completed = new Set(completedIds);
  const itemsByTopic = new Map<string, string[]>();

  for (const lesson of lessons) {
    const list = itemsByTopic.get(lesson.topicId) ?? [];
    for (const raw of lesson.itemIds) {
      const itemId = cleanItemId(raw);
      if (!itemId || list.includes(itemId)) continue;
      list.push(itemId);
    }
    itemsByTopic.set(lesson.topicId, list);
  }

  const seeds: TopicSeed[] = [];
  for (const topic of topics) {
    if (topic.lessonIds.length === 0) continue;
    if (!topic.lessonIds.every((id) => completed.has(id))) continue;
    const topicId = cleanItemId(topic.id);
    const name = clampFolderName(topic.title, topic.id);
    if (!topicId || !name) continue;
    seeds.push({
      topicId,
      name,
      itemIds: itemsByTopic.get(topic.id) ?? [],
    });
  }
  return seeds;
}

export function countMatchingCards(
  cards: readonly { itemId: string }[],
  itemIds: readonly string[],
): number {
  if (itemIds.length === 0 || cards.length === 0) return 0;
  const wanted = new Set(itemIds);
  let count = 0;
  for (const card of cards) {
    if (wanted.has(card.itemId)) count += 1;
  }
  return count;
}

export function sortFolders<
  T extends {
    systemKey: SystemKey | null;
    topicId: string | null;
    name: string;
    createdAt: string;
  },
>(folders: readonly T[]): T[] {
  return [...folders].sort((left, right) => {
    const rank = folderRank(left) - folderRank(right);
    if (rank !== 0) return rank;
    const byName = left.name.localeCompare(right.name, 'ru');
    if (byName !== 0) return byName;
    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function folderHoldsAll(
  items: readonly { folderId: string; itemId: string }[],
  folderId: string,
  itemIds: readonly string[],
): boolean {
  if (itemIds.length === 0) return false;
  const held = new Set<string>();
  for (const item of items) {
    if (item.folderId === folderId) held.add(item.itemId);
  }
  return itemIds.every((id) => held.has(id));
}

/** Zustand persist payload from the old local «Избранное» list. */
export function parseLegacyFavoriteIds(raw: string | null): string[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (typeof parsed !== 'object' || parsed === null) return [];
  const state = 'state' in parsed ? parsed.state : parsed;
  if (typeof state !== 'object' || state === null || !('itemIds' in state)) return [];
  const ids = state.itemIds;
  if (!Array.isArray(ids)) return [];

  const unique: string[] = [];
  for (const id of ids) {
    if (typeof id !== 'string') continue;
    const cleaned = cleanItemId(id);
    if (!cleaned || cleaned.length > LEGACY_ID_MAX || unique.includes(cleaned)) continue;
    unique.push(cleaned);
  }
  return unique;
}

function folderRank(folder: { systemKey: SystemKey | null; topicId: string | null }): number {
  if (folder.systemKey === 'favorites') return 0;
  if (folder.systemKey === 'difficult') return 1;
  if (folder.topicId) return 2;
  return 3;
}

function clampFolderName(value: string, fallback: string): string | null {
  const trimmed = value.trim();
  const source = trimmed.length > 0 ? trimmed : fallback.trim();
  if (source.length < 1) return null;
  if (source.length <= FOLDER_NAME_MAX) return source;
  const cut = source.slice(0, FOLDER_NAME_MAX).trim();
  return cut.length > 0 ? cut : null;
}
