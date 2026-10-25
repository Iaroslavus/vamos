import { listItems, listLessons, listScenes, listTopics } from './loader';
import { contentIssues, type ContentBundle } from './integrity';
import { ItemSchema, LessonSchema, SceneSchema, TopicSchema } from './schema';
import { fillLocales } from './text';

function bundle(): ContentBundle {
  return {
    items: listItems(),
    topics: listTopics(),
    lessons: listLessons(),
    scenes: listScenes(),
  };
}

describe('bundled content', () => {
  it('has unique ids and resolvable links', () => {
    expect(contentIssues(bundle())).toEqual([]);
  });

  it('keeps each lesson to 6–8 items and at most 3 words', () => {
    const items = new Map(listItems().map((item) => [item.id, item]));
    for (const lesson of listLessons()) {
      const units = lesson.items.map((id) => items.get(id));
      expect(units.every((unit) => unit !== undefined)).toBe(true);
      expect(lesson.items.length).toBeGreaterThanOrEqual(6);
      expect(lesson.items.length).toBeLessThanOrEqual(8);
      const words = units.filter((unit) => unit?.type === 'word');
      expect(words.length).toBeLessThanOrEqual(3);
    }
  });
});

describe('contentIssues', () => {
  const base = (): ContentBundle => ({
    items: [
      word('t.uno', 'uno', 'один'),
      word('t.dos', 'dos', 'два'),
      word('t.tres', 'tres', 'три'),
      word('t.hola', 'hola', 'привет'),
      phrase('t.gracias_por', 'gracias por', 'спасибо за'),
      phrase('t.por_favor', 'por favor', 'пожалуйста'),
    ],
    topics: [
      TopicSchema.parse({
        id: 'a1.t',
        level: 'A1',
        category: 'first_steps',
        title: fillLocales('Тест'),
        icon: 'wave',
        can_do: [fillLocales('Проверить ссылки')],
        lessons: ['a1.t.l1'],
        scene: 'a1.t.scene',
        draft: true,
      }),
    ],
    lessons: [
      LessonSchema.parse({
        id: 'a1.t.l1',
        topic: 'a1.t',
        title: fillLocales('Тест'),
        items: ['t.uno', 't.dos', 't.tres', 't.hola', 't.gracias_por', 't.por_favor'],
        speak: ['t.por_favor'],
        dialog: {
          lines: [
            {
              who: 'user',
              target: 't.por_favor',
              options: ['t.por_favor', 't.hola'],
            },
          ],
        },
        draft: true,
      }),
    ],
    scenes: [
      SceneSchema.parse({
        id: 'a1.t.scene',
        topic: 'a1.t',
        title: fillLocales('Сценка'),
        draft: true,
      }),
    ],
  });

  it('reports a dialog target that is not in the library', () => {
    const broken = base();
    broken.lessons = [
      {
        ...broken.lessons[0]!,
        dialog: {
          lines: [
            {
              who: 'user',
              target: 't.missing',
              options: ['t.missing', 't.hola'],
            },
          ],
        },
      },
    ];

    expect(contentIssues(broken).join('\n')).toContain('dialog target t.missing is missing');
  });

  it('reports a lesson with more than three words', () => {
    const broken = base();
    expect(contentIssues(broken).join('\n')).toContain('4 separate words');
  });

  it('reports a topic scene that does not exist', () => {
    const broken = base();
    broken.topics = [{ ...broken.topics[0]!, scene: 'a1.t.missing' }];
    expect(contentIssues(broken).join('\n')).toContain('scene a1.t.missing is missing');
  });

  it('reports a duplicate item id', () => {
    const broken = base();
    broken.items = [...broken.items, broken.items[0]!];
    expect(contentIssues(broken).join('\n')).toContain('duplicate item id t.uno');
  });
});

function word(id: string, es: string, ru: string) {
  return ItemSchema.parse({
    id,
    type: 'word',
    es,
    tr: fillLocales(ru),
    say: fillLocales(es),
    level: 'A1',
    draft: true,
  });
}

function phrase(id: string, es: string, ru: string) {
  return ItemSchema.parse({
    id,
    type: 'phrase',
    es,
    tr: fillLocales(ru),
    say: fillLocales(es),
    level: 'A1',
    draft: true,
  });
}
