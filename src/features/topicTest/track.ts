import { track } from '@/lib/analytics';

export function trackTopicTestStart(topicId: string): void {
  track('topic_test_start', { topicId });
}

export function trackTopicTestFinish(input: {
  topicId: string;
  score: number;
  passed: boolean;
}): void {
  track('topic_test_finish', {
    topicId: input.topicId,
    score: input.score,
    passed: input.passed,
  });
}
