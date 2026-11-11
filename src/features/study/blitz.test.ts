import { BLITZ_MS, blitzRemainingMs, formatBlitzClock } from './blitz';

describe('blitz clock', () => {
  it('counts two minutes down to zero', () => {
    expect(BLITZ_MS).toBe(120_000);
    expect(blitzRemainingMs(1_000, 1_000)).toBe(120_000);
    expect(blitzRemainingMs(1_000, 1_000 + 30_000)).toBe(90_000);
    expect(blitzRemainingMs(1_000, 1_000 + 120_000)).toBe(0);
    expect(blitzRemainingMs(1_000, 500)).toBe(120_000);
    expect(blitzRemainingMs(Number.NaN, 1_000)).toBe(120_000);
  });

  it('formats the remaining time as minutes and seconds', () => {
    expect(formatBlitzClock(120_000)).toBe('2:00');
    expect(formatBlitzClock(59_000)).toBe('0:59');
    expect(formatBlitzClock(1)).toBe('0:01');
    expect(formatBlitzClock(0)).toBe('0:00');
  });
});
