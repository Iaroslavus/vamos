import { levenshtein, normalizeForCompare, stripDiacritics } from '@/features/lesson/grading';

import { speechWords } from './score';

/** Words this short do not get a one-edit pass, so neighbors are listed instead. */
export const SHORT_WORD_MAX = 4;

function plain(word: string): string {
  return stripDiacritics(normalizeForCompare(word));
}

export function isShortWord(word: string): boolean {
  const key = plain(word);
  return key.length > 0 && key.length <= SHORT_WORD_MAX;
}

/** Other lexicon spellings one edit away from a short word. Longer words return nothing. */
export function suggestConfusables(word: string, lexicon: readonly string[]): string[] {
  const target = plain(word);
  if (!isShortWord(word)) return [];

  const seen = new Set<string>();
  const suggestions: string[] = [];
  for (const candidate of lexicon) {
    const key = plain(candidate);
    if (!key || key === target || seen.has(key)) continue;
    if (levenshtein(target, key) !== 1) continue;
    seen.add(key);
    suggestions.push(key);
  }
  return suggestions.sort((a, b) => plain(a).localeCompare(plain(b)));
}

/** Authored neighbors first, then generated ones, without duplicate spellings. */
export function mergeConfusables(
  authored: readonly string[],
  suggested: readonly string[],
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const item of [...authored, ...suggested]) {
    const key = plain(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item.trim());
  }
  return merged;
}

export function lexiconOf(items: readonly { es: string }[]): string[] {
  return items.flatMap((item) => speechWords(item.es));
}

/** Hand-written neighbors plus distance-1 words from the course, for this phrase. */
export function confusablesForUnit(
  es: string,
  authored: readonly string[],
  lexicon: readonly string[],
): string[] {
  const suggested = speechWords(es).flatMap((word) => suggestConfusables(word, lexicon));
  return mergeConfusables(authored, suggested);
}

export type ConfusableUnit = {
  id: string;
  es: string;
  confusables?: readonly string[];
};

/** Lines for the content check: authored list and lexicon neighbors of short words. */
export function confusableReportLines(items: readonly ConfusableUnit[]): string[] {
  const lexicon = lexiconOf(items);
  const lines: string[] = [];
  for (const item of items) {
    const authored = item.confusables ?? [];
    const suggested = speechWords(item.es).flatMap((word) => suggestConfusables(word, lexicon));
    const generated = mergeConfusables([], suggested);
    if (authored.length === 0 && generated.length === 0) continue;
    const parts = [
      authored.length > 0 ? `поле ${authored.join(', ')}` : '',
      generated.length > 0 ? `словарь ${generated.join(', ')}` : '',
    ].filter((part) => part.length > 0);
    lines.push(`${item.id}: ${parts.join('; ')}`);
  }
  return lines.sort((a, b) => a.localeCompare(b));
}
