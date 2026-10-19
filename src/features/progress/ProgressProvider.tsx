import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { useSession } from '@/features/auth/useSession';

import { ProgressRepositoryContext } from './context';
import { progressRepository } from './defaultRepository';
import type { ProgressRepository } from './types';
import { progressQueryKey } from './useProgress';

type ProgressProviderProps = {
  children: ReactNode;
  repository?: ProgressRepository;
};

export function ProgressProvider({
  children,
  repository = progressRepository,
}: ProgressProviderProps) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) return;
    return repository.start(userId, () => {
      void queryClient.invalidateQueries({ queryKey: progressQueryKey(userId) });
    });
  }, [queryClient, repository, userId]);

  return (
    <ProgressRepositoryContext.Provider value={repository}>
      {children}
    </ProgressRepositoryContext.Provider>
  );
}
