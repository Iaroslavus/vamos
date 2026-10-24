import { listLessons, listTopics } from '@/features/content/loader';
import type { Topic } from '@/features/content/schema';

import {
  buildTodayPlan,
  greetingPart,
  learnerDestination,
  speakLines,
  type LessonRow,
} from './course';

function topic(partial: Pick<Topic, 'id' | 'lessons'> & Partial<Topic>): Topic {
  return {
    level: 'A1',
    category: 'first_steps',
    title_ru: partial.id,
    icon: 'wave',
    can_do_ru: ['поздороваться'],
    scene: `${partial.id}.scene`,
    draft: false,
    ...partial,
  };
}

function done(lessonId: string, completedAt = '2026-10-24T10:00:00.000Z'): LessonRow {
  return { lessonId, status: 'completed', completedAt };
}

describe('buildTodayPlan', () => {
  it('opens day 1 of the bundled course and keeps the rest of the week locked', () => {
    const plan = buildTodayPlan(listTopics(), []);

    expect(plan.currentDay).toBe(1);
    expect(plan.continueLessonId).toBe('a1.hola.l1');
    expect(plan.dayOneLessonId).toBe('a1.hola.l1');
    expect(plan.speakLessonId).toBe('a1.hola.l1');
    expect(plan.finished).toBe(false);
    expect(plan.days.map((day) => day.status)).toEqual([
      'current',
      'locked',
      'locked',
      'locked',
      'locked',
      'locked',
      'locked',
    ]);
    expect(plan.started).toEqual([]);
  });

  it('stays on day 1 until every lesson of that day is finished', () => {
    const plan = buildTodayPlan(listTopics(), [done('a1.hola.l1')]);

    expect(plan.currentDay).toBe(1);
    expect(plan.continueLessonId).toBe('a1.hola.l2');
    expect(plan.days[0]?.status).toBe('current');
  });

  it('stops on the first day that has no topic yet', () => {
    const plan = buildTodayPlan(listTopics(), [done('a1.hola.l1'), done('a1.hola.l2')]);

    expect(plan.days[0]?.status).toBe('completed');
    expect(plan.days[1]?.status).toBe('empty');
    expect(plan.days[2]?.status).toBe('locked');
    expect(plan.currentDay).toBe(2);
    expect(plan.continueLessonId).toBeNull();
    expect(plan.finished).toBe(false);
  });

  it('unlocks the next day as soon as the previous day is finished', () => {
    const topics = [
      topic({ id: 'day.one', lessons: ['l1'], starter_day: 1, title_ru: 'День 1' }),
      topic({ id: 'day.two', lessons: ['l2'], starter_day: 2, title_ru: 'День 2' }),
    ];

    const before = buildTodayPlan(topics, []);
    expect(before.continueLessonId).toBe('l1');
    expect(before.days[1]?.status).toBe('locked');

    const after = buildTodayPlan(topics, [done('l1', '2026-10-24T23:50:00.000Z')]);
    expect(after.days[0]?.status).toBe('completed');
    expect(after.currentDay).toBe(2);
    expect(after.continueLessonId).toBe('l2');
    expect(after.finished).toBe(false);
  });

  it('points continue at the next non-starter topic once all seven days are done', () => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = index + 1;
      return topic({
        id: `week.d${day}`,
        lessons: [`week.l${day}`],
        starter_day: day,
        title_ru: `День ${day}`,
      });
    });
    const numbers = topic({
      id: 'a1.numbers',
      lessons: ['a1.numbers.l1'],
      title_ru: 'Числа 1–10',
    });
    const rows = days.map((day) => done(day.lessons[0] ?? ''));

    const plan = buildTodayPlan([...days, numbers], rows);

    expect(plan.finished).toBe(true);
    expect(plan.currentDay).toBeNull();
    expect(plan.continueLessonId).toBeNull();
    expect(plan.nextTopicId).toBe('a1.numbers');
    expect(plan.nextTopicTitle).toBe('Числа 1–10');
    expect(plan.nextTopicLessonId).toBe('a1.numbers.l1');
  });

  it('lists started topics with an open one ahead of the latest completion', () => {
    const topics = [
      topic({ id: 'older', lessons: ['older.l1'], title_ru: 'Старая' }),
      topic({ id: 'newer', lessons: ['newer.l1'], title_ru: 'Новая' }),
      topic({ id: 'open', lessons: ['open.l1'], title_ru: 'Открытая' }),
    ];
    const plan = buildTodayPlan(topics, [
      done('older.l1', '2026-10-01T00:00:00.000Z'),
      done('newer.l1', '2026-10-20T00:00:00.000Z'),
      { lessonId: 'open.l1', status: 'in_progress', completedAt: null },
    ]);

    expect(plan.started.map((card) => card.id)).toEqual(['open', 'newer', 'older']);
    expect(plan.started[1]).toMatchObject({ completedLessons: 1, lessonCount: 1, progress: 1 });
  });

  it('merges two topics on the same starter day in id order', () => {
    const plan = buildTodayPlan(
      [
        topic({ id: 'b.day', lessons: ['b.l1'], starter_day: 1 }),
        topic({ id: 'a.day', lessons: ['a.l1'], starter_day: 1 }),
      ],
      [],
    );

    expect(plan.days[0]?.lessonIds).toEqual(['a.l1', 'b.l1']);
    expect(plan.continueLessonId).toBe('a.l1');
  });
});

describe('speakLines', () => {
  it('returns the speak items of the bundled first lesson', () => {
    expect(speakLines('a1.hola.l1', listLessons())).toEqual({
      lessonId: 'a1.hola.l1',
      itemIds: ['hola.buenos_dias', 'hola.gracias'],
    });
    expect(speakLines('missing', listLessons())).toBeNull();
    expect(speakLines(null, listLessons())).toBeNull();
  });
});

describe('learnerDestination', () => {
  const base = {
    dayOneFirstLessonId: 'a1.hola.l1',
    completedLessonIds: [] as string[],
  };

  it('asks for a name before anything else', () => {
    expect(learnerDestination({ ...base, name: null, preferencesAsked: false })).toBe('name');
    expect(learnerDestination({ ...base, name: '   ', preferencesAsked: false })).toBe('name');
  });

  it('asks for a goal only after day 1 is finished', () => {
    expect(
      learnerDestination({
        ...base,
        name: 'Анна',
        preferencesAsked: false,
        justFinishedLessonId: 'a1.hola.l1',
      }),
    ).toBe('preferences');
    expect(
      learnerDestination({
        ...base,
        name: 'Анна',
        preferencesAsked: false,
        completedLessonIds: ['a1.hola.l1'],
      }),
    ).toBe('preferences');
    expect(
      learnerDestination({
        ...base,
        name: 'Анна',
        preferencesAsked: true,
        justFinishedLessonId: 'a1.hola.l1',
      }),
    ).toBe('app');
    expect(
      learnerDestination({
        ...base,
        name: 'Анна',
        preferencesAsked: false,
        justFinishedLessonId: 'a1.hola.l2',
      }),
    ).toBe('app');
  });

  it('does not ask for preferences when the course has no day-1 lesson', () => {
    expect(
      learnerDestination({
        name: 'Анна',
        preferencesAsked: false,
        dayOneFirstLessonId: null,
        completedLessonIds: [],
        justFinishedLessonId: 'a1.hola.l1',
      }),
    ).toBe('app');
  });
});

describe('greetingPart', () => {
  const zone = 'UTC';

  it('splits the day at 5, 12, 18, and 23', () => {
    expect(greetingPart('2026-10-24T04:59:00.000Z', zone)).toBe('night');
    expect(greetingPart('2026-10-24T05:00:00.000Z', zone)).toBe('morning');
    expect(greetingPart('2026-10-24T11:59:00.000Z', zone)).toBe('morning');
    expect(greetingPart('2026-10-24T12:00:00.000Z', zone)).toBe('afternoon');
    expect(greetingPart('2026-10-24T18:00:00.000Z', zone)).toBe('evening');
    expect(greetingPart('2026-10-24T23:00:00.000Z', zone)).toBe('night');
  });

  it('falls back to afternoon when the clock cannot be read', () => {
    expect(greetingPart('not-a-date', zone)).toBe('afternoon');
    expect(greetingPart('2026-10-24T12:00:00.000Z', 'Not/AZone')).toBe('afternoon');
  });
});
