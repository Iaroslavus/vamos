import { ItemSchema, type Item } from '@/features/content/schema';

import { TOPIC_TEST_KINDS, TOPIC_TEST_MAX, TOPIC_TEST_MIN, assembleTopicTest } from './assemble';
import { loadTopicTest } from './load';

function item(id: string, es: string, ru: string, phrase: boolean): Item {
  const tokens = es.split(/\s+/);
  return ItemSchema.parse({
    id,
    type: phrase ? 'phrase' : 'word',
    es,
    tr: { ru, uk: ru, en: ru },
    say: { ru: 'say', uk: 'say', en: 'say' },
    level: 'A1',
    parts: phrase
      ? tokens.map((token) => ({ es: token, tr: { ru: token, uk: token, en: token } }))
      : [],
  });
}

const phrases = [
  item('a.uno', 'buenos días', 'доброе утро', true),
  item('a.dos', 'buenas tardes', 'добрый день', true),
  item('a.tres', 'buenas noches', 'добрый вечер', true),
  item('a.cuatro', 'hasta luego', 'до скорого', true),
  item('b.uno', 'por favor', 'пожалуйста', true),
  item('b.dos', 'muchas gracias', 'большое спасибо', true),
  item('b.tres', 'de nada', 'не за что', true),
  item('b.cuatro', 'lo siento', 'мне жаль', true),
];

const lessons = [
  { id: 'l1', items: phrases.slice(0, 4) },
  { id: 'l2', items: phrases.slice(4) },
];

describe('assembleTopicTest', () => {
  it('builds 10–12 tasks with every kind and exactly two speaking tasks', () => {
    const tasks = assembleTopicTest({ lessons, seed: 'topic', language: 'ru' });
    const kinds = new Set(tasks.map((task) => task.kind));

    expect(tasks.length).toBeGreaterThanOrEqual(TOPIC_TEST_MIN);
    expect(tasks.length).toBeLessThanOrEqual(TOPIC_TEST_MAX);
    expect(kinds).toEqual(new Set(TOPIC_TEST_KINDS));
    expect(tasks.filter((task) => task.kind === 'speak')).toHaveLength(2);
    expect(new Set(tasks.map((task) => task.lessonId))).toEqual(new Set(['l1', 'l2']));
    expect(tasks.every((task) => phrases.some((entry) => entry.id === task.itemId))).toBe(true);
    expect(tasks[0]?.kind).toBe('recognize');

    const again = assembleTopicTest({ lessons, seed: 'topic', language: 'ru' });
    expect(again.map((task) => `${task.kind}:${task.itemId}`)).toEqual(
      tasks.map((task) => `${task.kind}:${task.itemId}`),
    );
  });

  it('stays inside the range when nothing can be assembled', () => {
    const words = phrases.map((entry, index) =>
      item(entry.id, `hola${index}`, entry.tr.ru ?? 'привет', false),
    );
    const tasks = assembleTopicTest({
      lessons: [{ id: 'l1', items: words }],
      seed: 'words',
      language: 'uk',
    });

    expect(tasks.length).toBeGreaterThanOrEqual(TOPIC_TEST_MIN);
    expect(tasks.length).toBeLessThanOrEqual(TOPIC_TEST_MAX);
    expect(tasks.some((task) => task.kind === 'build')).toBe(false);
    expect(tasks.filter((task) => task.kind === 'speak')).toHaveLength(2);
    expect(tasks.some((task) => task.kind === 'recognize')).toBe(true);
    expect(tasks.some((task) => task.kind === 'recall')).toBe(true);
    expect(tasks.some((task) => task.kind === 'listen')).toBe(true);
  });

  it('draws the published topic from every lesson', () => {
    const loaded = loadTopicTest('a1.hola', 'a1.hola', 'uk');
    expect(loaded).not.toBeNull();
    const tasks = loaded?.tasks ?? [];
    expect(tasks.length).toBeGreaterThanOrEqual(TOPIC_TEST_MIN);
    expect(tasks.length).toBeLessThanOrEqual(TOPIC_TEST_MAX);
    expect(new Set(tasks.map((task) => task.kind))).toEqual(new Set(TOPIC_TEST_KINDS));
    expect(tasks.filter((task) => task.kind === 'speak')).toHaveLength(2);
    expect(tasks[0]?.kind).toBe('recognize');
    expect(new Set(tasks.map((task) => task.lessonId)).size).toBeGreaterThan(1);
  });
});
