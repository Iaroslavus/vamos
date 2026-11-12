import type { StudyUnit } from '../types';

/** Pairs on one timed board. A leftover single unit cannot start a board. */
export const TIMED_PAIR_COUNT = 6;

/** Added to the clock for each wrong pair. */
export const PAIR_PENALTY_MS = 1000;

/** How long a matched pair takes to leave the grid. */
export const PAIR_EXIT_MS = 220;

export type TimedSide = 'es' | 'tr';

export type TimedTile = {
  id: string;
  itemId: string;
  side: TimedSide;
  label: string;
};

export type TimedRound = {
  id: string;
  tiles: readonly TimedTile[];
};

export type TimedPick = {
  itemId: string;
  side: TimedSide;
};

export type TimedMiss = {
  esId: string;
  trId: string;
};

export type TimedProgress = {
  matched: readonly string[];
  pick: TimedPick | null;
  penalties: number;
  miss: TimedMiss | null;
};

export const EMPTY_TIMED: TimedProgress = {
  matched: [],
  pick: null,
  penalties: 0,
  miss: null,
};

export type TimedTap =
  | { kind: 'ignore' }
  | { kind: 'pick'; progress: TimedProgress }
  | { kind: 'match'; progress: TimedProgress; itemId: string }
  | { kind: 'miss'; progress: TimedProgress };

/**
 * Boards of up to six pairs.
 * Spanish and the translation are shuffled apart so a row is not the answer.
 * One leftover unit is left out: a pair needs two tiles.
 */
export function buildTimedRounds(
  units: readonly StudyUnit[],
  random: () => number = Math.random,
): TimedRound[] {
  const ready = units.filter((unit) => unit.es.trim().length > 0 && unit.tr.trim().length > 0);
  const rounds: TimedRound[] = [];
  let cursor = 0;
  let index = 0;

  while (cursor < ready.length) {
    const remaining = ready.length - cursor;
    if (remaining < 2) break;
    const size = Math.min(TIMED_PAIR_COUNT, remaining);
    const chunk = ready.slice(cursor, cursor + size);
    cursor += size;
    rounds.push({
      id: `pairs-${index}`,
      tiles: [
        ...shuffle(
          chunk.map((unit) => tileOf(unit, 'es')),
          random,
        ),
        ...shuffle(
          chunk.map((unit) => tileOf(unit, 'tr')),
          random,
        ),
      ],
    });
    index += 1;
  }

  return rounds;
}

/**
 * First tap selects. The other side resolves at once.
 * A match removes the pair. A miss adds one penalty second and clears the tap.
 */
export function tapTimedTile(progress: TimedProgress, tile: TimedTile): TimedTap {
  if (progress.matched.includes(tile.itemId)) return { kind: 'ignore' };

  const pick = progress.pick;
  if (!pick || pick.side === tile.side) {
    const same = pick?.itemId === tile.itemId && pick.side === tile.side;
    return {
      kind: 'pick',
      progress: {
        ...progress,
        pick: same ? null : { itemId: tile.itemId, side: tile.side },
        miss: null,
      },
    };
  }

  if (pick.itemId === tile.itemId) {
    return {
      kind: 'match',
      itemId: tile.itemId,
      progress: {
        matched: [...progress.matched, tile.itemId],
        pick: null,
        penalties: progress.penalties,
        miss: null,
      },
    };
  }

  return {
    kind: 'miss',
    progress: {
      matched: progress.matched,
      pick: null,
      penalties: progress.penalties + 1,
      miss: {
        esId: pick.side === 'es' ? pick.itemId : tile.itemId,
        trId: pick.side === 'tr' ? pick.itemId : tile.itemId,
      },
    },
  };
}

export function roundCleared(progress: TimedProgress, pairs: number): boolean {
  return pairs > 0 && progress.matched.length >= pairs;
}

/** Elapsed time plus one second for every miss. Never negative. */
export function raceTimeMs(startedAt: number, now: number, penalties: number): number {
  return Math.max(0, now - startedAt) + Math.max(0, penalties) * PAIR_PENALTY_MS;
}

/** `m:ss.t`, tenths included so a penalty is visible on the clock. */
export function formatRaceTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const tenths = Math.floor((total % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

/** Comma for Ukrainian and Russian, dot for English. */
export function resultDecimal(language: string): ',' | '.' {
  return language.toLowerCase().startsWith('en') ? '.' : ',';
}

/**
 * Quiet result clock: `8,6` under a minute, `1:05,0` after.
 * The caller adds the seconds unit and the record phrase.
 */
export function formatResultClock(ms: number, decimal: ',' | '.' = ','): string {
  const total = Math.max(0, Math.floor(Number.isFinite(ms) ? ms : 0));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const tenths = Math.floor((total % 1000) / 100);
  const fraction = `${decimal}${tenths}`;
  if (minutes === 0) return `${seconds}${fraction}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}${fraction}`;
}

/** New order for the two columns. Matches stay attached to the same tiles. */
export function shuffleRoundTiles(
  round: TimedRound,
  random: () => number = Math.random,
): TimedRound {
  return {
    ...round,
    tiles: [
      ...shuffle(
        round.tiles.filter((tile) => tile.side === 'es'),
        random,
      ),
      ...shuffle(
        round.tiles.filter((tile) => tile.side === 'tr'),
        random,
      ),
    ],
  };
}

export function pairCount(round: TimedRound): number {
  return round.tiles.filter((tile) => tile.side === 'es').length;
}

export function columnTiles(round: TimedRound, side: TimedSide): TimedTile[] {
  return round.tiles.filter((tile) => tile.side === side);
}

/**
 * The folder record is the best time on a full board of six.
 * A shorter board is played, but it cannot replace that record.
 */
export function nextPairsRecord(
  bestMs: number | null,
  timeMs: number,
  pairs: number,
): number | null {
  if (pairs !== TIMED_PAIR_COUNT) return bestMs;
  if (!Number.isFinite(timeMs) || timeMs < 0) return bestMs;
  if (bestMs == null || timeMs < bestMs) return timeMs;
  return bestMs;
}

export function tileShaking(progress: TimedProgress, tile: TimedTile): boolean {
  const miss = progress.miss;
  if (!miss) return false;
  return tile.side === 'es' ? miss.esId === tile.itemId : miss.trId === tile.itemId;
}

function tileOf(unit: StudyUnit, side: TimedSide): TimedTile {
  return {
    id: `${unit.id}:${side}`,
    itemId: unit.id,
    side,
    label: side === 'es' ? unit.es : unit.tr,
  };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = copy[index]!;
    copy[index] = copy[swap]!;
    copy[swap] = current;
  }
  return copy;
}
