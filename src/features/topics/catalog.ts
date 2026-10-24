import {
  CefrLevelSchema,
  TopicCategorySchema,
  type CefrLevel,
  type Lesson,
  type Scene,
  type Topic,
  type TopicCategory,
} from '@/features/content/schema';

export const CEFR_LEVELS: readonly CefrLevel[] = CefrLevelSchema.options;
export const TOPIC_CATEGORIES: readonly TopicCategory[] = TopicCategorySchema.options;

export type StepStatus = 'completed' | 'current' | 'locked';

/** The scene is not a lesson, so the repository never marks it completed. */
export type SceneStatus = 'locked' | 'ready';

export type TopicSummary = {
  id: string;
  title: string;
  icon: string;
  category: TopicCategory;
  lessonCount: number;
  phraseCount: number;
  completedLessons: number;
  progress: number;
};

export type CanDoState = {
  text: string;
  done: boolean;
};

export type TopicLessonState = {
  id: string;
  title: string;
  status: StepStatus;
};

export type TopicSceneState = {
  id: string;
  title: string;
  status: SceneStatus;
};

export type TopicSection = {
  category: TopicCategory;
  topics: TopicSummary[];
};

export type TopicDetail = TopicSummary & {
  canDos: CanDoState[];
  lessons: TopicLessonState[];
  scene: TopicSceneState;
};

export function levelHasContent(topics: readonly Topic[], level: CefrLevel): boolean {
  return topics.some((topic) => topic.level === level);
}

/** First CEFR level that has a topic, otherwise A1. */
export function initialLevel(topics: readonly Topic[]): CefrLevel {
  return CEFR_LEVELS.find((level) => levelHasContent(topics, level)) ?? 'A1';
}

export function topicSections(
  topics: readonly Topic[],
  lessons: readonly Lesson[],
  completedIds: readonly string[],
  level: CefrLevel,
  query: string,
): TopicSection[] {
  const lessonMap = indexById(lessons);
  const completed = new Set(completedIds);
  const grouped = new Map<TopicCategory, TopicSummary[]>();

  const ranked = topics
    .filter((topic) => topic.level === level && matchesTopic(topic, query))
    .slice()
    .sort(compareTopics);

  for (const topic of ranked) {
    const card = summarize(topic, lessonMap, completed);
    const bucket = grouped.get(topic.category);
    if (bucket) bucket.push(card);
    else grouped.set(topic.category, [card]);
  }

  return TOPIC_CATEGORIES.flatMap((category) => {
    const rows = grouped.get(category);
    if (!rows || rows.length === 0) return [];
    return [{ category, topics: rows }];
  });
}

export function buildTopicDetail(
  topicId: string,
  topics: readonly Topic[],
  lessons: readonly Lesson[],
  scenes: readonly Scene[],
  completedIds: readonly string[],
): TopicDetail | null {
  const topic = topics.find((item) => item.id === topicId);
  if (!topic) return null;

  const lessonMap = indexById(lessons);
  const completed = new Set(completedIds);
  const rows = lessonStates(topic, lessonMap, completed);
  const summary = summarize(topic, lessonMap, completed);
  const scene = scenes.find((item) => item.id === topic.scene);
  const doneGoals = checkedGoalCount(topic.can_do_ru.length, summary.completedLessons, rows.length);

  return {
    ...summary,
    canDos: topic.can_do_ru.map((text, index) => ({ text, done: index < doneGoals })),
    lessons: rows,
    scene: {
      id: topic.scene,
      title: scene?.title_ru ?? topic.scene,
      status: sceneStatus(rows),
    },
  };
}

/**
 * Goals check off from the top as lessons are finished.
 * The last lesson checks every goal that is still open.
 */
function checkedGoalCount(
  goalCount: number,
  completedLessons: number,
  lessonCount: number,
): number {
  if (goalCount <= 0 || lessonCount <= 0 || completedLessons <= 0) return 0;
  const done = Math.min(completedLessons, lessonCount);
  if (done >= lessonCount) return goalCount;
  return Math.floor((done / lessonCount) * goalCount);
}

function sceneStatus(lessons: readonly TopicLessonState[]): SceneStatus {
  if (lessons.length === 0) return 'ready';
  return lessons.every((lesson) => lesson.status === 'completed') ? 'ready' : 'locked';
}

function summarize(
  topic: Topic,
  lessons: ReadonlyMap<string, Lesson>,
  completed: ReadonlySet<string>,
): TopicSummary {
  const rows = lessonStates(topic, lessons, completed);
  const lessonCount = rows.length;
  const completedLessons = rows.filter((row) => row.status === 'completed').length;
  return {
    id: topic.id,
    title: topic.title_ru,
    icon: topic.icon,
    category: topic.category,
    lessonCount,
    phraseCount: countPhrases(topic, lessons),
    completedLessons,
    progress: lessonCount === 0 ? 0 : completedLessons / lessonCount,
  };
}

function lessonStates(
  topic: Topic,
  lessons: ReadonlyMap<string, Lesson>,
  completed: ReadonlySet<string>,
): TopicLessonState[] {
  let opened = false;
  return topic.lessons.map((id) => {
    const title = lessons.get(id)?.title_ru ?? id;
    if (completed.has(id)) return { id, title, status: 'completed' };
    if (!opened) {
      opened = true;
      return { id, title, status: 'current' };
    }
    return { id, title, status: 'locked' };
  });
}

function countPhrases(topic: Topic, lessons: ReadonlyMap<string, Lesson>): number {
  const ids = new Set<string>();
  for (const lessonId of topic.lessons) {
    const lesson = lessons.get(lessonId);
    if (!lesson) continue;
    for (const itemId of lesson.items) ids.add(itemId);
  }
  return ids.size;
}

function matchesTopic(topic: Topic, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase('ru');
  if (needle === '') return true;
  return [topic.title_ru, ...topic.can_do_ru].join('\n').toLocaleLowerCase('ru').includes(needle);
}

function compareTopics(left: Topic, right: Topic): number {
  const dayA = left.starter_day ?? Number.POSITIVE_INFINITY;
  const dayB = right.starter_day ?? Number.POSITIVE_INFINITY;
  if (dayA !== dayB) return dayA - dayB;
  return left.id.localeCompare(right.id);
}

function indexById(lessons: readonly Lesson[]): Map<string, Lesson> {
  return new Map(lessons.map((lesson) => [lesson.id, lesson]));
}
