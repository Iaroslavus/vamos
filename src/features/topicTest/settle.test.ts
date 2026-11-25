import { listLessons, listTopics } from '@/features/content/loader';
import { appPathPlan } from '@/features/path/coursePlan';
import { buildPath } from '@/features/path/map';

import {
  settleTopicTest,
  TOPIC_TEST_PASS_PERCENT,
  type TopicTestAnswer,
  type TopicTestLessonRef,
} from './settle';

const lessons: TopicTestLessonRef[] = [
  { id: 'l1', number: 1, itemIds: ['a', 'b'] },
  { id: 'l2', number: 2, itemIds: ['c', 'd'] },
  { id: 'l3', number: 3, itemIds: ['e'] },
  { id: 'l4', number: 4, itemIds: ['f'] },
];

function row(itemId: string, correct: boolean): TopicTestAnswer {
  return { itemId, correct };
}

describe('settleTopicTest', () => {
  it('passes at 80 percent and fails just under it', () => {
    const passed = settleTopicTest({
      lessons,
      answers: [
        ...Array.from({ length: 8 }, () => row('a', true)),
        row('c', false),
        row('c', false),
      ],
      itemIds: ['a', 'b', 'c', 'd', 'e', 'f'],
    });
    const failed = settleTopicTest({
      lessons,
      answers: [
        ...Array.from({ length: 7 }, () => row('a', true)),
        row('c', false),
        row('e', false),
        row('e', false),
      ],
      itemIds: ['a', 'b', 'c', 'd', 'e', 'f'],
    });

    expect(TOPIC_TEST_PASS_PERCENT).toBe(80);
    expect(passed.score).toBe(80);
    expect(passed.passed).toBe(true);
    expect(failed.score).toBe(70);
    expect(failed.passed).toBe(false);
  });

  it('marks every lesson and splits known items from misses when the test is passed', () => {
    const settlement = settleTopicTest({
      lessons,
      answers: [
        ...Array.from({ length: 8 }, () => row('a', true)),
        row('c', false),
        row('e', false),
      ],
      itemIds: ['a', 'b', 'c', 'd', 'e', 'f'],
    });

    expect(settlement.passed).toBe(true);
    expect(settlement.lessonIds).toEqual(['l1', 'l2', 'l3', 'l4']);
    expect(settlement.knownItemIds).toEqual(['a', 'b', 'd', 'f']);
    expect(settlement.missedItemIds).toEqual(['c', 'e']);
    expect(settlement.missedLessons).toEqual([
      { id: 'l2', number: 2 },
      { id: 'l3', number: 3 },
    ]);
  });

  it('credits only the lessons whose asked items were all correct', () => {
    const settlement = settleTopicTest({
      lessons,
      answers: [row('a', true), row('b', true), row('c', false), row('e', false)],
      itemIds: ['a', 'b', 'c', 'd', 'e', 'f'],
    });

    expect(settlement.passed).toBe(false);
    expect(settlement.score).toBe(50);
    expect(settlement.lessonIds).toEqual(['l1']);
    expect(settlement.missedLessons).toEqual([
      { id: 'l2', number: 2 },
      { id: 'l3', number: 3 },
    ]);
    expect(settlement.knownItemIds).toEqual([]);
    expect(settlement.missedItemIds).toEqual(['c', 'e']);
  });

  it('leaves a lesson open when one of its items was missed on a later task', () => {
    const settlement = settleTopicTest({
      lessons: [{ id: 'l1', number: 1, itemIds: ['a'] }],
      answers: [row('a', true), row('a', false), row('a', true), row('a', true)],
      itemIds: ['a'],
    });

    expect(settlement.passed).toBe(false);
    expect(settlement.lessonIds).toEqual([]);
    expect(settlement.missedLessons).toEqual([{ id: 'l1', number: 1 }]);
  });

  it('buildPath treats the topic as done after a passed test', () => {
    const topic = listTopics().find((entry) => entry.id === 'a1.hola');
    const topicLessons = listLessons().filter((lesson) => lesson.topic === 'a1.hola');
    expect(topic).toBeDefined();
    const settlement = settleTopicTest({
      lessons: topicLessons.map((lesson, index) => ({
        id: lesson.id,
        number: index + 1,
        itemIds: lesson.items,
      })),
      answers: topicLessons.flatMap((lesson) =>
        lesson.items.map((itemId) => ({ itemId, correct: true })),
      ),
      itemIds: topicLessons.flatMap((lesson) => lesson.items),
    });

    expect(settlement.passed).toBe(true);
    expect(settlement.lessonIds).toEqual(topic?.lessons);
    const nodes = buildPath(appPathPlan(), { completedLessonIds: settlement.lessonIds });
    expect(nodes.find((node) => node.topicId === 'a1.hola')?.status).toBe('done');
    expect(nodes.find((node) => node.status === 'current')?.topicId).not.toBe('a1.hola');
  });
});
