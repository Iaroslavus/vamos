import rawCoursePlan from '../../../content/course-plan.json';

import { listTopics } from '@/features/content/loader';

import type { PathModule, PathPlan, PathTopic } from './map';

export type PlayableTopic = {
  id: string;
  lessons: readonly string[];
  starterDay?: number;
};

export type CoursePlanFile = {
  starter_week: readonly { day?: number; checkpoint_id?: string }[];
  levels: readonly {
    level: string;
    units: readonly {
      id: string;
      checkpoint_id: string | null;
      topics: readonly { id: string; starter_day: number | null }[];
    }[];
  }[];
};

/** Course order, limited to topics the app can already open. */
export function buildCoursePlan(file: CoursePlanFile, topics: readonly PlayableTopic[]): PathPlan {
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const placed = new Set<string>();
  const modules: PathModule[] = [];

  for (const level of file.levels) {
    level.units.forEach((unit, index) => {
      const rows: PathTopic[] = [];
      for (const topic of unit.topics) {
        const playable = byId.get(topic.id);
        if (!playable) continue;
        placed.add(playable.id);
        rows.push({
          id: playable.id,
          lessonIds: [...playable.lessons],
          day: topic.starter_day,
        });
      }
      if (rows.length === 0) return;
      modules.push({
        id: unit.id,
        level: level.level,
        week: index + 1,
        checkpointId: unit.checkpoint_id,
        chestLessonIds: unit.checkpoint_id
          ? chestLessons(file, unit.checkpoint_id, byId, placed)
          : [],
        topics: rows,
      });
    });
  }

  return { modules };
}

export function readCoursePlan(raw: unknown): CoursePlanFile {
  if (!isRecord(raw)) return { starter_week: [], levels: [] };
  return {
    starter_week: arrayOf(raw.starter_week).flatMap(readStarter),
    levels: arrayOf(raw.levels).flatMap(readLevel),
  };
}

export function appPathPlan(): PathPlan {
  return buildCoursePlan(
    readCoursePlan(rawCoursePlan),
    listTopics().map((topic) => ({
      id: topic.id,
      lessons: topic.lessons,
      starterDay: topic.starter_day,
    })),
  );
}

export function plannedModuleIds(): string[] {
  return readCoursePlan(rawCoursePlan).levels.flatMap((level) =>
    level.units.map((unit) => unit.id),
  );
}

function chestLessons(
  file: CoursePlanFile,
  checkpointId: string,
  topics: ReadonlyMap<string, PlayableTopic>,
  placed: ReadonlySet<string>,
): string[] {
  const day = file.starter_week.find((row) => row.checkpoint_id === checkpointId)?.day;
  if (day == null) return [];
  const lessons: string[] = [];
  for (const topic of topics.values()) {
    if (placed.has(topic.id) || topic.starterDay !== day) continue;
    lessons.push(...topic.lessons);
  }
  return lessons;
}

function readStarter(value: unknown): { day?: number; checkpoint_id?: string }[] {
  if (!isRecord(value) || typeof value.checkpoint_id !== 'string') return [];
  return [
    {
      day: typeof value.day === 'number' ? value.day : undefined,
      checkpoint_id: value.checkpoint_id,
    },
  ];
}

function readLevel(value: unknown): CoursePlanFile['levels'][number][] {
  if (!isRecord(value) || typeof value.level !== 'string') return [];
  return [
    {
      level: value.level,
      units: arrayOf(value.units).flatMap(readUnit),
    },
  ];
}

function readUnit(value: unknown): CoursePlanFile['levels'][number]['units'][number][] {
  if (!isRecord(value) || typeof value.id !== 'string') return [];
  return [
    {
      id: value.id,
      checkpoint_id: typeof value.checkpoint_id === 'string' ? value.checkpoint_id : null,
      topics: arrayOf(value.topics).flatMap(readTopic),
    },
  ];
}

function readTopic(
  value: unknown,
): CoursePlanFile['levels'][number]['units'][number]['topics'][number][] {
  if (!isRecord(value) || typeof value.id !== 'string') return [];
  return [
    {
      id: value.id,
      starter_day: typeof value.starter_day === 'number' ? value.starter_day : null,
    },
  ];
}

function arrayOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
