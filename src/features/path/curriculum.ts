export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export type CurriculumLesson = {
  id: string;
  level: CefrLevel;
  unit: number;
  /** i18n key for the Russian title shown on the path. */
  titleKey: string;
};

export type PathNodeStatus = 'completed' | 'current' | 'locked';

export type PathNode = {
  lesson: CurriculumLesson;
  status: PathNodeStatus;
  side: 'left' | 'right';
  index: number;
};

export type LevelProgress = {
  level: CefrLevel;
  completed: number;
  total: number;
};

const CURRICULUM: readonly CurriculumLesson[] = [
  { id: 'a1.hola.l1', level: 'A1', unit: 1, titleKey: 'learn.lessons.a1-u01-l01' },
  { id: 'a1.hola.l2', level: 'A1', unit: 1, titleKey: 'learn.lessons.a1-u01-l02' },
  { id: 'a1.cafe.l1', level: 'A1', unit: 2, titleKey: 'learn.lessons.a1-cafe-l1' },
  { id: 'a1.cafe.l2', level: 'A1', unit: 2, titleKey: 'learn.lessons.a1-cafe-l2' },
  { id: 'a1.numbers.l1', level: 'A1', unit: 3, titleKey: 'learn.lessons.a1-u01-l03' },
  { id: 'a1.numbers.l2', level: 'A1', unit: 3, titleKey: 'learn.lessons.a1-numbers-l2' },
  { id: 'a1.tienda.l1', level: 'A1', unit: 4, titleKey: 'learn.lessons.a1-tienda-l1' },
  { id: 'a1.tienda.l2', level: 'A1', unit: 4, titleKey: 'learn.lessons.a1-tienda-l2' },
  { id: 'a1.camino.l1', level: 'A1', unit: 5, titleKey: 'learn.lessons.a1-camino-l1' },
  { id: 'a1.camino.l2', level: 'A1', unit: 5, titleKey: 'learn.lessons.a1-camino-l2' },
  { id: 'a1.restaurante.l1', level: 'A1', unit: 6, titleKey: 'learn.lessons.a1-restaurante-l1' },
  { id: 'a1.restaurante.l2', level: 'A1', unit: 6, titleKey: 'learn.lessons.a1-restaurante-l2' },
  { id: 'a1.primera.l1', level: 'A1', unit: 7, titleKey: 'learn.lessons.a1-primera-l1' },
  { id: 'a1.primera.l2', level: 'A1', unit: 7, titleKey: 'learn.lessons.a1-primera-l2' },
];

export function getCurriculumLessons(): CurriculumLesson[] {
  return [...CURRICULUM].sort((a, b) => {
    const byLevel = levelRank(a.level) - levelRank(b.level);
    if (byLevel !== 0) return byLevel;
    if (a.unit !== b.unit) return a.unit - b.unit;
    return a.id.localeCompare(b.id);
  });
}

export function buildPathNodes(
  lessons: readonly CurriculumLesson[],
  completedIds: readonly string[],
): PathNode[] {
  const completed = new Set(completedIds);
  const currentId = lessons.find((lesson) => !completed.has(lesson.id))?.id ?? null;

  return lessons.map((lesson, index) => {
    let status: PathNodeStatus = 'locked';
    if (completed.has(lesson.id)) status = 'completed';
    else if (lesson.id === currentId) status = 'current';

    return {
      lesson,
      status,
      side: index % 2 === 0 ? 'left' : 'right',
      index,
    };
  });
}

/** Unit heading: the lesson the learner should open, or the last one when the path is done. */
export function pathUnit(
  lessons: readonly CurriculumLesson[],
  completedIds: readonly string[],
): CurriculumLesson | null {
  if (lessons.length === 0) return null;
  const nodes = buildPathNodes(lessons, completedIds);
  const current = nodes.find((node) => node.status === 'current');
  return (current ?? nodes[nodes.length - 1]).lesson;
}

export function levelProgress(
  completedIds: readonly string[],
  lessons: readonly CurriculumLesson[] = getCurriculumLessons(),
): LevelProgress[] {
  const done = new Set(completedIds);
  return CEFR_LEVELS.map((level) => {
    const inLevel = lessons.filter((lesson) => lesson.level === level);
    const completed = inLevel.filter((lesson) => done.has(lesson.id)).length;
    return { level, completed, total: inLevel.length };
  });
}

export function levelRatio(row: LevelProgress): number {
  if (row.total <= 0) return 0;
  return Math.min(1, row.completed / row.total);
}

/** First level that still has an unfinished lesson. */
export function currentLevel(rows: readonly LevelProgress[]): CefrLevel | null {
  return rows.find((row) => row.total > 0 && row.completed < row.total)?.level ?? null;
}

function levelRank(level: CefrLevel): number {
  const index = CEFR_LEVELS.indexOf(level);
  return index === -1 ? CEFR_LEVELS.length : index;
}
