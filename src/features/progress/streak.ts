/**
 * Daily streak and lesson XP.
 *
 * A calendar day is the date in the time zone where the study happened. The day
 * counts once the minutes on that date reach the daily goal. A later lesson on
 * the same date does not raise the streak again.
 *
 * One missed date resets the streak unless an unused freeze covers the whole gap.
 * The free plan refills a single freeze on the first accepted day of each ISO
 * week (Monday) and never stacks a second free freeze. A freeze is spent only
 * when it actually saves the streak.
 *
 * Flights change the civil date without a real missed day. A calendar gap counts
 * only when enough absolute time has passed for those dates to be credible, and
 * a date that moves backwards never resets or double-counts the streak.
 */

export const LESSON_XP_BASE = 10;
export const LESSON_XP_ACCURACY_BONUS = 10;

export const DAILY_GOAL_MINUTES = [5, 10, 20, 30] as const;
export type DailyGoalMinutes = (typeof DAILY_GOAL_MINUTES)[number];

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

export type StudySession = {
  /** Absolute instant the lesson was finished. */
  completedAt: string;
  /** IANA zone of the device at that instant. */
  timeZone: string;
  /** Minutes this lesson adds toward the daily goal. */
  minutes: number;
};

export type StreakState = {
  current: number;
  longest: number;
  /** Civil date (YYYY-MM-DD) the goal was last met, else the date a freeze protected through. */
  lastActiveDate: string | null;
  /** Absolute instant the goal was last met. Stays put when a freeze covers a gap. */
  lastActiveAt: string | null;
  freezes: number;
  /** ISO week (`YYYY-Www`) that last refilled the free freeze. */
  freezeWeek: string | null;
};

export type ResolveStreakInput = {
  sessions: readonly StudySession[];
  dailyGoalMinutes: number;
  /** Instant used to decide whether yesterday is already a miss. */
  now: string;
  /** Zone used to name "today". Each session still uses its own zone. */
  timeZone: string;
};

type EarnedDay = {
  date: string;
  reachedAt: string;
};

export function emptyStreak(): StreakState {
  return {
    current: 0,
    longest: 0,
    lastActiveDate: null,
    lastActiveAt: null,
    freezes: 0,
    freezeWeek: null,
  };
}

/** XP for a finished lesson: base plus a bonus that scales with accuracy (0–100). */
export function lessonXp(accuracyPercent: number): number {
  if (!Number.isFinite(accuracyPercent) || accuracyPercent < 0 || accuracyPercent > 100) {
    throw new Error('Invalid accuracy');
  }
  const bonus = Math.round((accuracyPercent / 100) * LESSON_XP_ACCURACY_BONUS);
  return LESSON_XP_BASE + bonus;
}

/** Replay the whole history. Calling it again with the same input does not spend another freeze. */
export function resolveStreak(input: ResolveStreakInput): StreakState {
  assertDailyGoal(input.dailyGoalMinutes);
  const today = calendarDate(input.now, input.timeZone);
  const nowMs = instantMs(input.now);

  const earned = earnedDays(input.sessions, input.dailyGoalMinutes, nowMs);
  let state = emptyStreak();
  for (const day of earned) {
    state = commitEarnedDay(state, day);
  }
  return reconcile(state, today, input.now);
}

export function calendarDate(instantIso: string, timeZone: string): string {
  const instant = new Date(instantMs(instantIso));
  if (timeZone.trim() === '') throw new Error('Invalid time zone');

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(instant);
  } catch (error) {
    if (error instanceof RangeError) throw new Error('Invalid time zone');
    throw error;
  }

  const year = part(parts, 'year');
  const month = part(parts, 'month').padStart(2, '0');
  const day = part(parts, 'day').padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function earnedDays(
  sessions: readonly StudySession[],
  dailyGoalMinutes: number,
  nowMs: number,
): EarnedDay[] {
  const byDate = new Map<string, { minutes: number; reachedAt: string | null }>();
  const ordered = [...sessions].sort(
    (left, right) => instantMs(left.completedAt) - instantMs(right.completedAt),
  );

  for (const session of ordered) {
    assertSession(session);
    const completedMs = instantMs(session.completedAt);
    if (completedMs > nowMs) continue;

    const date = calendarDate(session.completedAt, session.timeZone);
    const accrual = byDate.get(date) ?? { minutes: 0, reachedAt: null };
    accrual.minutes += session.minutes;
    if (accrual.reachedAt === null && accrual.minutes >= dailyGoalMinutes) {
      accrual.reachedAt = session.completedAt;
    }
    byDate.set(date, accrual);
  }

  return [...byDate.entries()]
    .flatMap(([date, accrual]) =>
      accrual.reachedAt === null ? [] : [{ date, reachedAt: accrual.reachedAt }],
    )
    .sort(
      (left, right) =>
        instantMs(left.reachedAt) - instantMs(right.reachedAt) ||
        left.date.localeCompare(right.date),
    );
}

function commitEarnedDay(state: StreakState, earned: EarnedDay): StreakState {
  if (state.lastActiveDate !== null && state.lastActiveAt !== null) {
    const gap = credibleGap(
      state.lastActiveDate,
      state.lastActiveAt,
      earned.date,
      earned.reachedAt,
    );
    if (gap <= 0) return state;
  }

  const next = grantWeeklyFreeze(state, earned.date);
  if (next.lastActiveDate === null || next.lastActiveAt === null) {
    return activate(next, earned, 1);
  }

  const gap = credibleGap(next.lastActiveDate, next.lastActiveAt, earned.date, earned.reachedAt);
  if (gap <= 1) return activate(next, earned, next.current + 1);

  const missed = gap - 1;
  if (next.freezes >= missed) {
    return activate({ ...next, freezes: next.freezes - missed }, earned, next.current + 1);
  }
  return activate(next, earned, 1);
}

function reconcile(state: StreakState, today: string, now: string): StreakState {
  const next = grantWeeklyFreeze(state, today);
  if (next.current === 0 || next.lastActiveDate === null || next.lastActiveAt === null) return next;

  const gap = credibleGap(next.lastActiveDate, next.lastActiveAt, today, now);
  if (gap <= 1) return next;

  const missed = gap - 1;
  if (next.freezes >= missed) {
    return {
      ...next,
      freezes: next.freezes - missed,
      lastActiveDate: addDays(today, -1),
    };
  }
  return { ...next, current: 0, lastActiveDate: null, lastActiveAt: null };
}

function activate(state: StreakState, earned: EarnedDay, current: number): StreakState {
  return {
    ...state,
    current,
    longest: Math.max(state.longest, current),
    lastActiveDate: earned.date,
    lastActiveAt: earned.reachedAt,
  };
}

/**
 * Calendar steps from `lastDate` to `nextDate`, capped by the number of day
 * boundaries absolute time could really have crossed. A negative result means
 * the civil date moved backwards (a westward flight).
 */
function credibleGap(lastDate: string, lastAt: string, nextDate: string, nextAt: string): number {
  const calendar = diffDays(lastDate, nextDate);
  if (calendar <= 0) return calendar;

  const elapsedMs = instantMs(nextAt) - instantMs(lastAt);
  if (elapsedMs < 0) return 0;

  const maxGap = Math.floor(elapsedMs / MS_PER_HOUR / 24) + 1;
  return Math.min(calendar, maxGap);
}

function grantWeeklyFreeze(state: StreakState, date: string): StreakState {
  const week = isoWeek(date);
  if (state.freezeWeek === week) return state;
  return {
    ...state,
    freezeWeek: week,
    freezes: state.freezes >= 1 ? state.freezes : 1,
  };
}

function isoWeek(date: string): string {
  const [year, month, day] = parseDate(date);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay() || 7;
  const thursday = new Date(utc);
  thursday.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const isoYear = thursday.getUTCFullYear();
  const week = Math.ceil((thursday.getTime() - Date.UTC(isoYear, 0, 1)) / MS_PER_DAY / 7 + 1 / 7);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

function diffDays(fromDate: string, toDate: string): number {
  return dayNumber(toDate) - dayNumber(fromDate);
}

function addDays(date: string, days: number): string {
  const [year, month, day] = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function dayNumber(date: string): number {
  const [year, month, day] = parseDate(date);
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

function parseDate(date: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error('Invalid calendar date');
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function assertDailyGoal(minutes: number): asserts minutes is DailyGoalMinutes {
  if (!(DAILY_GOAL_MINUTES as readonly number[]).includes(minutes)) {
    throw new Error('Invalid daily goal');
  }
}

function assertSession(session: StudySession): void {
  if (!Number.isFinite(session.minutes) || session.minutes < 0) {
    throw new Error('Invalid study minutes');
  }
  calendarDate(session.completedAt, session.timeZone);
}

function instantMs(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error('Invalid timestamp');
  return ms;
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  const value = parts.find((item) => item.type === type)?.value;
  if (!value || !/^\d+$/.test(value)) throw new Error('Invalid time zone');
  return value;
}
