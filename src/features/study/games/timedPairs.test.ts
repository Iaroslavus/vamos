import type { StudyUnit } from '../types';
import { parsePairsRecord, serializePairsRecord } from './pairsRecord';
import {
  EMPTY_TIMED,
  PAIR_PENALTY_MS,
  TIMED_PAIR_COUNT,
  buildTimedRounds,
  formatRaceTime,
  nextPairsRecord,
  pairCount,
  raceTimeMs,
  roundCleared,
  tapTimedTile,
  type TimedTile,
} from './timedPairs';

describe('timed pairs', () => {
  it('builds a grid of six and drops a single leftover', () => {
    const units = Array.from({ length: 7 }, (_, index) => word(index));
    const rounds = buildTimedRounds(units, () => 0);
    expect(rounds).toHaveLength(1);
    expect(pairCount(rounds[0]!)).toBe(TIMED_PAIR_COUNT);
    expect(rounds[0]?.tiles.filter((tile) => tile.side === 'es')).toHaveLength(6);
    expect(rounds[0]?.tiles.filter((tile) => tile.side === 'tr')).toHaveLength(6);
    expect(rounds[0]?.tiles.some((tile) => tile.itemId === 'u6')).toBe(false);
  });

  it('keeps a short last board when two or more units remain', () => {
    const rounds = buildTimedRounds(
      Array.from({ length: 8 }, (_, index) => word(index)),
      () => 0,
    );
    expect(rounds.map((round) => pairCount(round))).toEqual([6, 2]);
  });

  it('does not start a board from one unit', () => {
    expect(buildTimedRounds([word(0)])).toEqual([]);
  });

  it('shuffles the two columns apart', () => {
    const rounds = buildTimedRounds([word(0), word(1), word(2)], () => 0);
    const spanish = rounds[0]?.tiles.filter((tile) => tile.side === 'es').map((tile) => tile.label);
    expect(spanish).toEqual(['es1', 'es2', 'es0']);
  });

  it('matches at once, then adds one second for a miss', () => {
    const es = tile('a', 'es', 'hola');
    const tr = tile('a', 'tr', 'привет');
    const other = tile('b', 'tr', 'пока');
    const picked = tapTimedTile(EMPTY_TIMED, es);
    expect(picked.kind).toBe('pick');
    if (picked.kind !== 'pick') return;

    const miss = tapTimedTile(picked.progress, other);
    expect(miss.kind).toBe('miss');
    if (miss.kind !== 'miss') return;
    expect(miss.progress.penalties).toBe(1);
    expect(miss.progress.miss).toEqual({ esId: 'a', trId: 'b' });
    expect(miss.progress.pick).toBeNull();

    const again = tapTimedTile(miss.progress, es);
    if (again.kind !== 'pick') throw new Error('expected a new pick');
    const match = tapTimedTile(again.progress, tr);
    expect(match.kind).toBe('match');
    if (match.kind !== 'match') return;
    expect(match.progress.matched).toEqual(['a']);
    expect(match.progress.penalties).toBe(1);
    expect(roundCleared(match.progress, 1)).toBe(true);
    expect(tapTimedTile(match.progress, es).kind).toBe('ignore');
  });

  it('adds the penalty to the clock and formats tenths', () => {
    expect(raceTimeMs(1_000, 3_500, 2)).toBe(2_500 + PAIR_PENALTY_MS * 2);
    expect(raceTimeMs(5_000, 1_000, 1)).toBe(PAIR_PENALTY_MS);
    expect(formatRaceTime(0)).toBe('0:00.0');
    expect(formatRaceTime(12_500)).toBe('0:12.5');
    expect(formatRaceTime(65_040)).toBe('1:05.0');
  });

  it('keeps the folder record for a full board only', () => {
    expect(nextPairsRecord(null, 12_000, 6)).toBe(12_000);
    expect(nextPairsRecord(12_000, 9_000, 6)).toBe(9_000);
    expect(nextPairsRecord(9_000, 11_000, 6)).toBe(9_000);
    expect(nextPairsRecord(9_000, 1_000, 2)).toBe(9_000);
    expect(nextPairsRecord(null, 1_000, 4)).toBeNull();
  });

  it('stores the record as whole milliseconds', () => {
    expect(parsePairsRecord(null)).toBeNull();
    expect(parsePairsRecord('nope')).toBeNull();
    expect(parsePairsRecord(JSON.stringify({ ms: -1 }))).toBeNull();
    expect(parsePairsRecord(serializePairsRecord(1500.9))).toBe(1500);
  });
});

function word(index: number): StudyUnit {
  return {
    id: `u${index}`,
    es: `es${index}`,
    tr: `tr${index}`,
    audio: null,
    introduced: true,
    state: 2,
    due: false,
    hard: false,
    recall: false,
  };
}

function tile(itemId: string, side: 'es' | 'tr', label: string): TimedTile {
  return { id: `${itemId}:${side}`, itemId, side, label };
}
