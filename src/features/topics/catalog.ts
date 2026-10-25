import { contentLanguage } from '@/features/content/language';
import {
  CefrLevelSchema,
  TopicCategorySchema,
  type CefrLevel,
  type Lesson,
  type LocalizedText,
  type Scene,
  type Topic,
  type TopicCategory,
} from '@/features/content/schema';
import { CONTENT_LOCALES, textOf, type ContentLocale } from '@/features/content/text';

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
  language: ContentLocale = contentLanguage(),
): TopicSection[] {
  const lessonMap = indexById(lessons);
  const completed = new Set(completedIds);
  const grouped = new Map<TopicCategory, TopicSummary[]>();

  const ranked = topics
    .filter((topic) => topic.level === level && matchesTopic(topic, query))
    .slice()
    .sort(compareTopics);

  for (const topic of ranked) {
    const card = summarize(topic, lessonMap, completed, language);
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
  language: ContentLocale = contentLanguage(),
): TopicDetail | null {
  const topic = topics.find((item) => item.id === topicId);
  if (!topic) return null;

  const lessonMap = indexById(lessons);
  const completed = new Set(completedIds);
  const rows = lessonStates(topic, lessonMap, completed, language);
  const summary = summarize(topic, lessonMap, completed, language);
  const scene = scenes.find((item) => item.id === topic.scene);
  const doneGoals = checkedGoalCount(topic.can_do.length, summary.completedLessons, rows.length);

  return {
    ...summary,
    canDos: topic.can_do.map((text, index) => ({
      text: textOf(text, language),
      done: index < doneGoals,
    })),
    lessons: rows,
    scene: {
      id: topic.scene,
      title: scene ? textOf(scene.title, language) : topic.scene,
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
  language: ContentLocale,
): TopicSummary {
  const rows = lessonStates(topic, lessons, completed, language);
  const lessonCount = rows.length;
  const completedLessons = rows.filter((row) => row.status === 'completed').length;
  return {
    id: topic.id,
    title: textOf(topic.title, language),
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
  language: ContentLocale,
): TopicLessonState[] {
  let opened = false;
  return topic.lessons.map((id) => {
    const lesson = lessons.get(id);
    const title = lesson ? textOf(lesson.title, language) : id;
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
  const needle = query.trim().toLocaleLowerCase();
  if (needle === '') return true;
  const haystack = [everyLocale(topic.title), ...topic.can_do.map(everyLocale)]
    .join('\n')
    .toLocaleLowerCase();
  return haystack.includes(needle);
}

function everyLocale(text: LocalizedText): string {
  return CONTENT_LOCALES.map((locale) => text[locale] ?? '').join('\n');
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
