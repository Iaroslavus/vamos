export const LEGACY_PROGRESS_VERSION = '2.8';

/** Device snapshot written by app 2.8 before progress lived in the database. */
export const LEGACY_PROGRESS_KEY = 'vamos.progress.v2.8';

/** Set after the 2.8 snapshot has been copied once. Further edits of the old key are ignored. */
export const LEGACY_MIGRATED_KEY = 'vamos.progress.v2.8.migrated';

export type LegacyLessonV28 = {
  lessonId: string;
  accuracy: number;
  xp: number;
  completedAt: string;
};

export type LegacyProgressV28 = {
  version: typeof LEGACY_PROGRESS_VERSION;
  lessons: LegacyLessonV28[];
};

export function legacyXpClientId(lesson: LegacyLessonV28): string {
  return `v2.8:${lesson.lessonId}:${lesson.completedAt}:${lesson.xp}`;
}

export function parseLegacyProgressV28(raw: string | null): LegacyProgressV28 | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || parsed.version !== LEGACY_PROGRESS_VERSION) return null;
  if (!Array.isArray(parsed.lessons)) return null;

  const lessons: LegacyLessonV28[] = [];
  for (const item of parsed.lessons) {
    const lesson = parseLesson(item);
    if (lesson) lessons.push(lesson);
  }
  return { version: LEGACY_PROGRESS_VERSION, lessons };
}

function parseLesson(item: unknown): LegacyLessonV28 | null {
  if (!isRecord(item)) return null;
  const { lessonId, accuracy, xp, completedAt } = item;
  if (typeof lessonId !== 'string' || lessonId.trim().length < 1 || lessonId.trim().length > 100) {
    return null;
  }
  if (
    typeof accuracy !== 'number' ||
    !Number.isFinite(accuracy) ||
    accuracy < 0 ||
    accuracy > 100
  ) {
    return null;
  }
  if (typeof xp !== 'number' || !Number.isInteger(xp) || xp < 0) return null;
  if (typeof completedAt !== 'string' || Number.isNaN(Date.parse(completedAt))) return null;
  return { lessonId: lessonId.trim(), accuracy, xp, completedAt };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
