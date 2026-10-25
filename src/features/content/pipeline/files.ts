import type { Lesson } from '../schema';
import type { TopicDraft } from './draft';

const LOADER_ARRAYS = {
  items: 'ITEM_FILES',
  topic: 'TOPIC_FILES',
  lesson: 'LESSON_FILES',
  scene: 'SCENE_FILES',
} as const;

export type ContentFile = {
  path: string;
  body: string;
};

/** Repo-relative JSON files for one topic. Lessons follow topic.lessons. */
export function draftFilePlan(draft: TopicDraft): ContentFile[] {
  const level = draft.topic.level.toLowerCase();
  const slug = draft.topic.id.split('.')[1] ?? draft.topic.id;
  const topicDir = `content/topics/${level}/${slug}`;
  return [
    { path: `content/items/${level}/${slug}.json`, body: json(draft.items) },
    { path: `${topicDir}/topic.json`, body: json(draft.topic) },
    ...draft.lessons.map((lesson) => ({
      path: `${topicDir}/${lessonFile(lesson)}.json`,
      body: json(lesson),
    })),
    { path: `${topicDir}/scene.json`, body: json(draft.scene) },
  ];
}

/**
 * Insert Metro `require()` calls for new content files.
 * The loader comment is the contract: every JSON file is listed literally.
 */
export function registerRequires(loaderSource: string, repoPaths: readonly string[]): string {
  let next = loaderSource;
  for (const repoPath of [...repoPaths].sort()) {
    const kind = fileKind(repoPath);
    if (!kind) continue;
    next = insertRequire(next, LOADER_ARRAYS[kind], `../../../${repoPath}`);
  }
  return next;
}

export function lessonFile(lesson: Pick<Lesson, 'id'>): string {
  const name = lesson.id.split('.').at(-1);
  return name && name.length > 0 ? name : lesson.id;
}

function fileKind(repoPath: string): keyof typeof LOADER_ARRAYS | null {
  if (repoPath.includes('/items/')) return 'items';
  if (repoPath.endsWith('/topic.json')) return 'topic';
  if (repoPath.endsWith('/scene.json')) return 'scene';
  if (repoPath.includes('/topics/') && repoPath.endsWith('.json')) return 'lesson';
  return null;
}

function insertRequire(source: string, constName: string, requirePath: string): string {
  const marker = `const ${constName}: readonly unknown[] = [`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`loader is missing ${constName}`);
  const open = start + marker.length - 1;
  const close = source.indexOf('];', open);
  if (close < 0) throw new Error(`loader array ${constName} is not closed`);
  const block = source.slice(open + 1, close);
  if (block.includes(requirePath)) return source;
  const lines = block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  lines.push(`require('${requirePath}') as unknown,`);
  lines.sort((left, right) => left.localeCompare(right));
  const body = `\n${lines.map((line) => `  ${line}`).join('\n')}\n`;
  return `${source.slice(0, open + 1)}${body}${source.slice(close)}`;
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
