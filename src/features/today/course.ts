import type { Lesson, Topic } from '@/features/content/schema';

/** The starter course is always a week, even when some days have no topic yet. */
export const STARTER_DAYS = 7;

const LEVEL_RANK: Record<Topic['level'], number> = {
  A1: 0,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 4,
  C2: 5,
};

export type LessonRow = {
  lessonId: string;
  status: 'in_progress' | 'completed';
  completedAt: string | null;
};

export type DayStatus = 'completed' | 'current' | 'locked' | 'empty';

export type CourseDay = {
  day: number;
  topicId: string | null;
  title: string | null;
  icon: string | null;
  lessonIds: string[];
  status: DayStatus;
};

export type StartedTopicCard = {
  id: string;
  title: string;
  icon: string;
  completedLessons: number;
  lessonCount: number;
  progress: number;
};

export type TodayPlan = {
  days: CourseDay[];
  /** 1–7 while the week is open. */
  currentDay: number | null;
  finished: boolean;
  /** Next lesson inside the open day. Absent when that day has no topic yet. */
  continueLessonId: string | null;
  /** Set once all seven days are done. */
  nextTopicId: string | null;
  nextTopicTitle: string | null;
  nextTopicLessonId: string | null;
  started: StartedTopicCard[];
  /** First lesson of day 1. The new-user path opens this immediately. */
  dayOneLessonId: string | null;
  /** Lesson whose speak lines the “say aloud” card opens. */
  speakLessonId: string | null;
};

export function buildTodayPlan(topics: readonly Topic[], rows: readonly LessonRow[]): TodayPlan {
  const completed = new Set(
    rows.filter((row) => row.status === 'completed').map((row) => row.lessonId),
  );
  const days = courseDays(topics, completed);
  const finished = days.every((day) => day.status === 'completed');
  const open = days.find((day) => day.status === 'current' || day.status === 'empty') ?? null;
  const continueLessonId =
    open?.status === 'current' ? (open.lessonIds.find((id) => !completed.has(id)) ?? null) : null;
  const next = finished ? nextTopic(topics, completed) : null;
  const nextTopicLessonId = next?.lessons.find((id) => !completed.has(id)) ?? null;
  const started = startedTopics(topics, rows, completed);

  return {
    days,
    currentDay: open?.day ?? null,
    finished,
    continueLessonId,
    nextTopicId: next?.id ?? null,
    nextTopicTitle: next?.title_ru ?? null,
    nextTopicLessonId,
    started,
    dayOneLessonId: days[0]?.lessonIds[0] ?? null,
    speakLessonId:
      continueLessonId ?? nextTopicLessonId ?? firstOpenLesson(started, topics, completed),
  };
}

/**
 * Days unlock as soon as the previous day's lessons are finished.
 * A calendar date is not part of the rule. A day with no topic stays closed
 * and holds the rest of the week.
 */
function courseDays(topics: readonly Topic[], completed: ReadonlySet<string>): CourseDay[] {
  let opened = false;

  return Array.from({ length: STARTER_DAYS }, (_, index) => {
    const day = index + 1;
    const group = topics
      .filter((topic) => topic.starter_day === day)
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));
    const lessonIds = group.flatMap((topic) => topic.lessons);
    const done = lessonIds.length > 0 && lessonIds.every((id) => completed.has(id));

    let status: DayStatus;
    if (opened) status = 'locked';
    else if (done) status = 'completed';
    else {
      opened = true;
      status = lessonIds.length === 0 ? 'empty' : 'current';
    }

    return {
      day,
      topicId: group[0]?.id ?? null,
      title: group[0]?.title_ru ?? null,
      icon: group[0]?.icon ?? null,
      lessonIds,
      status,
    };
  });
}

function nextTopic(topics: readonly Topic[], completed: ReadonlySet<string>): Topic | null {
  const starterIds = new Set(
    topics.filter((topic) => topic.starter_day != null).map((topic) => topic.id),
  );
  const rest = topics
    .filter((topic) => !starterIds.has(topic.id))
    .slice()
    .sort(compareTopics);
  return rest.find((topic) => topic.lessons.some((id) => !completed.has(id))) ?? rest[0] ?? null;
}

function startedTopics(
  topics: readonly Topic[],
  rows: readonly LessonRow[],
  completed: ReadonlySet<string>,
): StartedTopicCard[] {
  const byLesson = new Map(rows.map((row) => [row.lessonId, row]));

  const cards = topics.flatMap((topic) => {
    const related = topic.lessons.flatMap((id) => {
      const row = byLesson.get(id);
      return row ? [row] : [];
    });
    if (related.length === 0) return [];

    const completedLessons = topic.lessons.filter((id) => completed.has(id)).length;
    const latest = related.reduce((max, row) => {
      const time = row.completedAt ? Date.parse(row.completedAt) : 0;
      return Number.isNaN(time) ? max : Math.max(max, time);
    }, 0);
    const active = related.some((row) => row.status === 'in_progress');

    return [
      {
        id: topic.id,
        title: topic.title_ru,
        icon: topic.icon,
        completedLessons,
        lessonCount: topic.lessons.length,
        progress: topic.lessons.length === 0 ? 0 : completedLessons / topic.lessons.length,
        latest,
        active,
      },
    ];
  });

  cards.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    if (a.latest !== b.latest) return b.latest - a.latest;
    return a.id.localeCompare(b.id);
  });

  return cards.map((card) => ({
    id: card.id,
    title: card.title,
    icon: card.icon,
    completedLessons: card.completedLessons,
    lessonCount: card.lessonCount,
    progress: card.progress,
  }));
}

function firstOpenLesson(
  started: readonly StartedTopicCard[],
  topics: readonly Topic[],
  completed: ReadonlySet<string>,
): string | null {
  const first = started[0];
  if (!first) return null;
  const topic = topics.find((item) => item.id === first.id);
  if (!topic) return null;
  return topic.lessons.find((id) => !completed.has(id)) ?? topic.lessons[0] ?? null;
}

function compareTopics(a: Topic, b: Topic): number {
  const byLevel = LEVEL_RANK[a.level] - LEVEL_RANK[b.level];
  if (byLevel !== 0) return byLevel;
  const dayA = a.starter_day ?? Number.POSITIVE_INFINITY;
  const dayB = b.starter_day ?? Number.POSITIVE_INFINITY;
  if (dayA !== dayB) return dayA - dayB;
  return a.id.localeCompare(b.id);
}

export function speakLines(
  lessonId: string | null,
  lessons: readonly Lesson[],
): { lessonId: string; itemIds: string[] } | null {
  if (!lessonId) return null;
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson || lesson.speak.length === 0) return null;
  return { lessonId: lesson.id, itemIds: [...lesson.speak] };
}

/** Where a learner should be before Today is useful. */
export function learnerDestination(input: {
  name: string | null;
  preferencesAsked: boolean;
  dayOneFirstLessonId: string | null;
  completedLessonIds: readonly string[];
  justFinishedLessonId?: string | null;
}): 'name' | 'preferences' | 'app' {
  if (!input.name?.trim()) return 'name';
  const dayOneDone =
    input.dayOneFirstLessonId != null &&
    (input.completedLessonIds.includes(input.dayOneFirstLessonId) ||
      input.justFinishedLessonId === input.dayOneFirstLessonId);
  if (dayOneDone && !input.preferencesAsked) return 'preferences';
  return 'app';
}

export type GreetingPart = 'morning' | 'afternoon' | 'evening' | 'night';

/** Hour in the device zone. 5–12 morning, 12–18 afternoon, 18–23 evening, else night. */
export function greetingPart(now: string, timeZone: string): GreetingPart {
  const hour = hourInZone(now, timeZone);
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

function hourInZone(now: string, timeZone: string): number {
  const date = new Date(now);
  if (Number.isNaN(date.getTime())) return 12;
  try {
    const value = new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone,
    }).format(date);
    const hour = Number(value);
    return Number.isInteger(hour) ? hour : 12;
  } catch {
    return 12;
  }
}
