import { dueUnitCount, learnedUnitCount, nextDueInMs, reviewMinutes } from './units';

const NOW = new Date('2026-10-23T18:00:00.000Z');

function card(itemId: string, due: string) {
  return { itemId, due };
}

describe('due units', () => {
  it('counts a unit once when both directions are due', () => {
    const due = NOW.toISOString();
    expect(
      dueUnitCount(
        [
          card('hola', due),
          card('hola', due),
          card('adios', due),
          card('later', '2026-10-24T00:00:00.000Z'),
          card('', due),
        ],
        NOW,
      ),
    ).toBe(2);
  });

  it('counts learned units, not cards', () => {
    expect(
      learnedUnitCount([
        { itemId: 'hola' },
        { itemId: 'hola' },
        { itemId: 'adios' },
        { itemId: '' },
      ]),
    ).toBe(2);
    expect(learnedUnitCount([])).toBe(0);
  });

  it('names the soonest card that is still ahead', () => {
    expect(
      nextDueInMs(
        [
          card('past', '2026-10-23T12:00:00.000Z'),
          card('soon', '2026-10-23T18:10:00.000Z'),
          card('later', '2026-10-24T18:00:00.000Z'),
          card('bad', 'not-a-date'),
        ],
        NOW,
      ),
    ).toBe(10 * 60 * 1000);
    expect(nextDueInMs([card('past', NOW.toISOString())], NOW)).toBeNull();
  });

  it('turns 15 seconds per unit into whole minutes', () => {
    expect(reviewMinutes(0)).toBe(0);
    expect(reviewMinutes(1)).toBe(1);
    expect(reviewMinutes(4)).toBe(1);
    expect(reviewMinutes(5)).toBe(2);
    expect(reviewMinutes(8)).toBe(2);
    expect(reviewMinutes(-3)).toBe(0);
  });
});
