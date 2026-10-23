import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';

import { useSession } from '@/features/auth/useSession';

import { ProgressRepositoryContext } from './context';
import type { ProgressRepository } from './types';

export function progressQueryKey(userId: string) {
  return ['progress', userId] as const;
}

export function useProgressRepository(): ProgressRepository {
  const repository = useContext(ProgressRepositoryContext);
  if (!repository) {
    throw new Error('useProgressRepository must be used within ProgressProvider');
  }
  return repository;
}

export function useProgress() {
  const repository = useProgressRepository();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  return useQuery({
    queryKey: userId ? progressQueryKey(userId) : ['progress', 'signed-out'],
    enabled: userId != null,
    queryFn: () => repository.readProgress(userId as string),
    networkMode: 'offlineFirst',
  });
}
