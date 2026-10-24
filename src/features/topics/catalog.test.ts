import { listLessons, listScenes, listTopics } from '@/features/content/loader';
import type { Lesson, Scene, Topic } from '@/features/content/schema';

import { buildTopicDetail, initialLevel, levelHasContent, topicSections } from './catalog';

function topic(overrides: Partial<Topic> & { id: string }): Topic {
  return {
    level: 'A1',
    category: 'first_steps',
    title_ru: overrides.id,
    icon: 'wave',
    can_do_ru: ['Одно', 'Два', 'Три'],
    lessons: ['l1', 'l2'],
    scene: `${overrides.id}.scene`,
    draft: false,
    ...overrides,
  };
}

function lesson(id: string, items: string[], title = id): Lesson {
  return {
    id,
    topic: 'topic',
    title_ru: title,
    items,
    speak: [],
    dialog: { lines: [{ who: 'npc', es: 'Hola', ru: 'Привет' }] },
    overrides: [],
    draft: false,
  };
}

function scene(id: string, title: string): Scene {
  return { id, topic: 'topic', title_ru: title, draft: false };
}

describe('topic catalog', () => {
  it('lists bundled A1 topics, including drafts, with phrase counts', () => {
    expect(listTopics().every((item) => item.draft)).toBe(true);
    expect(levelHasContent(listTopics(), 'A1')).toBe(true);
    expect(levelHasContent(listTopics(), 'A2')).toBe(false);
    expect(initialLevel(listTopics())).toBe('A1');
    expect(initialLevel([])).toBe('A1');

    const sections = topicSections(listTopics(), listLessons(), [], 'A1', '');
    expect(sections.map((section) => section.category)).toEqual(['first_steps']);
    expect(sections[0]?.topics.map((item) => item.id)).toEqual(['a1.hola', 'a1.numbers']);
    expect(sections[0]?.topics[0]).toMatchObject({
      lessonCount: 2,
      phraseCount: 15,
      completedLessons: 0,
      progress: 0,
    });
    expect(sections[0]?.topics[1]).toMatchObject({ lessonCount: 1, phraseCount: 7 });
    expect(topicSections(listTopics(), listLessons(), [], 'B1', '')).toEqual([]);
  });

  it('searches titles and goals inside the selected level', () => {
    const topics = [
      topic({ id: 'cafe', title_ru: 'В кафе', can_do_ru: ['Заказать напиток'] }),
      topic({ id: 'shop', category: 'shopping', title_ru: 'Магазин', starter_day: 1 }),
      topic({ id: 'later', title_ru: 'Позже', starter_day: undefined }),
      topic({ id: 'a2', level: 'A2', title_ru: 'В кафе два' }),
    ];

    expect(
      topicSections(topics, [], [], 'A1', '  КАФЕ ').flatMap((section) =>
        section.topics.map((item) => item.id),
      ),
    ).toEqual(['cafe']);
    expect(
      topicSections(topics, [], [], 'A1', 'напиток').flatMap((section) =>
        section.topics.map((item) => item.id),
      ),
    ).toEqual(['cafe']);

    const order = topicSections(topics, [], [], 'A1', '').flatMap((section) => [
      section.category,
      ...section.topics.map((item) => item.id),
    ]);
    expect(order).toEqual(['first_steps', 'cafe', 'later', 'shopping', 'shop']);
  });

  it('counts unique phrases and checks goals as lessons are completed', () => {
    const topics = [
      topic({
        id: 'cafe',
        lessons: ['l1', 'l2', 'l3'],
        can_do_ru: ['Заказать', 'Спросить цену', 'Попросить счёт'],
      }),
    ];
    const lessons = [
      lesson('l1', ['a', 'b'], 'Первый'),
      lesson('l2', ['b', 'c'], 'Второй'),
      lesson('l3', ['d'], 'Третий'),
    ];
    const scenes = [scene('cafe.scene', 'У стойки')];

    const none = buildTopicDetail('cafe', topics, lessons, scenes, []);
    expect(none?.phraseCount).toBe(4);
    expect(none?.lessons.map((item) => item.status)).toEqual(['current', 'locked', 'locked']);
    expect(none?.canDos.map((item) => item.done)).toEqual([false, false, false]);
    expect(none?.scene).toMatchObject({ title: 'У стойки', status: 'locked' });

    const one = buildTopicDetail('cafe', topics, lessons, scenes, ['l1']);
    expect(one?.completedLessons).toBe(1);
    expect(one?.progress).toBeCloseTo(1 / 3);
    expect(one?.lessons.map((item) => item.status)).toEqual(['completed', 'current', 'locked']);
    expect(one?.canDos.map((item) => item.done)).toEqual([true, false, false]);
    expect(one?.scene.status).toBe('locked');

    const skipped = buildTopicDetail('cafe', topics, lessons, scenes, ['l2']);
    expect(skipped?.lessons.map((item) => [item.title, item.status])).toEqual([
      ['Первый', 'current'],
      ['Второй', 'completed'],
      ['Третий', 'locked'],
    ]);

    const done = buildTopicDetail('cafe', topics, lessons, scenes, ['l1', 'l2', 'l3']);
    expect(done?.progress).toBe(1);
    expect(done?.canDos.every((item) => item.done)).toBe(true);
    expect(done?.scene.status).toBe('ready');
    expect(buildTopicDetail('missing', topics, lessons, scenes, [])).toBeNull();
  });

  it('keeps a missing lesson in the lock chain and falls back when the scene is absent', () => {
    const topics = [topic({ id: 'gap', lessons: ['known', 'missing'], can_do_ru: ['Одно'] })];
    const detail = buildTopicDetail('gap', topics, [lesson('known', ['a'], 'Есть')], [], ['known']);

    expect(detail?.phraseCount).toBe(1);
    expect(detail?.lessons.map((item) => [item.title, item.status])).toEqual([
      ['Есть', 'completed'],
      ['missing', 'current'],
    ]);
    expect(detail?.scene).toMatchObject({ id: 'gap.scene', title: 'gap.scene', status: 'locked' });
  });

  it('reads the bundled topic the way the screen will', () => {
    const detail = buildTopicDetail('a1.hola', listTopics(), listLessons(), listScenes(), [
      'a1.hola.l1',
    ]);
    expect(detail?.lessons.map((item) => [item.title, item.status])).toEqual([
      ['Приветствия', 'completed'],
      ['Знакомство', 'current'],
    ]);
    expect(detail?.canDos.filter((item) => item.done)).toHaveLength(1);
    expect(detail?.scene).toMatchObject({ title: 'Знакомство на улице', status: 'locked' });
  });
});
