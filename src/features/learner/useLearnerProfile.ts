import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/useSession';
import type { LearnerProfile } from '@/features/learner/profile';

import { useLearnerRepository } from './context';

export function learnerQueryKey(userId: string) {
  return ['learner', userId] as const;
}

export function useLearnerProfile() {
  const repository = useLearnerRepository();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  return useQuery({
    queryKey: userId ? learnerQueryKey(userId) : ['learner', 'signed-out'],
    enabled: userId != null,
    queryFn: () => repository.read(userId as string),
    networkMode: 'offlineFirst',
  });
}

export function useSaveLearner() {
  const repository = useLearnerRepository();
  const queryClient = useQueryClient();
  const { session } = useSession();

  return async (patch: Partial<LearnerProfile>) => {
    const userId = session?.user.id;
    if (!userId) throw new Error('Cannot save a profile without a session');
    const next = await repository.save(userId, patch);
    queryClient.setQueryData(learnerQueryKey(userId), next);
    return next;
  };
}
