import type { MatchPair } from './store';

const PAIR_SEP = '::';
const LIST_SEP = '|';

/** Canonical answer string for match_pairs grading (order-independent). */
export function serializePairs(pairs: readonly MatchPair[]): string {
  return [...pairs]
    .map((pair) => `${pair.left}${PAIR_SEP}${pair.right}`)
    .sort((a, b) => a.localeCompare(b))
    .join(LIST_SEP);
}

export function shuffleInPlace<T>(items: T[], random: () => number = Math.random): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}
