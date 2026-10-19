import {
  LESSON_XP_ACCURACY_BONUS,
  LESSON_XP_BASE,
  lessonXp,
  resolveStreak,
  type StudySession,
} from './streak';

const UTC = 'UTC';

function study(completedAt: string, timeZone = UTC, minutes = 10): StudySession {
  return { completedAt, timeZone, minutes };
}

function at(day: string, hours = 12): string {
  return `${day}T${String(hours).padStart(2, '0')}:00:00.000Z`;
}

function streak(sessions: StudySession[], now: string, timeZone = UTC, dailyGoalMinutes = 10) {
  return resolveStreak({ sessions, dailyGoalMinutes, now, timeZone });
}

describe('lessonXp', () => {
  it('pays the base and nothing else at 0% accuracy', () => {
    expect(lessonXp(0)).toBe(LESSON_XP_BASE);
  });

  it('adds the full accuracy bonus at 100%', () => {
    expect(lessonXp(100)).toBe(LESSON_XP_BASE + LESSON_XP_ACCURACY_BONUS);
  });

  it('scales the bonus with 50% accuracy', () => {
    expect(lessonXp(50)).toBe(LESSON_XP_BASE + LESSON_XP_ACCURACY_BONUS / 2);
  });

  it('scales the bonus with 80% accuracy', () => {
    expect(lessonXp(80)).toBe(18);
  });

  it('rounds a fractional accuracy to the nearest XP', () => {
    expect(lessonXp(33)).toBe(LESSON_XP_BASE + 3);
    expect(lessonXp(5)).toBe(LESSON_XP_BASE + 1);
  });

  it('rejects accuracy outside 0–100', () => {
    expect(() => lessonXp(-1)).toThrow('Invalid accuracy');
    expect(() => lessonXp(101)).toThrow('Invalid accuracy');
    expect(() => lessonXp(Number.NaN)).toThrow('Invalid accuracy');
  });
});

describe('resolveStreak', () => {
  it('banks one freeze and keeps a zero streak when nothing has been studied', () => {
    expect(streak([], at('2026-01-05'))).toMatchObject({
      current: 0,
      longest: 0,
      freezes: 1,
      lastActiveDate: null,
    });
  });

  it('starts the streak at 1 when the daily goal is met', () => {
    const state = streak([study(at('2026-01-05'))], at('2026-01-05'));

    expect(state.current).toBe(1);
    expect(state.longest).toBe(1);
    expect(state.lastActiveDate).toBe('2026-01-05');
    expect(state.freezes).toBe(1);
  });

  it('does not count a day that is one minute short of the goal', () => {
    const state = streak([study(at('2026-01-05'), UTC, 9)], at('2026-01-05'));

    expect(state.current).toBe(0);
    expect(state.lastActiveDate).toBeNull();
  });

  it('counts the day when the minutes land exactly on the goal', () => {
    expect(streak([study(at('2026-01-05'), UTC, 10)], at('2026-01-05')).current).toBe(1);
  });

  it('adds two lessons on the same day and counts that day once', () => {
    const morning = study(at('2026-01-05', 8), UTC, 6);
    const evening = study(at('2026-01-05', 18), UTC, 6);

    expect(streak([morning, evening], at('2026-01-05', 20), UTC, 10).current).toBe(1);
  });

  it('does not raise the streak for a third lesson on a day that already counted', () => {
    const sessions = [8, 12, 18].map((hour) => study(at('2026-01-05', hour), UTC, 6));

    expect(streak(sessions, at('2026-01-05', 20), UTC, 10)).toMatchObject({
      current: 1,
      lastActiveDate: '2026-01-05',
    });
  });

  it('stays at 1 when each of two lessons would have met the goal alone', () => {
    const sessions = [study(at('2026-01-05', 9)), study(at('2026-01-05', 21))];

    expect(streak(sessions, at('2026-01-05', 22)).current).toBe(1);
  });

  it('does not carry leftover minutes into the next day', () => {
    const sessions = [study(at('2026-01-05'), UTC, 6), study(at('2026-01-06'), UTC, 6)];

    expect(streak(sessions, at('2026-01-06'), UTC, 10).current).toBe(0);
  });

  it('raises the streak on the next calendar day', () => {
    const sessions = [study(at('2026-01-05')), study(at('2026-01-06'))];

    expect(streak(sessions, at('2026-01-06'))).toMatchObject({
      current: 2,
      longest: 2,
      freezes: 1,
    });
  });

  it('splits Madrid just before midnight and at midnight into two streak days', () => {
    const sessions = [
      study('2026-01-15T22:59:00.000Z', 'Europe/Madrid'),
      study('2026-01-15T23:00:00.000Z', 'Europe/Madrid'),
    ];

    expect(streak(sessions, '2026-01-15T23:30:00.000Z', 'Europe/Madrid')).toMatchObject({
      current: 2,
      lastActiveDate: '2026-01-16',
    });
  });

  it('splits New York just before midnight and at midnight into two streak days', () => {
    const sessions = [
      study('2026-01-15T04:59:00.000Z', 'America/New_York'),
      study('2026-01-15T05:00:00.000Z', 'America/New_York'),
    ];

    expect(streak(sessions, '2026-01-15T06:00:00.000Z', 'America/New_York')).toMatchObject({
      current: 2,
      lastActiveDate: '2026-01-15',
    });
  });

  it('does not complete either day when the minutes fall on different sides of midnight', () => {
    const sessions = [
      study('2026-01-15T22:30:00.000Z', 'Europe/Madrid', 6),
      study('2026-01-15T23:30:00.000Z', 'Europe/Madrid', 6),
    ];

    expect(streak(sessions, '2026-01-16T12:00:00.000Z', 'Europe/Madrid', 10).current).toBe(0);
  });

  it('covers the first skipped day of the week with the free freeze', () => {
    const sessions = [study(at('2026-01-05')), study(at('2026-01-07'))];

    expect(streak(sessions, at('2026-01-07'))).toMatchObject({
      current: 2,
      freezes: 0,
      lastActiveDate: '2026-01-07',
    });
  });

  it('resets the streak when another day is skipped after the freeze is gone', () => {
    const sessions = [study(at('2026-01-05')), study(at('2026-01-07')), study(at('2026-01-09'))];

    expect(streak(sessions, at('2026-01-09'))).toMatchObject({
      current: 1,
      longest: 2,
      freezes: 0,
      lastActiveDate: '2026-01-09',
    });
  });

  it('keeps the freeze when one freeze cannot cover two skipped days', () => {
    const sessions = [study(at('2026-01-05')), study(at('2026-01-08'))];

    expect(streak(sessions, at('2026-01-08'))).toMatchObject({
      current: 1,
      longest: 1,
      freezes: 1,
      lastActiveDate: '2026-01-08',
    });
  });

  it('shows a broken streak on open when more days were missed than freezes can cover', () => {
    expect(streak([study(at('2026-01-05'))], at('2026-01-09'))).toMatchObject({
      current: 0,
      longest: 1,
      freezes: 1,
      lastActiveDate: null,
    });
  });

  it('spends the freeze on open and still lets today extend the streak', () => {
    const monday = study(at('2026-01-05'));

    expect(streak([monday], at('2026-01-07'))).toMatchObject({
      current: 1,
      freezes: 0,
      lastActiveDate: '2026-01-06',
    });

    expect(streak([monday, study(at('2026-01-07'))], at('2026-01-07'))).toMatchObject({
      current: 2,
      freezes: 0,
      lastActiveDate: '2026-01-07',
    });
  });

  it('does not spend a second freeze when the same day is evaluated again later', () => {
    const sessions = [study(at('2026-01-05'))];

    expect(streak(sessions, at('2026-01-07', 18))).toEqual(streak(sessions, at('2026-01-07', 12)));
  });

  it('keeps the longest streak after a reset', () => {
    const sessions = [
      study(at('2026-01-05')),
      study(at('2026-01-06')),
      study(at('2026-01-07')),
      study(at('2026-01-10')),
    ];

    expect(streak(sessions, at('2026-01-10'))).toMatchObject({
      current: 1,
      longest: 3,
    });
  });

  it('does not stack a second free freeze the next week when the first is unused', () => {
    const days = [
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
      '2026-01-08',
      '2026-01-09',
      '2026-01-10',
      '2026-01-11',
      '2026-01-12',
    ];

    expect(
      streak(
        days.map((day) => study(at(day))),
        at('2026-01-12'),
      ),
    ).toMatchObject({
      current: 8,
      freezes: 1,
    });
  });

  it('refills one freeze on the new ISO week and uses it to save a single missed day', () => {
    const sessions = [
      study(at('2026-01-05')),
      study(at('2026-01-07')),
      study(at('2026-01-10')),
      study(at('2026-01-12')),
    ];

    expect(streak(sessions, at('2026-01-12'))).toMatchObject({
      current: 2,
      freezes: 0,
      lastActiveDate: '2026-01-12',
      freezeWeek: '2026-W03',
    });
  });

  it('treats an eastbound flight that skips a civil date as the next day', () => {
    const honolulu = study('2026-05-04T09:00:00.000Z', 'Pacific/Honolulu');
    const tokyo = study('2026-05-04T23:00:00.000Z', 'Asia/Tokyo');

    expect(streak([honolulu], '2026-05-04T23:00:00.000Z', 'Asia/Tokyo')).toMatchObject({
      current: 1,
      freezes: 1,
      lastActiveDate: '2026-05-03',
    });
    expect(streak([honolulu, tokyo], '2026-05-04T23:00:00.000Z', 'Asia/Tokyo')).toMatchObject({
      current: 2,
      freezes: 1,
      lastActiveDate: '2026-05-05',
    });
  });

  it('does not reset or double-count when a westbound flight moves the local date backward', () => {
    const madrid = study('2026-05-03T22:30:00.000Z', 'Europe/Madrid');
    const newYork = study('2026-05-04T01:00:00.000Z', 'America/New_York');

    expect(streak([madrid, newYork], '2026-05-04T01:00:00.000Z', 'America/New_York')).toMatchObject(
      {
        current: 1,
        freezes: 1,
        lastActiveDate: '2026-05-04',
      },
    );
  });

  it('does not add a day the morning after landing when that date was already counted', () => {
    const sessions = [
      study('2026-05-03T22:30:00.000Z', 'Europe/Madrid'),
      study('2026-05-04T13:00:00.000Z', 'America/New_York'),
    ];

    expect(streak(sessions, '2026-05-04T13:00:00.000Z', 'America/New_York')).toMatchObject({
      current: 1,
      lastActiveDate: '2026-05-04',
    });
  });

  it('counts the following local day after a westbound flight once', () => {
    const sessions = [
      study('2026-05-03T22:30:00.000Z', 'Europe/Madrid'),
      study('2026-05-05T13:00:00.000Z', 'America/New_York'),
    ];

    expect(streak(sessions, '2026-05-05T13:00:00.000Z', 'America/New_York')).toMatchObject({
      current: 2,
      lastActiveDate: '2026-05-05',
    });
  });

  it('counts one day across the spring-forward hour in Madrid', () => {
    const sessions = [
      study('2026-03-29T00:30:00.000Z', 'Europe/Madrid', 6),
      study('2026-03-29T01:30:00.000Z', 'Europe/Madrid', 6),
    ];

    expect(streak(sessions, '2026-03-29T12:00:00.000Z', 'Europe/Madrid')).toMatchObject({
      current: 1,
      lastActiveDate: '2026-03-29',
    });
  });

  it('counts the days on either side of the spring-forward midnight', () => {
    const sessions = [
      study('2026-03-28T22:30:00.000Z', 'Europe/Madrid'),
      study('2026-03-28T23:30:00.000Z', 'Europe/Madrid'),
    ];

    expect(streak(sessions, '2026-03-29T12:00:00.000Z', 'Europe/Madrid')).toMatchObject({
      current: 2,
      lastActiveDate: '2026-03-29',
    });
  });

  it('counts one day when the fall-back hour repeats in Madrid', () => {
    const sessions = [
      study('2026-10-25T00:30:00.000Z', 'Europe/Madrid', 6),
      study('2026-10-25T01:30:00.000Z', 'Europe/Madrid', 6),
    ];

    expect(streak(sessions, '2026-10-25T12:00:00.000Z', 'Europe/Madrid')).toMatchObject({
      current: 1,
      lastActiveDate: '2026-10-25',
    });
  });

  it('adds minutes from two zones only when they share a civil date', () => {
    const sessions = [
      study('2026-01-15T20:00:00.000Z', 'Europe/Madrid', 6),
      study('2026-01-15T21:00:00.000Z', 'Atlantic/Canary', 6),
    ];

    expect(streak(sessions, '2026-01-15T22:00:00.000Z', 'Europe/Madrid').current).toBe(1);
  });

  it('counts two days when a zone change crosses local midnight', () => {
    const sessions = [
      study('2026-01-15T23:30:00.000Z', 'Atlantic/Canary'),
      study('2026-01-16T00:00:00.000Z', 'Europe/Madrid'),
    ];

    expect(streak(sessions, '2026-01-16T00:30:00.000Z', 'Europe/Madrid')).toMatchObject({
      current: 2,
      lastActiveDate: '2026-01-16',
    });
  });

  it('follows absolute time when sessions are passed out of order', () => {
    const sessions = [study(at('2026-01-07')), study(at('2026-01-05'))];

    expect(streak(sessions, at('2026-01-07'))).toEqual(
      streak([study(at('2026-01-05')), study(at('2026-01-07'))], at('2026-01-07')),
    );
  });

  it('ignores a session dated after now', () => {
    const sessions = [study(at('2026-01-05')), study(at('2026-01-20'))];

    expect(streak(sessions, at('2026-01-06'))).toMatchObject({
      current: 1,
      lastActiveDate: '2026-01-05',
    });
  });

  it('leaves today in progress when yesterday already counted', () => {
    expect(streak([study(at('2026-01-05'))], at('2026-01-06', 8))).toMatchObject({
      current: 1,
      freezes: 1,
      lastActiveDate: '2026-01-05',
    });
  });

  it('rejects an unknown time zone, a bad goal, and negative minutes', () => {
    expect(() => streak([study(at('2026-01-05'))], at('2026-01-05'), 'Mars/Base')).toThrow(
      'Invalid time zone',
    );
    expect(() => streak([study(at('2026-01-05'))], at('2026-01-05'), UTC, 15)).toThrow(
      'Invalid daily goal',
    );
    expect(() => streak([study(at('2026-01-05'), UTC, -1)], at('2026-01-05'))).toThrow(
      'Invalid study minutes',
    );
  });
});
