import type { Item, Lesson, Scene, Topic } from './schema';

export type ContentBundle = {
  items: readonly Item[];
  topics: readonly Topic[];
  lessons: readonly Lesson[];
  scenes: readonly Scene[];
};

/** Cross-file checks the schema cannot do on its own. Empty means the bundle is consistent. */
export function contentIssues(bundle: ContentBundle): string[] {
  const issues: string[] = [];
  const items = indexIds(bundle.items, 'item', issues);
  const topics = indexIds(bundle.topics, 'topic', issues);
  const lessons = indexIds(bundle.lessons, 'lesson', issues);
  const scenes = indexIds(bundle.scenes, 'scene', issues);
  const listed = new Set(bundle.topics.flatMap((topic) => topic.lessons));

  for (const topic of bundle.topics) {
    if (!scenes.has(topic.scene)) {
      issues.push(`topic ${topic.id} scene ${topic.scene} is missing`);
    }
    for (const lessonId of topic.lessons) {
      const lesson = lessons.get(lessonId);
      if (!lesson) {
        issues.push(`topic ${topic.id} lesson ${lessonId} is missing`);
        continue;
      }
      if (lesson.topic !== topic.id) {
        issues.push(`lesson ${lesson.id} belongs to ${lesson.topic}, but ${topic.id} lists it`);
      }
    }
  }

  for (const scene of bundle.scenes) {
    if (!topics.has(scene.topic)) {
      issues.push(`scene ${scene.id} topic ${scene.topic} is missing`);
    }
  }

  for (const lesson of bundle.lessons) {
    if (!topics.has(lesson.topic)) {
      issues.push(`lesson ${lesson.id} topic ${lesson.topic} is missing`);
    }
    if (!listed.has(lesson.id)) {
      issues.push(`lesson ${lesson.id} is not listed by topic ${lesson.topic}`);
    }
    checkLesson(lesson, items, issues);
  }

  return issues;
}

function checkLesson(lesson: Lesson, items: ReadonlyMap<string, Item>, issues: string[]): void {
  if (lesson.items.length < 6 || lesson.items.length > 8) {
    issues.push(`lesson ${lesson.id} has ${lesson.items.length} items, expected 6–8`);
  }

  const inLesson = new Set<string>();
  let words = 0;

  for (const itemId of lesson.items) {
    if (inLesson.has(itemId)) issues.push(`lesson ${lesson.id} repeats item ${itemId}`);
    inLesson.add(itemId);

    const item = items.get(itemId);
    if (!item) {
      issues.push(`lesson ${lesson.id} item ${itemId} is missing`);
      continue;
    }

    if (item.type === 'word') words += 1;
    const tokens = spanishTokens(item.es);
    if (item.type === 'word' && tokens.length !== 1) {
      issues.push(`item ${item.id} is marked word but has ${tokens.length} Spanish tokens`);
    }
    if (item.type === 'phrase' && tokens.length < 2) {
      issues.push(`item ${item.id} is marked phrase but has ${tokens.length} Spanish tokens`);
    }
  }

  if (words > 3) issues.push(`lesson ${lesson.id} has ${words} separate words, max 3`);

  for (const itemId of lesson.speak) {
    if (!items.has(itemId)) issues.push(`lesson ${lesson.id} speak ${itemId} is missing`);
    if (!inLesson.has(itemId)) {
      issues.push(`lesson ${lesson.id} speak ${itemId} is not in the lesson`);
    }
  }

  for (const line of lesson.dialog.lines) {
    if (line.who !== 'user') continue;
    if (!items.has(line.target)) {
      issues.push(`lesson ${lesson.id} dialog target ${line.target} is missing`);
    }
    if (!line.options.includes(line.target)) {
      issues.push(`lesson ${lesson.id} dialog target ${line.target} is not an option`);
    }
    for (const option of line.options) {
      if (!items.has(option)) {
        issues.push(`lesson ${lesson.id} dialog option ${option} is missing`);
      }
    }
  }

  for (const override of lesson.overrides) {
    if (override.item && !items.has(override.item)) {
      issues.push(`lesson ${lesson.id} override item ${override.item} is missing`);
    }
  }
}

function indexIds<T extends { id: string }>(
  rows: readonly T[],
  kind: string,
  issues: string[],
): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (map.has(row.id)) issues.push(`duplicate ${kind} id ${row.id}`);
    else map.set(row.id, row);
  }
  return map;
}

function spanishTokens(es: string): string[] {
  return es
    .toLowerCase()
    .split(/[^a-záéíóúüñ]+/i)
    .filter((token) => token.length > 0);
}
