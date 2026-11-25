import { getItem, getLesson, getTopic } from '@/features/content/loader';

import { assembleTopicTest, type TopicTestTask } from './assemble';
import type { TopicTestLessonRef } from './settle';

export type LoadedTopicTest = {
  topicId: string;
  tasks: TopicTestTask[];
  lessons: TopicTestLessonRef[];
  itemIds: string[];
};

/** The topic's lessons and a seeded test. Null when the id is not in the course. */
export function loadTopicTest(
  topicId: string,
  seed: string,
  language: string | null,
): LoadedTopicTest | null {
  let topic;
  try {
    topic = getTopic(topicId);
  } catch {
    return null;
  }

  const lessons = topic.lessons.flatMap((lessonId, index) => {
    try {
      const lesson = getLesson(lessonId);
      return [
        {
          id: lesson.id,
          number: index + 1,
          itemIds: lesson.items,
          items: lesson.items.map((itemId) => getItem(itemId)),
        },
      ];
    } catch {
      return [];
    }
  });

  const itemIds = [...new Set(lessons.flatMap((lesson) => lesson.itemIds))];
  return {
    topicId,
    tasks: assembleTopicTest({
      lessons: lessons.map((lesson) => ({ id: lesson.id, items: lesson.items })),
      seed,
      language,
    }),
    lessons: lessons.map(({ id, number, itemIds: ids }) => ({ id, number, itemIds: ids })),
    itemIds,
  };
}
