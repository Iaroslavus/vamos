import {
  buildReviewQueue,
  describeIntervals,
  faceText,
  formatInterval,
  NEW_CARDS_PER_DAY,
  reviewAccuracy,
  reviewSessionXp,
  REVIEWS_PER_DAY,
  REVIEW_SESSION_XP,
} from './session';
import type { StoredCard } from './types';

const NOW = new Date('2026-10-23T18:00:00.000Z');
const UTC = 'UTC';
const LOS_ANGELES = 'America/Los_Angeles';

function stored(overrides: Partial<StoredCard> & Pick<StoredCard, 'id' | 'itemId'>): StoredCard {
  return {
    direction: 'es_to_ru',
    due: NOW.toISOString(),
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    lastReview: null,
    ...overrides,
  };
}

function many(count: number, state: number, prefix: string): StoredCard[] {
  return Array.from({ length: count }, (_, index) =>
    stored({
      id: `${prefix}-${index}`,
      itemId: `${prefix}-${index}`,
      state,
      reps: state === 0 ? 0 : 3,
      due: new Date(NOW.getTime() - index * 1000).toISOString(),
    }),
  );
}

describe('review session', () => {
  it('formats the gap until the card returns', () => {
    expect(formatInterval(10 * 60 * 1000)).toEqual({ unit: 'minutes', count: 10 });
    expect(formatInterval(20 * 1000)).toEqual({ unit: 'minutes', count: 1 });
    expect(formatInterval(90 * 60 * 1000)).toEqual({ unit: 'hours', count: 2 });
    expect(formatInterval(3 * 24 * 60 * 60 * 1000)).toEqual({ unit: 'days', count: 3 });
    expect(formatInterval(36 * 60 * 60 * 1000)).toEqual({ unit: 'days', count: 2 });
  });

  it('previews an interval label for every rating', () => {
    const labels = describeIntervals(stored({ id: 'hola', itemId: 'hola' }), NOW);

    expect(labels.again.count).toBeGreaterThan(0);
    expect(labels.hard.count).toBeGreaterThan(0);
    expect(labels.good.count).toBeGreaterThan(0);
    expect(labels.easy.count).toBeGreaterThan(0);
  });

  it('puts due reviews ahead of new cards and leaves future cards out', () => {
    const queue = buildReviewQueue({
      cards: [
        stored({ id: 'later', itemId: 'later', state: 2, due: '2026-10-24T00:00:00.000Z' }),
        stored({ id: 'fresh', itemId: 'fresh', due: '2026-10-23T12:00:00.000Z' }),
        stored({ id: 'review', itemId: 'review', state: 2, reps: 4 }),
      ],
      logs: [],
      now: NOW,
      timeZone: UTC,
    });

    expect(queue.cards.map((card) => card.id)).toEqual(['review', 'fresh']);
    expect(queue.capped).toBe(false);
  });

  it('stops at 20 new cards and 200 reviews', () => {
    const queue = buildReviewQueue({
      cards: [...many(REVIEWS_PER_DAY + 5, 2, 'review'), ...many(NEW_CARDS_PER_DAY + 3, 0, 'new')],
      logs: [],
      now: NOW,
      timeZone: UTC,
    });

    expect(queue.cards.filter((card) => card.state !== 0)).toHaveLength(REVIEWS_PER_DAY);
    expect(queue.cards.filter((card) => card.state === 0)).toHaveLength(NEW_CARDS_PER_DAY);
    expect(queue.cards[0]?.state).not.toBe(0);
    expect(queue.capped).toBe(true);
  });

  it('counts today in the learner zone, and does not let one cap spend the other', () => {
    const earlyUtc = '2026-10-23T06:00:00.000Z';
    const logs = [
      ...Array.from({ length: NEW_CARDS_PER_DAY }, () => ({ reviewedAt: earlyUtc, state: 0 })),
      { reviewedAt: NOW.toISOString(), state: 2 },
    ];
    const cards = [
      stored({ id: 'review', itemId: 'review', state: 2, reps: 2 }),
      stored({ id: 'fresh', itemId: 'fresh' }),
    ];

    const inUtc = buildReviewQueue({ cards, logs, now: NOW, timeZone: UTC });
    expect(inUtc.cards.map((card) => card.id)).toEqual(['review']);
    expect(inUtc.capped).toBe(true);

    const inLosAngeles = buildReviewQueue({
      cards,
      logs,
      now: NOW,
      timeZone: LOS_ANGELES,
    });
    expect(inLosAngeles.cards.map((card) => card.id)).toEqual(['review', 'fresh']);
    expect(inLosAngeles.capped).toBe(false);
  });

  it('hides a full day even when cards are still due', () => {
    const logs = [
      ...Array.from({ length: NEW_CARDS_PER_DAY }, () => ({
        reviewedAt: NOW.toISOString(),
        state: 0,
      })),
      ...Array.from({ length: REVIEWS_PER_DAY }, () => ({
        reviewedAt: NOW.toISOString(),
        state: 2,
      })),
    ];
    const queue = buildReviewQueue({
      cards: [
        stored({ id: 'fresh', itemId: 'fresh' }),
        stored({ id: 'review', itemId: 'old', state: 2 }),
      ],
      logs,
      now: NOW,
      timeZone: UTC,
    });

    expect(queue.cards).toEqual([]);
    expect(queue.capped).toBe(true);
  });

  it('awards 5 XP once a session reaches 10 cards', () => {
    expect(reviewSessionXp(9)).toBe(0);
    expect(reviewSessionXp(10)).toBe(REVIEW_SESSION_XP);
    expect(reviewSessionXp(200)).toBe(REVIEW_SESSION_XP);
    expect(reviewSessionXp(10.5)).toBe(0);
  });

  it('counts Again as a miss and every other rating as remembered', () => {
    expect(reviewAccuracy([])).toBe(0);
    expect(reviewAccuracy(['again'])).toBe(0);
    expect(reviewAccuracy(['again', 'hard', 'good', 'easy'])).toBe(0.75);
  });

  it('shows the Spanish word first for recognition and the translation first for recall', () => {
    const word = { es: 'hola', ru: 'привет' };
    expect(faceText('es_to_ru', word)).toEqual({ front: 'hola', back: 'привет' });
    expect(faceText('ru_to_es', word)).toEqual({ front: 'привет', back: 'hola' });
  });
});
