export type PhraseCandidate = {
  id: string;
  es: string;
  translation: string;
};

/**
 * Match a course phrase by its Spanish line or by the translation
 * in the language the learner is using right now.
 * Accents and case do not matter. An empty query matches nothing.
 */
export function searchPhrases(items: readonly PhraseCandidate[], query: string): PhraseCandidate[] {
  const needle = foldPhrase(query);
  if (!needle) return [];
  const seen = new Set<string>();
  const matches: PhraseCandidate[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    if (!foldPhrase(item.es).includes(needle) && !foldPhrase(item.translation).includes(needle))
      continue;
    seen.add(item.id);
    matches.push(item);
  }
  return matches.sort(
    (left, right) => left.es.localeCompare(right.es, 'es') || left.id.localeCompare(right.id),
  );
}

/** Case and accents do not change the phrase. Punctuation stays. */
export function foldPhrase(value: string): string {
  return value.trim().toLocaleLowerCase('es').normalize('NFD').replace(/\p{M}/gu, '');
}
