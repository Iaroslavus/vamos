import { createContext, useContext, type ReactNode } from 'react';

import { supabaseAuth } from './supabaseAuth';
import type { AuthGateway } from './types';
import type { SessionContextValue } from './sessionTypes';
import { useSessionController } from './useSessionController';

const SessionContext = createContext<SessionContextValue | null>(null);

type SessionProviderProps = {
  children: ReactNode;
  auth?: AuthGateway;
};

export function SessionProvider({ children, auth = supabaseAuth }: SessionProviderProps) {
  const value = useSessionController(auth);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return value;
}

export type { SessionContextValue, SessionStatus } from './sessionTypes';
