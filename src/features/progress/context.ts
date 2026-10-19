import { createContext } from 'react';

import type { ProgressRepository } from './types';

export const ProgressRepositoryContext = createContext<ProgressRepository | null>(null);
