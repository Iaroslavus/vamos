import { createContext, useContext, type ReactNode } from 'react';

import { learnerRepository } from '@/features/learner/defaultRepository';
import type { LearnerRepository } from '@/features/learner/repository';

const LearnerRepositoryContext = createContext<LearnerRepository | null>(null);

type LearnerProviderProps = {
  children: ReactNode;
  repository?: LearnerRepository;
};

export function LearnerProvider({
  children,
  repository = learnerRepository,
}: LearnerProviderProps) {
  return (
    <LearnerRepositoryContext.Provider value={repository}>
      {children}
    </LearnerRepositoryContext.Provider>
  );
}

export function useLearnerRepository(): LearnerRepository {
  const repository = useContext(LearnerRepositoryContext);
  if (!repository) {
    throw new Error('useLearnerRepository must be used within LearnerProvider');
  }
  return repository;
}
