import { useEffect, useMemo, useState } from 'react';

import { track } from '@/lib/analytics';

import { buildCheatsheetIndex, popularTopicIds, type CheatsheetEntry } from '../catalog';
import { normalizeSearch } from '../normalize';
import { searchTopics, type SearchHit } from '../search';

export function useCheatsheetQuery(routeTopicId: string | null) {
  const index = useMemo(() => buildCheatsheetIndex(), []);
  const popularIds = useMemo(() => popularTopicIds(index), [index]);
  const [query, setQuery] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(routeTopicId);
  const [trackedNeedle, setTrackedNeedle] = useState('');
  const hits = useMemo(() => searchTopics(index, query), [index, query]);
  const needle = normalizeSearch(query);
  const selectedId =
    needle === trackedNeedle ? pickedId : chooseTopic(needle, hits, pickedId, routeTopicId);

  if (needle !== trackedNeedle) {
    setTrackedNeedle(needle);
    setPickedId(selectedId);
  }
  const byId = useMemo(() => new Map(index.map((entry) => [entry.id, entry])), [index]);
  const showingPopular = needle.length === 0 || hits.length === 0;

  useEffect(() => {
    if (needle.length === 0) return;
    const timer = setTimeout(() => {
      track('cheatsheet_search', { query_length: needle.length, results: hits.length });
    }, 400);
    return () => clearTimeout(timer);
  }, [hits.length, needle]);

  const chipIds = useMemo(() => {
    const base = showingPopular ? popularIds : hits.map((hit) => hit.id);
    if (showingPopular && selectedId && !base.includes(selectedId)) {
      return [selectedId, ...base];
    }
    return base;
  }, [hits, popularIds, selectedId, showingPopular]);

  const chips = chipIds.flatMap((id) => {
    const entry = byId.get(id);
    return entry ? [entry] : [];
  });

  return {
    query,
    setQuery,
    selectedId,
    setSelectedId: setPickedId,
    chips,
    entry: selectedId ? (byId.get(selectedId) ?? null) : null,
  };
}

/** Keep the current topic when it still matches. A blank query falls back to the route. */
function chooseTopic(
  needle: string,
  hits: readonly SearchHit[],
  current: string | null,
  routeTopicId: string | null,
): string | null {
  if (needle.length === 0) return current ?? routeTopicId;
  if (hits.length === 0) return null;
  if (current && hits.some((hit) => hit.id === current)) return current;
  return hits[0]?.id ?? null;
}

export type { CheatsheetEntry };
