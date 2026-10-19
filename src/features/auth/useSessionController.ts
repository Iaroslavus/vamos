import { useCallback, useEffect, useRef, useState } from 'react';

import {
  confirmEmailLink as confirmEmailLinkAccount,
  ensureAnonymousSession,
  requestEmailLink as requestEmailLinkAccount,
  signOutAndRestart,
  type EnsureResult,
  type LinkConfirmResult,
  type LinkRequestResult,
} from './account';
import type { AuthErrorCode } from './errors';
import type { AuthGateway, AuthSession } from './types';
import type { SessionContextValue, SessionStatus } from './sessionTypes';

export function useSessionController(auth: AuthGateway): SessionContextValue {
  const sessionRef = useRef<AuthSession | null>(null);
  const mounted = useRef(true);
  const restarting = useRef(false);

  const [status, setStatus] = useState<SessionStatus>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const applySession = useCallback((next: AuthSession) => {
    sessionRef.current = next;
    setSession(next);
    setStatus('ready');
    setError(null);
  }, []);

  const retry = useCallback(async () => {
    setStatus('loading');
    setError(null);
    const result = await ensureAnonymousSession(auth);
    if (!mounted.current) return;
    if (!result.ok) {
      setStatus('error');
      setError(result.error);
      setSession(null);
      sessionRef.current = null;
      return;
    }
    applySession(result.session);
  }, [applySession, auth]);

  const requestEmailLink = useCallback(
    async (email: string): Promise<LinkRequestResult> => {
      const result = await requestEmailLinkAccount(auth, email);
      if (!mounted.current || !result.ok) return result;

      const current = sessionRef.current;
      if (current && result.user.id === current.user.id) {
        applySession({ user: { ...current.user, ...result.user } });
      }
      return result;
    },
    [applySession, auth],
  );

  const confirmEmailLink = useCallback(
    async (email: string, code: string): Promise<LinkConfirmResult> => {
      const userId = sessionRef.current?.user.id;
      if (!userId) return { ok: false, error: 'unknown' };

      const result = await confirmEmailLinkAccount(auth, email, code, userId);
      if (mounted.current && result.ok) applySession(result.session);
      return result;
    },
    [applySession, auth],
  );

  const signOut = useCallback(async (): Promise<EnsureResult> => {
    restarting.current = true;
    setSigningOut(true);
    const result = await signOutAndRestart(auth);
    if (!mounted.current) return result;

    setSigningOut(false);
    restarting.current = false;

    if (!result.ok) {
      const still = await auth.getSession();
      if (!mounted.current) return result;
      if (still.session) {
        applySession(still.session);
        return result;
      }
      setSession(null);
      sessionRef.current = null;
      setStatus('error');
      setError(result.error);
      return result;
    }

    applySession(result.session);
    return result;
  }, [applySession, auth]);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = auth.onAuthStateChange((next) => {
      if (!mounted.current || !next || restarting.current) return;
      const current = sessionRef.current;
      if (current && next.user.id !== current.user.id) return;
      applySession(next);
    });
    // Supabase is an external system: read or create the anonymous session, then store it.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- auth bootstrap
    void retry();

    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, [auth, applySession, retry]);

  return {
    status,
    session,
    error,
    signingOut,
    retry,
    requestEmailLink,
    confirmEmailLink,
    signOut,
  };
}
