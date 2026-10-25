import fs from 'fs';
import path from 'path';

import { z } from 'zod';

import type { ContentBundle } from '../integrity';
import {
  ItemSchema,
  LessonSchema,
  SceneSchema,
  TopicSchema,
  type Item,
  type Lesson,
  type Scene,
  type Topic,
} from '../schema';

export type LoadedContent = {
  bundle: ContentBundle;
  issues: string[];
};

const REQUIRE_PATTERN = /require\('(\.\.\/\.\.\/\.\.\/content\/[^']+\.json)'\)/g;

/** Read content JSON and compare it with the literal requires in the Metro loader. */
export function loadContent(root: string): LoadedContent {
  const contentDir = path.join(root, 'content');
  const loaderPath = path.join(root, 'src/features/content/loader.ts');
  const issues: string[] = [];
  const files = walkJson(contentDir).sort();
  const items: Item[] = [];
  const topics: Topic[] = [];
  const lessons: Lesson[] = [];
  const scenes: Scene[] = [];

  for (const file of files) {
    const relative = repoPath(root, file);
    const raw = parseJson(file, relative, issues);
    if (raw === undefined) continue;
    if (relative.includes('/items/')) items.push(...readArray(ItemSchema, raw, relative, issues));
    else if (relative.endsWith('/topic.json')) {
      const topic = readOne(TopicSchema, raw, relative, issues);
      if (topic) topics.push(topic);
    } else if (relative.endsWith('/scene.json')) {
      const scene = readOne(SceneSchema, raw, relative, issues);
      if (scene) scenes.push(scene);
    } else if (relative.includes('/topics/')) {
      const lesson = readOne(LessonSchema, raw, relative, issues);
      if (lesson) lessons.push(lesson);
    }
  }

  const repoPaths = files.map((file) => repoPath(root, file));
  issues.push(...loaderLinkIssues(readLoader(loaderPath, issues), repoPaths));
  return { bundle: { items, topics, lessons, scenes }, issues };
}

export function loaderLinkIssues(loaderSource: string, repoPaths: readonly string[]): string[] {
  const required = new Set<string>();
  for (const match of loaderSource.matchAll(REQUIRE_PATTERN)) {
    const rel = match[1];
    if (rel) required.add(rel.replace('../../../', ''));
  }
  const onDisk = new Set(repoPaths);
  const issues: string[] = [];
  for (const file of repoPaths) {
    if (!required.has(file)) issues.push(`content file ${file} is not registered in the loader`);
  }
  for (const file of required) {
    if (!onDisk.has(file)) issues.push(`loader require ${file} is missing on disk`);
  }
  return issues.sort();
}

function readArray<T>(schema: z.ZodType<T>, raw: unknown, file: string, issues: string[]): T[] {
  const parsed = z.array(schema).safeParse(raw);
  if (!parsed.success) {
    issues.push(`${file}: ${summarize(parsed.error)}`);
    return [];
  }
  return parsed.data;
}

function readOne<T>(schema: z.ZodType<T>, raw: unknown, file: string, issues: string[]): T | null {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    issues.push(`${file}: ${summarize(parsed.error)}`);
    return null;
  }
  return parsed.data;
}

function parseJson(file: string, relative: string, issues: string[]): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid JSON';
    issues.push(`${relative}: ${message}`);
    return undefined;
  }
}

function readLoader(loaderPath: string, issues: string[]): string {
  try {
    return fs.readFileSync(loaderPath, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'missing loader';
    issues.push(`loader: ${message}`);
    return '';
  }
}

function walkJson(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkJson(full));
    else if (entry.name.endsWith('.json')) found.push(full);
  }
  return found;
}

function repoPath(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join('/');
}

function summarize(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}
