import { useQuery } from '@tanstack/react-query';

import { reviewRepository } from '@/features/review/defaultRepository';

export function reviewSnapshotKey(userId: string) {
  return ['study-cards', userId] as const;
}

export function useReviewSnapshot(userId: string | null) {
  return useQuery({
    queryKey: userId ? reviewSnapshotKey(userId) : ['study-cards', 'signed-out'],
    enabled: userId != null,
    networkMode: 'offlineFirst',
    queryFn: () => reviewRepository.read(userId as string),
  });
}
