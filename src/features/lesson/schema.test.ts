import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { LessonSchema, parseLesson, safeParseLesson } from './schema';
import { listLessonIds, loadAllLessons, loadLesson } from './loader';

const CONTENT_ROOT = join(__dirname, '../../../content');

function listJsonFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listJsonFiles(fullPath));
    } else if (entry.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

describe('LessonSchema', () => {
  it('parses a minimal valid lesson', () => {
    const lesson = parseLesson({
      id: 'test-l01',
      level: 'A1',
      unit: 1,
      title_ru: 'Тест',
      draft: true,
      new_items: [],
      exercises: [
        {
          type: 'select_translation',
          prompt_ru: 'Выберите перевод',
          prompt: 'hola',
          options: ['привет', 'пока'],
          answer: 'привет',
        },
      ],
    });

    expect(lesson.id).toBe('test-l01');
    expect(lesson.draft).toBe(true);
    expect(lesson.exercises).toHaveLength(1);
  });

  it('rejects an unknown exercise type', () => {
    const result = safeParseLesson({
      id: 'bad',
      level: 'A1',
      unit: 1,
      title_ru: 'Плохой',
      exercises: [{ type: 'unknown_type', prompt_ru: 'x' }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects fill_gap without ___ marker', () => {
    const result = LessonSchema.safeParse({
      id: 'bad-gap',
      level: 'A1',
      unit: 1,
      title_ru: 'Пробел',
      exercises: [
        {
          type: 'fill_gap',
          prompt_ru: 'Вставьте',
          sentence_es: 'Yo soy Juan',
          answer: 'soy',
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe('content/ lessons', () => {
  const jsonFiles = listJsonFiles(CONTENT_ROOT);

  it('finds at least the three A1 unit-01 drafts', () => {
    expect(jsonFiles.length).toBeGreaterThanOrEqual(3);
  });

  it.each(jsonFiles.map((file) => [relative(CONTENT_ROOT, file), file]))(
    'validates %s',
    (_rel, file) => {
      const raw: unknown = JSON.parse(readFileSync(file, 'utf8'));
      const result = safeParseLesson(raw);

      if (!result.success) {
        throw new Error(
          `${relative(CONTENT_ROOT, file)} failed schema:\n${JSON.stringify(result.error.format(), null, 2)}`,
        );
      }

      expect(result.data.exercises.length).toBeGreaterThanOrEqual(10);
      expect(result.data.exercises.length).toBeLessThanOrEqual(15);
    },
  );
});

describe('loader', () => {
  it('loads all registered lessons through the schema', () => {
    const lessons = loadAllLessons();
    expect(lessons.map((l) => l.id).sort()).toEqual(listLessonIds().sort());
    expect(lessons.every((l) => l.draft)).toBe(true);
  });

  it('loads a lesson by id', () => {
    const lesson = loadLesson('a1-u01-l01');
    expect(lesson.title_ru).toBe('Приветствия');
    expect(lesson.level).toBe('A1');
    expect(lesson.unit).toBe(1);
  });
});
