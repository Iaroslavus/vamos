import { EMPTY_SNAPSHOT, formatStudyMinutes, studySnapshot } from './study';
import type { ProgressSnapshot } from './types';

const NOW = '2026-10-19T12:00:00.000Z';
const UTC = 'UTC';

function lesson(
  lessonId: string,
  completedAt: string | null,
  status: 'completed' | 'in_progress' = 'completed',
) {
  return { lessonId, status, bestAccuracy: status === 'completed' ? 100 : null, completedAt };
}

function snapshot(lessons: ProgressSnapshot['lessons'], totalXp = 0): ProgressSnapshot {
  return { lessons, totalXp, pending: 0 };
}

describe('studySnapshot', () => {
  it('starts at zero before any lesson is stored', () => {
    expect(studySnapshot(EMPTY_SNAPSHOT, { now: NOW, timeZone: UTC })).toEqual({
      streak: 0,
      totalXp: 0,
      todayMinutes: 0,
      goalMinutes: 10,
      goalProgress: 0,
      languageMinutes: 0,
      completedIds: [],
    });
  });

  it('keeps XP that is not tied to a lesson and ignores an unfinished lesson', () => {
    const stats = studySnapshot(snapshot([lesson('a1-u01-l01', null, 'in_progress')], 30), {
      now: NOW,
      timeZone: UTC,
    });

    expect(stats.totalXp).toBe(30);
    expect(stats.streak).toBe(0);
    expect(stats.languageMinutes).toBe(0);
    expect(stats.completedIds).toEqual([]);
  });

  it('fills the daily ring and starts the streak when one lesson is finished today', () => {
    const stats = studySnapshot(snapshot([lesson('a1-u01-l01', NOW)], 20), {
      now: NOW,
      timeZone: UTC,
    });

    expect(stats).toMatchObject({
      streak: 1,
      totalXp: 20,
      todayMinutes: 10,
      goalProgress: 1,
      languageMinutes: 10,
      completedIds: ['a1-u01-l01'],
    });
  });

  it('keeps yesterday’s streak but leaves today’s ring empty', () => {
    const stats = studySnapshot(snapshot([lesson('a1-u01-l01', '2026-10-18T12:00:00.000Z')], 20), {
      now: NOW,
      timeZone: UTC,
    });

    expect(stats.streak).toBe(1);
    expect(stats.todayMinutes).toBe(0);
    expect(stats.goalProgress).toBe(0);
    expect(stats.languageMinutes).toBe(10);
  });

  it('does not raise the streak twice when two lessons land on the same day', () => {
    const stats = studySnapshot(
      snapshot([
        lesson('a1-u01-l01', '2026-10-19T08:00:00.000Z'),
        lesson('a1-u01-l02', '2026-10-19T09:00:00.000Z'),
      ]),
      { now: NOW, timeZone: UTC },
    );

    expect(stats.streak).toBe(1);
    expect(stats.todayMinutes).toBe(20);
    expect(stats.goalProgress).toBe(1);
    expect(stats.languageMinutes).toBe(20);
  });

  it('shows a half ring and no streak when one lesson is short of a longer goal', () => {
    const stats = studySnapshot(snapshot([lesson('a1-u01-l01', NOW)]), {
      now: NOW,
      timeZone: UTC,
      dailyGoalMinutes: 20,
    });

    expect(stats.todayMinutes).toBe(10);
    expect(stats.goalMinutes).toBe(20);
    expect(stats.goalProgress).toBe(0.5);
    expect(stats.streak).toBe(0);
  });

  it('drops a streak after a long gap and still counts the minutes already studied', () => {
    const stats = studySnapshot(snapshot([lesson('a1-u01-l01', '2026-01-01T12:00:00.000Z')], 20), {
      now: '2026-01-10T12:00:00.000Z',
      timeZone: UTC,
    });

    expect(stats.streak).toBe(0);
    expect(stats.languageMinutes).toBe(10);
    expect(stats.totalXp).toBe(20);
  });

  it('ignores a completion timestamp that is still in the future', () => {
    const stats = studySnapshot(snapshot([lesson('future', '2999-01-01T00:00:00.000Z')]), {
      now: NOW,
      timeZone: UTC,
    });

    expect(stats.completedIds).toEqual(['future']);
    expect(stats.languageMinutes).toBe(0);
    expect(stats.streak).toBe(0);
  });
});

describe('formatStudyMinutes', () => {
  it('splits hours and leaves a zero clock at zero', () => {
    expect(formatStudyMinutes(0)).toEqual({ hours: 0, minutes: 0 });
    expect(formatStudyMinutes(10)).toEqual({ hours: 0, minutes: 10 });
    expect(formatStudyMinutes(60)).toEqual({ hours: 1, minutes: 0 });
    expect(formatStudyMinutes(70)).toEqual({ hours: 1, minutes: 10 });
  });

  it('treats negative and non-finite values as no time', () => {
    expect(formatStudyMinutes(-5)).toEqual({ hours: 0, minutes: 0 });
    expect(formatStudyMinutes(Number.NaN)).toEqual({ hours: 0, minutes: 0 });
  });
});
