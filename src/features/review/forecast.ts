import { calendarDate } from '@/features/progress/streak';

import { buildReviewQueue, type ReviewActivity } from './session';
import type { StoredCard } from './types';

/** Civil days shown on the progress chart, starting with today. */
export const FORECAST_DAYS = 7;

export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export type ReviewForecastDay = {
  /** Civil date `YYYY-MM-DD` in the learner's time zone. */
  date: string;
  weekday: WeekdayKey;
  count: number;
};

export type ReviewAgenda = {
  /** Cards the learner can study right now, after the daily caps. */
  dueCount: number;
  forecast: ReviewForecastDay[];
};

/**
 * Cards scheduled across the next civil days.
 * A card due today or earlier counts on today. Cards past the window are left out.
 * Today's bar can be taller than `dueCount`: the study queue stops at the daily caps.
 */
export function reviewForecast(input: {
  cards: readonly { due: string }[];
  now: Date;
  timeZone: string;
  days?: number;
}): ReviewForecastDay[] {
  const span = input.days ?? FORECAST_DAYS;
  if (!Number.isInteger(span) || span < 1) return [];

  const today = calendarDate(input.now.toISOString(), input.timeZone);
  const dates = Array.from({ length: span }, (_, index) => addDays(today, index));
  const last = dates[dates.length - 1] ?? today;
  const counts = new Map(dates.map((date) => [date, 0]));

  for (const card of input.cards) {
    const due = dueDay(card.due, input.timeZone);
    if (!due) continue;
    const bucket = due < today ? today : due;
    if (bucket > last) continue;
    const current = counts.get(bucket);
    if (current === undefined) continue;
    counts.set(bucket, current + 1);
  }

  return dates.map((date) => ({
    date,
    weekday: weekdayKey(date),
    count: counts.get(date) ?? 0,
  }));
}

/** Due queue for the counters, plus the uncapped seven-day schedule. */
export function reviewAgenda(input: {
  cards: readonly StoredCard[];
  logs: readonly ReviewActivity[];
  now: Date;
  timeZone: string;
}): ReviewAgenda {
  return {
    dueCount: buildReviewQueue(input).cards.length,
    forecast: reviewForecast({
      cards: input.cards,
      now: input.now,
      timeZone: input.timeZone,
    }),
  };
}

function dueDay(due: string, timeZone: string): string | null {
  if (Number.isNaN(Date.parse(due))) return null;
  try {
    return calendarDate(due, timeZone);
  } catch {
    return null;
  }
}

function weekdayKey(date: string): WeekdayKey {
  const [year, month, day] = parseDate(date);
  const index = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKDAY_KEYS[index] ?? 'sun';
}

function addDays(date: string, days: number): string {
  const [year, month, day] = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function parseDate(date: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error('Invalid calendar date');
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}
