import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useSession } from '@/features/auth/useSession';
import { deviceTimeZone } from '@/features/progress/study';

import { reviewRepository } from '../defaultRepository';
import { reviewAgenda, type ReviewAgenda } from '../forecast';

export function reviewDueQueryKey(userId: string) {
  return ['review-due', userId] as const;
}

/** Due queue and the seven-day schedule. Both refresh from the same read. */
export function useReviewAgenda(): ReviewAgenda {
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  const empty = useMemo(
    () =>
      reviewAgenda({
        cards: [],
        logs: [],
        now: new Date(),
        timeZone: deviceTimeZone(),
      }),
    [],
  );

  const query = useQuery({
    queryKey: userId ? reviewDueQueryKey(userId) : ['review-due', 'signed-out'],
    enabled: userId != null,
    queryFn: async () => {
      const snapshot = await reviewRepository.read(userId as string);
      return reviewAgenda({
        cards: snapshot.cards,
        logs: snapshot.logs,
        now: new Date(),
        timeZone: deviceTimeZone(),
      });
    },
    networkMode: 'offlineFirst',
  });

  return query.data ?? empty;
}

/** How many cards the learner can study right now, after the daily caps. */
export function useReviewDueCount(): number {
  return useReviewAgenda().dueCount;
}
