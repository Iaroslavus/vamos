import type { ProgressRepository, ProgressSnapshot } from '@/features/progress/types';
import type { ReviewRepository } from '@/features/review/types';
import type { VocabRepository } from '@/features/vocab/types';

import type { TopicTestSettlement } from './settle';

export type TopicTestWriters = {
  progress: Pick<ProgressRepository, 'recordCompletion'>;
  review: Pick<ReviewRepository, 'introduceItems' | 'recordRating'>;
  vocab: Pick<VocabRepository, 'pinDifficult'>;
};

/**
 * Writes the settlement.
 * A pass marks every lesson, rates known items Good, and rates misses Again
 * so the next review is the nearest one. Those misses are pinned to Складні.
 * A fail only marks the lessons that were clean.
 */
export async function applyTopicTest(
  writers: TopicTestWriters,
  userId: string,
  topicId: string,
  settlement: TopicTestSettlement,
  completedAt: string,
): Promise<ProgressSnapshot | null> {
  let snapshot: ProgressSnapshot | null = null;
  for (const lessonId of settlement.lessonIds) {
    snapshot = await writers.progress.recordCompletion(userId, {
      lessonId,
      accuracy: settlement.passed ? settlement.score : 100,
      xp: 0,
      completedAt,
      xpClientId: `topic-test:${topicId}:${lessonId}`,
    });
  }

  if (!settlement.passed) return snapshot;

  const itemIds = [...settlement.knownItemIds, ...settlement.missedItemIds];
  if (itemIds.length > 0) {
    await writers.review.introduceItems(
      userId,
      itemIds.map((id) => ({ id })),
    );
  }

  for (const itemId of settlement.knownItemIds) {
    await writers.review.recordRating(userId, {
      itemId,
      rating: 'good',
      reviewedAt: completedAt,
      clientId: `topic-test:${topicId}:good:${itemId}`,
    });
  }

  for (const itemId of settlement.missedItemIds) {
    await writers.review.recordRating(userId, {
      itemId,
      rating: 'again',
      reviewedAt: completedAt,
      clientId: `topic-test:${topicId}:again:${itemId}`,
    });
  }

  if (settlement.missedItemIds.length > 0) {
    await writers.vocab.pinDifficult(userId, settlement.missedItemIds);
  }

  return snapshot;
}
