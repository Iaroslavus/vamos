import {
  default_enable_fuzz,
  default_enable_short_term,
  default_learning_steps,
  default_maximum_interval,
  default_relearning_steps,
  default_w,
} from 'ts-fsrs';

import {
  createCard,
  previewIntervals,
  rateCard,
  reviewParameters,
  selectDueCards,
  DESIRED_RETENTION,
} from './fsrs';

const HOUR_MS = 60 * 60 * 1000;
const START = new Date('2026-01-01T12:00:00.000Z');

describe('fsrs', () => {
  it('keeps the default FSRS parameters and a desired retention of 0.9', () => {
    expect(DESIRED_RETENTION).toBe(0.9);
    expect(reviewParameters.request_retention).toBe(0.9);
    expect(reviewParameters.enable_fuzz).toBe(default_enable_fuzz);
    expect(reviewParameters.enable_short_term).toBe(default_enable_short_term);
    expect(reviewParameters.maximum_interval).toBe(default_maximum_interval);
    expect([...reviewParameters.learning_steps]).toEqual([...default_learning_steps]);
    expect([...reviewParameters.relearning_steps]).toEqual([...default_relearning_steps]);
    expect([...reviewParameters.w]).toEqual([...default_w]);
  });

  it('returns the next interval for every rating', () => {
    const card = createCard(START);
    const preview = previewIntervals(card, START);

    expect(preview.again.intervalMs).toBeGreaterThan(0);
    expect(preview.again.intervalMs).toBeLessThan(preview.hard.intervalMs);
    expect(preview.hard.intervalMs).toBeLessThan(preview.good.intervalMs);
    expect(preview.good.intervalMs).toBeLessThan(preview.easy.intervalMs);
    expect(card.reps).toBe(0);
  });

  it('grows the interval each time a card is rated Good', () => {
    let card = createCard(START);
    const intervals: number[] = [];

    for (let step = 0; step < 5; step += 1) {
      const when = card.due;
      const preview = previewIntervals(card, when);
      intervals.push(preview.good.intervalMs);
      card = rateCard(card, 'good', when).card;
    }

    expect(intervals).toHaveLength(5);
    for (let index = 1; index < intervals.length; index += 1) {
      expect(intervals[index]).toBeGreaterThan(intervals[index - 1] ?? 0);
    }
    expect(card.scheduledDays).toBeGreaterThan(1);
  });

  it('resets the interval when a learned card is rated Again', () => {
    let card = createCard(START);
    for (let step = 0; step < 4; step += 1) {
      card = rateCard(card, 'good', card.due).card;
    }

    const when = card.due;
    const grown = previewIntervals(card, when).good.intervalMs;
    expect(grown).toBeGreaterThan(24 * HOUR_MS);

    const forgotten = rateCard(card, 'again', when).card;
    const reset = forgotten.due.getTime() - when.getTime();

    expect(reset).toBeLessThan(grown);
    expect(reset).toBeLessThan(HOUR_MS);
    expect(forgotten.lapses).toBe(card.lapses + 1);
    expect(forgotten.state).toBe(3);
    expect(forgotten.scheduledDays).toBe(0);
  });

  it('selects cards that are due and leaves future cards', () => {
    const now = new Date('2026-06-01T00:00:00.000Z');
    const cards = [
      { id: 'later', due: new Date('2026-06-02T00:00:00.000Z') },
      { id: 'now', due: now },
      { id: 'overdue', due: new Date('2026-05-01T00:00:00.000Z') },
      { id: 'soon', due: '2026-06-01T00:00:01.000Z' },
    ];

    expect(selectDueCards(cards, now).map((card) => card.id)).toEqual(['overdue', 'now']);
  });
});
