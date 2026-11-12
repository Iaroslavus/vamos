import { cityName } from './cities';
import { appPathPlan, buildCoursePlan, plannedModuleIds, type CoursePlanFile } from './coursePlan';
import { buildPath } from './map';

const file: CoursePlanFile = {
  starter_week: [{ day: 7, checkpoint_id: 'cp.a1.week1' }],
  levels: [
    {
      level: 'A1',
      units: [
        {
          id: 'a1.u01',
          checkpoint_id: null,
          topics: [
            { id: 'a1.hola', starter_day: 1 },
            { id: 'missing.topic', starter_day: 2 },
          ],
        },
        {
          id: 'a1.u02',
          checkpoint_id: null,
          topics: [{ id: 'not.shipped', starter_day: null }],
        },
        {
          id: 'a1.u06',
          checkpoint_id: 'cp.a1.week1',
          topics: [{ id: 'a1.restaurante', starter_day: 6 }],
        },
      ],
    },
  ],
};

const playable = [
  { id: 'a1.hola', lessons: ['a1.hola.l1', 'a1.hola.l2'], starterDay: 1 },
  { id: 'a1.restaurante', lessons: ['a1.restaurante.l1'], starterDay: 6 },
  { id: 'a1.primera', lessons: ['a1.primera.l1', 'a1.primera.l2'], starterDay: 7 },
];

describe('buildCoursePlan', () => {
  it('keeps shipped topics in plan order and hangs the checkpoint on its module', () => {
    const plan = buildCoursePlan(file, playable);
    const nodes = buildPath(plan, { completedLessonIds: [] });

    expect(plan.modules.map((module) => module.id)).toEqual(['a1.u01', 'a1.u06']);
    expect(nodes.map((node) => node.id)).toEqual([
      'a1.hola',
      'a1.restaurante',
      'chest:cp.a1.week1',
    ]);
    expect(nodes.find((node) => node.id === 'a1.hola')?.lessonIds).toEqual([
      'a1.hola.l1',
      'a1.hola.l2',
    ]);
    expect(nodes.find((node) => node.kind === 'chest')?.lessonIds).toEqual([
      'a1.primera.l1',
      'a1.primera.l2',
    ]);
    expect(nodes.find((node) => node.id === 'a1.hola')).toMatchObject({
      week: 1,
      day: 1,
      moduleId: 'a1.u01',
    });
  });

  it('reads the bundled course in the same order as the plan', () => {
    const nodes = buildPath(appPathPlan(), { completedLessonIds: [] });
    const topics = nodes.filter((node) => node.kind === 'topic').map((node) => node.id);

    expect(topics[0]).toBe('a1.hola');
    expect(topics).toContain('a1.cafe');
    expect(topics.indexOf('a1.hola')).toBeLessThan(topics.indexOf('a1.cafe'));
    expect(topics).not.toContain('a1.familia');
    expect(topics).not.toContain('a1.primera');
    expect(nodes.find((node) => node.kind === 'chest')?.id).toBe('chest:cp.a1.week1');
    expect(nodes.find((node) => node.id === 'a1.hola')?.status).toBe('current');
  });
});

describe('city names', () => {
  it('names Madrid for the first A1 module in each interface language', () => {
    expect(cityName('a1.u01', 'ru')).toBe('Мадрид');
    expect(cityName('a1.u01', 'uk')).toBe('Мадрид');
    expect(cityName('a1.u01', 'en')).toBe('Madrid');
    expect(cityName('a1.u03', 'uk')).toBe('Севілья');
    expect(cityName('missing', 'ru')).toBe('');
  });

  it('has a city for every module in the bundled plan', () => {
    const ids = plannedModuleIds();
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(cityName(id, 'en')).not.toBe('');
      expect(cityName(id, 'ru')).not.toBe('');
      expect(cityName(id, 'uk')).not.toBe('');
      expect(cityName(id, 'en')).not.toMatch(/[А-Яа-яЁёІіЇїЄєҐґ]/);
    }
  });
});
