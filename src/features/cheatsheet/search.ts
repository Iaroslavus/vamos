import type { LocalizedText } from '@/features/content/schema';

import { normalizeSearch } from './normalize';

export type SearchPhrase = {
  id: string;
  es: string;
  tr: LocalizedText;
};

export type SearchTopic = {
  id: string;
  title: LocalizedText;
  canDo: readonly LocalizedText[];
  tags?: {
    ru?: readonly string[];
    uk?: readonly string[];
    en?: readonly string[];
  };
  phrases: readonly SearchPhrase[];
};

/** 0 title, 1 tags, 2 can-do or a phrase. */
export type SearchRank = 0 | 1 | 2;

export type SearchHit = {
  id: string;
  rank: SearchRank;
};

const LOCALES = ['ru', 'uk', 'en'] as const;

/**
 * Local topic search. Empty text matches nothing.
 * A topic is ranked by its best hit: title, then tags, then a phrase or can-do.
 * Ties keep the order of `topics`.
 */
export function searchTopics(topics: readonly SearchTopic[], query: string): SearchHit[] {
  const needle = normalizeSearch(query);
  if (!needle) return [];

  const hits: { id: string; rank: SearchRank; index: number }[] = [];
  topics.forEach((topic, index) => {
    const rank = rankOf(topic, needle);
    if (rank == null) return;
    hits.push({ id: topic.id, rank, index });
  });
  hits.sort((left, right) => left.rank - right.rank || left.index - right.index);
  return hits.map(({ id, rank }) => ({ id, rank }));
}

function rankOf(topic: SearchTopic, needle: string): SearchRank | null {
  if (includesText(topic.title, needle)) return 0;
  if (includesTags(topic.tags, needle)) return 1;
  if (topic.canDo.some((line) => includesText(line, needle))) return 2;
  if (
    topic.phrases.some(
      (phrase) => normalizeSearch(phrase.es).includes(needle) || includesText(phrase.tr, needle),
    )
  ) {
    return 2;
  }
  return null;
}

function includesText(text: LocalizedText | null | undefined, needle: string): boolean {
  if (!text) return false;
  return LOCALES.some((locale) => {
    const value = text[locale];
    if (!value) return false;
    return normalizeSearch(value).includes(needle);
  });
}

function includesTags(tags: SearchTopic['tags'], needle: string): boolean {
  if (!tags) return false;
  return LOCALES.some((locale) =>
    (tags[locale] ?? []).some((tag) => normalizeSearch(tag).includes(needle)),
  );
}
