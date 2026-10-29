import type { MatchPair } from './store';

const PAIR_SEP = '::';
const LIST_SEP = '|';

export type PairProgress = {
  locked: readonly MatchPair[];
  mistakes: number;
  wrongKeys: readonly string[];
};

export type PairAttempt = PairProgress & {
  outcome: 'correct' | 'wrong';
  /** Tiles to shake when the attempt is wrong. */
  flash: { left: string; right: string } | null;
};

export function isExpectedPair(pairs: readonly MatchPair[], left: string, right: string): boolean {
  return pairs.some((pair) => pair.left === left && pair.right === right);
}

/**
 * Instant match check. A correct pair is locked. A wrong pair counts a mistake,
 * marks both sides, and does not stay selected.
 */
export function resolvePairAttempt(
  expected: readonly MatchPair[],
  state: PairProgress,
  left: string,
  right: string,
): PairAttempt {
  if (isExpectedPair(expected, left, right)) {
    return {
      locked: [...state.locked, { left, right }],
      mistakes: state.mistakes,
      wrongKeys: state.wrongKeys,
      outcome: 'correct',
      flash: null,
    };
  }

  const wrongKeys = new Set(state.wrongKeys);
  wrongKeys.add(left);
  const owner = expected.find((pair) => pair.right === right);
  if (owner) wrongKeys.add(owner.left);

  return {
    locked: state.locked,
    mistakes: state.mistakes + 1,
    wrongKeys: [...wrongKeys],
    outcome: 'wrong',
    flash: { left, right },
  };
}

/** Canonical answer string for match_pairs grading (order-independent). */
export function serializePairs(pairs: readonly MatchPair[]): string {
  return [...pairs]
    .map((pair) => `${pair.left}${PAIR_SEP}${pair.right}`)
    .sort((a, b) => a.localeCompare(b))
    .join(LIST_SEP);
}

/** How many pairs are encoded in a serialized match_pairs answer. */
export function countSerializedPairs(serialized: string): number {
  const trimmed = serialized.trim();
  if (!trimmed) return 0;
  return trimmed.split(LIST_SEP).filter((part) => part.length > 0).length;
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
