/** A topic test is passed at this percent of correct tasks, inclusive. */
export const TOPIC_TEST_PASS_PERCENT = 80;

export type TopicTestLessonRef = {
  id: string;
  /** 1-based place in the topic, shown as «Урок 2». */
  number: number;
  itemIds: readonly string[];
};

export type TopicTestAnswer = {
  itemId: string;
  correct: boolean;
};

export type MissedLesson = {
  id: string;
  number: number;
};

export type TopicTestSettlement = {
  passed: boolean;
  /** 0–100, nearest integer. */
  score: number;
  /** Lessons to mark completed. Every lesson of the topic when the test is passed. */
  lessonIds: readonly string[];
  /** Lessons named on the fail screen, in course order. */
  missedLessons: readonly MissedLesson[];
  /**
   * Topic items scheduled as already known (first review: Good).
   * Empty when the test was not passed.
   */
  knownItemIds: readonly string[];
  /**
   * Items with at least one wrong answer.
   * On a pass they are pinned to Складні and scheduled at the nearest review (Again).
   */
  missedItemIds: readonly string[];
};

/**
 * Score a finished topic test.
 * Passing marks every lesson done.
 * Failing marks a lesson done when the test asked at least one of its items and
 * every asked item was right. A lesson with any miss is listed for the learner
 * to take. Items the test never asked do not block that credit and are not listed.
 */
export function settleTopicTest(input: {
  lessons: readonly TopicTestLessonRef[];
  answers: readonly TopicTestAnswer[];
  itemIds: readonly string[];
}): TopicTestSettlement {
  const score = scorePercent(input.answers);
  const passed = input.answers.length > 0 && score >= TOPIC_TEST_PASS_PERCENT;
  const wrong = wrongItems(input.answers);
  const asked = askedItems(input.answers);
  const missedLessons = input.lessons.filter((lesson) =>
    lesson.itemIds.some((itemId) => wrong.has(itemId)),
  );
  const cleanLessons = input.lessons.filter((lesson) => lessonIsClean(lesson, asked, wrong));

  const lessonIds = passed
    ? input.lessons.map((lesson) => lesson.id)
    : cleanLessons.map((lesson) => lesson.id);
  const missedItemIds = [...wrong].sort((left, right) => left.localeCompare(right));
  const knownItemIds = passed ? unique(input.itemIds).filter((itemId) => !wrong.has(itemId)) : [];

  return {
    passed,
    score,
    lessonIds,
    missedLessons: missedLessons.map((lesson) => ({ id: lesson.id, number: lesson.number })),
    knownItemIds,
    missedItemIds,
  };
}

export function scorePercent(answers: readonly TopicTestAnswer[]): number {
  if (answers.length === 0) return 0;
  const correct = answers.filter((answer) => answer.correct).length;
  return Math.round((correct * 100) / answers.length);
}

function lessonIsClean(
  lesson: TopicTestLessonRef,
  asked: ReadonlySet<string>,
  wrong: ReadonlySet<string>,
): boolean {
  const tested = lesson.itemIds.filter((itemId) => asked.has(itemId));
  if (tested.length === 0) return false;
  return tested.every((itemId) => !wrong.has(itemId));
}

function wrongItems(answers: readonly TopicTestAnswer[]): Set<string> {
  const wrong = new Set<string>();
  for (const answer of answers) {
    if (!answer.correct) wrong.add(answer.itemId);
  }
  return wrong;
}

function askedItems(answers: readonly TopicTestAnswer[]): Set<string> {
  return new Set(answers.map((answer) => answer.itemId));
}

function unique(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}
