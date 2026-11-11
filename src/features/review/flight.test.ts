import {
  flightCaughtUp,
  flightDirection,
  REVIEW_CAPTION_MS,
  reviewSlots,
  type ReviewFlight,
} from './flight';

type Keyed = { key: string };

const a = { key: 'a' };
const b = { key: 'b' };
const c = { key: 'c' };

function flight(
  leaving: Keyed,
  arriving: Keyed | null,
  phase: ReviewFlight<Keyed>['phase'],
): ReviewFlight<Keyed> {
  return { leaving, arriving, direction: 'right', rating: 'good', phase };
}

describe('flightDirection', () => {
  it('sends a miss to the left and a remember to the right', () => {
    expect(flightDirection('again')).toBe('left');
    expect(flightDirection('hard')).toBe('left');
    expect(flightDirection('good')).toBe('right');
    expect(flightDirection('easy')).toBe('right');
  });
});

describe('reviewSlots', () => {
  it('mounts the next card before the exit animation', () => {
    expect(REVIEW_CAPTION_MS).toBe(500);
    expect(reviewSlots(a, b, null)).toEqual([
      { card: b, role: 'back' },
      { card: a, role: 'front' },
    ]);
    expect(reviewSlots(a, null, null)).toEqual([{ card: a, role: 'front' }]);
  });

  it('keeps the same two cards mounted while the parent index moves ahead', () => {
    const flying = flight(a, b, 'fly');
    expect(reviewSlots(b, c, flying)).toEqual([
      { card: b, role: 'back' },
      { card: a, role: 'front' },
    ]);
    expect(reviewSlots(b, c, flight(a, b, 'enter'))).toEqual([
      { card: b, role: 'back' },
      { card: a, role: 'front' },
    ]);
  });

  it('drops the leaving card only after the flight finishes and the parent caught up', () => {
    expect(flightCaughtUp(a, flight(a, b, 'done'))).toBe(false);
    expect(reviewSlots(a, b, flight(a, b, 'done'))).toEqual([
      { card: b, role: 'back' },
      { card: a, role: 'front' },
    ]);
    expect(flightCaughtUp(b, flight(a, b, 'done'))).toBe(true);
    expect(reviewSlots(b, c, flight(a, b, 'done'))).toEqual([
      { card: c, role: 'back' },
      { card: b, role: 'front' },
    ]);
  });
});
