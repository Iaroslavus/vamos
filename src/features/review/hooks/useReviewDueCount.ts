import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/useSession';
import { deviceTimeZone } from '@/features/progress/study';

import { reviewRepository } from '../defaultRepository';
import { buildReviewQueue } from '../session';

export function reviewDueQueryKey(userId: string) {
  return ['review-due', userId] as const;
}

/** How many cards the learner can study right now, after the daily caps. */
export function useReviewDueCount(): number {
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  const query = useQuery({
    queryKey: userId ? reviewDueQueryKey(userId) : ['review-due', 'signed-out'],
    enabled: userId != null,
    queryFn: async () => {
      const snapshot = await reviewRepository.read(userId as string);
      return buildReviewQueue({
        cards: snapshot.cards,
        logs: snapshot.logs,
        now: new Date(),
        timeZone: deviceTimeZone(),
      }).cards.length;
    },
    networkMode: 'offlineFirst',
  });

  return query.data ?? 0;
}
