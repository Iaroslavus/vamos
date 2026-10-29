import {
  countSerializedPairs,
  resolvePairAttempt,
  serializePairs,
  shuffleInPlace,
  type PairProgress,
} from './pairs';

describe('serializePairs', () => {
  it('is order-independent', () => {
    const a = serializePairs([
      { left: 'hola', right: 'привет' },
      { left: 'adiós', right: 'пока' },
    ]);
    const b = serializePairs([
      { left: 'adiós', right: 'пока' },
      { left: 'hola', right: 'привет' },
    ]);
    expect(a).toBe(b);
  });
});

describe('countSerializedPairs', () => {
  it('counts pairs and treats empty as zero', () => {
    expect(countSerializedPairs('')).toBe(0);
    expect(countSerializedPairs('hola::привет')).toBe(1);
    expect(
      countSerializedPairs(
        serializePairs([
          { left: 'a', right: '1' },
          { left: 'b', right: '2' },
        ]),
      ),
    ).toBe(2);
  });
});

const PAIRS = [
  { left: 'buenas tardes', right: 'добрий день' },
  { left: 'hola', right: 'привіт' },
] as const;

const EMPTY: PairProgress = { locked: [], mistakes: 0, wrongKeys: [] };

describe('resolvePairAttempt', () => {
  it('locks a correct pair immediately and does not count a mistake', () => {
    const next = resolvePairAttempt(PAIRS, EMPTY, 'buenas tardes', 'добрий день');
    expect(next.outcome).toBe('correct');
    expect(next.mistakes).toBe(0);
    expect(next.flash).toBeNull();
    expect(next.locked).toEqual([{ left: 'buenas tardes', right: 'добрий день' }]);
  });

  it('counts a wrong pair, marks both sides, and leaves nothing locked', () => {
    const next = resolvePairAttempt(PAIRS, EMPTY, 'buenas tardes', 'привіт');
    expect(next.outcome).toBe('wrong');
    expect(next.mistakes).toBe(1);
    expect(next.locked).toEqual([]);
    expect(next.flash).toEqual({ left: 'buenas tardes', right: 'привіт' });
    expect(next.wrongKeys).toEqual(['buenas tardes', 'hola']);

    const again = resolvePairAttempt(PAIRS, next, 'hola', 'добрий день');
    expect(again.mistakes).toBe(2);
    expect(again.wrongKeys).toEqual(['buenas tardes', 'hola']);
  });
});

describe('shuffleInPlace', () => {
  it('permutes with a deterministic RNG', () => {
    const seq = [0.9, 0.1, 0.5];
    let i = 0;
    const items = [1, 2, 3];
    shuffleInPlace(items, () => seq[i++] ?? 0);
    expect(items).toHaveLength(3);
    expect(new Set(items)).toEqual(new Set([1, 2, 3]));
  });
});
