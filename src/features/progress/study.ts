import { calendarDate, resolveStreak, type DailyGoalMinutes, type StudySession } from './streak';
import type { LessonProgress, ProgressSnapshot } from './types';

/**
 * Minutes one finished lesson adds toward the daily goal, the streak, and
 * "time in the language". Ten minutes is one default lesson: `profiles.daily_minutes`
 * defaults to 10, so a single completion fills the ring and counts the day.
 */
export const LESSON_STUDY_MINUTES = 10;

export const DEFAULT_DAILY_GOAL_MINUTES: DailyGoalMinutes = 10;

export const EMPTY_SNAPSHOT: ProgressSnapshot = {
  lessons: [],
  totalXp: 0,
  pending: 0,
};

export type StudyClock = {
  now: string;
  timeZone: string;
  dailyGoalMinutes?: DailyGoalMinutes;
};

export type StudyStats = {
  streak: number;
  totalXp: number;
  todayMinutes: number;
  goalMinutes: number;
  /** 0–1, clamped once today's minutes pass the goal. */
  goalProgress: number;
  languageMinutes: number;
  completedIds: string[];
};

export function deviceTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone.trim() !== '') return zone;
  } catch {
    // Intl can throw if the runtime has no locale data.
  }
  return 'UTC';
}

export function studySnapshotNow(progress: ProgressSnapshot): StudyStats {
  return studySnapshot(progress, {
    now: new Date().toISOString(),
    timeZone: deviceTimeZone(),
  });
}

export function studySnapshot(progress: ProgressSnapshot, clock: StudyClock): StudyStats {
  const goalMinutes = clock.dailyGoalMinutes ?? DEFAULT_DAILY_GOAL_MINUTES;
  const nowMs = Date.parse(clock.now);
  const sessions = progress.lessons.flatMap((lesson) => {
    const session = sessionFrom(lesson, clock.timeZone, nowMs);
    return session ? [session] : [];
  });

  const streak = resolveStreak({
    sessions,
    dailyGoalMinutes: goalMinutes,
    now: clock.now,
    timeZone: clock.timeZone,
  }).current;

  const today = calendarDate(clock.now, clock.timeZone);
  const todayMinutes = sessions.reduce((sum, session) => {
    return calendarDate(session.completedAt, session.timeZone) === today
      ? sum + session.minutes
      : sum;
  }, 0);

  return {
    streak,
    totalXp: progress.totalXp,
    todayMinutes,
    goalMinutes,
    goalProgress: Math.min(1, todayMinutes / goalMinutes),
    languageMinutes: sessions.reduce((sum, session) => sum + session.minutes, 0),
    completedIds: progress.lessons
      .filter((lesson) => lesson.status === 'completed')
      .map((lesson) => lesson.lessonId),
  };
}

export function formatStudyMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const safe = Number.isFinite(totalMinutes) ? Math.max(0, Math.floor(totalMinutes)) : 0;
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

function sessionFrom(lesson: LessonProgress, timeZone: string, nowMs: number): StudySession | null {
  if (lesson.status !== 'completed' || lesson.completedAt == null) return null;
  const completedMs = Date.parse(lesson.completedAt);
  if (Number.isNaN(completedMs) || completedMs > nowMs) return null;

  const session: StudySession = {
    completedAt: lesson.completedAt,
    timeZone,
    minutes: LESSON_STUDY_MINUTES,
  };
  try {
    calendarDate(session.completedAt, session.timeZone);
  } catch {
    return null;
  }
  return session;
}
