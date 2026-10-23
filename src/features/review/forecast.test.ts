import { NEW_CARDS_PER_DAY } from './session';
import { reviewAgenda, reviewForecast } from './forecast';
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

describe('review forecast', () => {
  it('builds seven civil days and piles overdue cards onto today', () => {
    const forecast = reviewForecast({
      cards: [
        { due: '2026-10-20T12:00:00.000Z' },
        { due: '2026-10-23T23:00:00.000Z' },
        { due: '2026-10-25T12:00:00.000Z' },
        { due: '2026-10-30T00:00:00.000Z' },
        { due: 'not-a-date' },
      ],
      now: NOW,
      timeZone: UTC,
    });

    expect(forecast.map((day) => day.date)).toEqual([
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
    ]);
    expect(forecast.map((day) => day.count)).toEqual([2, 0, 1, 0, 0, 0, 0]);
    expect(forecast[0]?.weekday).toBe('fri');
    expect(forecast[2]?.weekday).toBe('sun');
  });

  it('names the day in the learner zone', () => {
    const forecast = reviewForecast({
      cards: [{ due: '2026-10-24T06:00:00.000Z' }],
      now: new Date('2026-10-24T06:00:00.000Z'),
      timeZone: LOS_ANGELES,
    });

    expect(forecast[0]).toMatchObject({ date: '2026-10-23', weekday: 'fri', count: 1 });
    expect(forecast[1]?.count).toBe(0);
  });

  it('returns no days when the window is empty', () => {
    expect(reviewForecast({ cards: [], now: NOW, timeZone: UTC, days: 0 })).toEqual([]);
  });

  it('caps the study count and still shows every card due today', () => {
    const cards = Array.from({ length: NEW_CARDS_PER_DAY + 5 }, (_, index) =>
      stored({ id: `word-${index}`, itemId: `word-${index}` }),
    );
    const agenda = reviewAgenda({ cards, logs: [], now: NOW, timeZone: UTC });

    expect(agenda.dueCount).toBe(NEW_CARDS_PER_DAY);
    expect(agenda.forecast[0]?.count).toBe(NEW_CARDS_PER_DAY + 5);
  });

  it('leaves a due new card on today after the new-card cap is spent', () => {
    const agenda = reviewAgenda({
      cards: [stored({ id: 'hola', itemId: 'hola' })],
      logs: Array.from({ length: NEW_CARDS_PER_DAY }, () => ({
        reviewedAt: NOW.toISOString(),
        state: 0,
      })),
      now: NOW,
      timeZone: UTC,
    });

    expect(agenda.dueCount).toBe(0);
    expect(agenda.forecast[0]?.count).toBe(1);
  });
});
