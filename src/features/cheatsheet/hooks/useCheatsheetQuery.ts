import { useEffect, useMemo, useState } from 'react';

import { track } from '@/lib/analytics';

import { buildCheatsheetIndex, courseLevels, type CheatsheetEntry } from '../catalog';
import { normalizeSearch } from '../normalize';
import { searchTopics, type SearchHit } from '../search';

export function useCheatsheetQuery(routeTopicId: string | null) {
  const index = useMemo(() => buildCheatsheetIndex(), []);
  const levels = useMemo(() => courseLevels(index), [index]);
  const [query, setQuery] = useState('');
  const [level, setLevelState] = useState<string | null>(
    () => levelOf(index, routeTopicId) ?? levels[0]?.level ?? null,
  );
  const [pickedId, setPickedId] = useState<string | null>(routeTopicId);
  const [seenRouteId, setSeenRouteId] = useState(routeTopicId);
  const [trackedNeedle, setTrackedNeedle] = useState('');
  const hits = useMemo(() => searchTopics(index, query), [index, query]);
  const needle = normalizeSearch(query);
  const selectedId =
    needle === trackedNeedle ? pickedId : chooseTopic(needle, hits, pickedId, routeTopicId);

  if (needle !== trackedNeedle) {
    setTrackedNeedle(needle);
    setPickedId(selectedId);
  }
  if (routeTopicId && routeTopicId !== seenRouteId) {
    setSeenRouteId(routeTopicId);
    setPickedId(routeTopicId);
    const nextLevel = levelOf(index, routeTopicId);
    if (nextLevel) setLevelState(nextLevel);
  }
  const byId = useMemo(() => new Map(index.map((entry) => [entry.id, entry])), [index]);
  const browsing = needle.length === 0;

  useEffect(() => {
    if (needle.length === 0) return;
    const timer = setTimeout(() => {
      track('cheatsheet_search', { query_length: needle.length, results: hits.length });
    }, 400);
    return () => clearTimeout(timer);
  }, [hits.length, needle]);

  const chipIds = useMemo(() => {
    if (!browsing && hits.length > 0) return hits.map((hit) => hit.id);
    const ids = levels.find((entry) => entry.level === level)?.ids ?? [];
    if (selectedId && !ids.includes(selectedId)) return [selectedId, ...ids];
    return ids;
  }, [browsing, hits, level, levels, selectedId]);

  const levelIds = levels.find((entry) => entry.level === level)?.ids ?? [];
  const shownId = selectedId ?? (browsing ? (levelIds[0] ?? null) : null);
  const chips = chipIds.flatMap((id) => {
    const entry = byId.get(id);
    return entry ? [entry] : [];
  });

  const setLevel = (next: string) => {
    setLevelState(next);
    const ids = levels.find((entry) => entry.level === next)?.ids ?? [];
    setPickedId((current) => (current && ids.includes(current) ? current : (ids[0] ?? null)));
  };

  const setSelectedId = (id: string) => {
    setPickedId(id);
    const nextLevel = byId.get(id)?.level;
    if (nextLevel) setLevelState(nextLevel);
  };

  return {
    query,
    setQuery,
    selectedId: shownId,
    setSelectedId,
    chips,
    levels,
    level,
    setLevel,
    browsing,
    entry: shownId ? (byId.get(shownId) ?? null) : null,
  };
}

function levelOf(index: readonly CheatsheetEntry[], topicId: string | null): string | null {
  if (!topicId) return null;
  return index.find((entry) => entry.id === topicId)?.level ?? null;
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
