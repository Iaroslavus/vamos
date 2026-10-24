import { z } from 'zod';

import {
  ItemSchema,
  LessonSchema,
  SceneSchema,
  TopicSchema,
  type CefrLevel,
  type Item,
  type Lesson,
  type Scene,
  type Topic,
  type TopicCategory,
} from './schema';

/**
 * Bundled content. Metro only accepts literal `require()` calls,
 * so a new JSON file has to be added here.
 */
const ITEM_FILES: readonly unknown[] = [
  require('../../../content/items/a1/hola.json') as unknown,
  require('../../../content/items/a1/numbers.json') as unknown,
];

const TOPIC_FILES: readonly unknown[] = [
  require('../../../content/topics/a1/hola/topic.json') as unknown,
  require('../../../content/topics/a1/numbers/topic.json') as unknown,
];

const LESSON_FILES: readonly unknown[] = [
  require('../../../content/topics/a1/hola/l1.json') as unknown,
  require('../../../content/topics/a1/hola/l2.json') as unknown,
  require('../../../content/topics/a1/numbers/l1.json') as unknown,
];

const SCENE_FILES: readonly unknown[] = [
  require('../../../content/topics/a1/hola/scene.json') as unknown,
  require('../../../content/topics/a1/numbers/scene.json') as unknown,
];

const items = indexById(
  ITEM_FILES.flatMap((raw) => z.array(ItemSchema).parse(raw)),
  'item',
);
const topics = indexById(
  TOPIC_FILES.map((raw) => TopicSchema.parse(raw)),
  'topic',
);
const lessons = indexById(
  LESSON_FILES.map((raw) => LessonSchema.parse(raw)),
  'lesson',
);
const scenes = indexById(
  SCENE_FILES.map((raw) => SceneSchema.parse(raw)),
  'scene',
);

export function getItem(id: string): Item {
  return required(items, id, 'item');
}

export function getTopic(id: string): Topic {
  return required(topics, id, 'topic');
}

export function getLesson(id: string): Lesson {
  return required(lessons, id, 'lesson');
}

export function getScene(id: string): Scene {
  return required(scenes, id, 'scene');
}

export function listItems(): Item[] {
  return [...items.values()];
}

export function listTopics(): Topic[] {
  return [...topics.values()];
}

export function listLessons(): Lesson[] {
  return [...lessons.values()];
}

export function listScenes(): Scene[] {
  return [...scenes.values()];
}

export function topicsByLevel(level: CefrLevel): Topic[] {
  return listTopics()
    .filter((topic) => topic.level === level)
    .sort(compareTopics);
}

export function topicsByCategory(category: TopicCategory): Topic[] {
  return listTopics()
    .filter((topic) => topic.category === category)
    .sort(compareTopics);
}

function compareTopics(a: Topic, b: Topic): number {
  const dayA = a.starter_day ?? Number.POSITIVE_INFINITY;
  const dayB = b.starter_day ?? Number.POSITIVE_INFINITY;
  if (dayA !== dayB) return dayA - dayB;
  return a.id.localeCompare(b.id);
}

function required<T>(map: ReadonlyMap<string, T>, id: string, kind: string): T {
  const row = map.get(id);
  if (!row) throw new Error(`Unknown ${kind} id: ${id}`);
  return row;
}

function indexById<T extends { id: string }>(rows: readonly T[], kind: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (map.has(row.id)) throw new Error(`Duplicate ${kind} id: ${row.id}`);
    map.set(row.id, row);
  }
  return map;
}
