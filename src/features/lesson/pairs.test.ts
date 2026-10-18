import { serializePairs, shuffleInPlace } from './pairs';

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
