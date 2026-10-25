import { useCallback, useEffect, useRef, useState } from 'react';

import i18n from '@/i18n';
import { activeUiLanguage } from '@/i18n/language';

import {
  confirmEmailLink as confirmEmailLinkAccount,
  confirmEmailSignIn as confirmEmailSignInAccount,
  ensureAnonymousSession,
  requestEmailLink as requestEmailLinkAccount,
  requestEmailSignIn as requestEmailSignInAccount,
  signOutAndRestart,
  type EnsureResult,
  type LinkConfirmResult,
  type LinkRequestResult,
} from './account';
import {
  adoptAuthCallback,
  bindAuthReturn,
  initialAuthUrl,
  sessionFromUserReload,
} from './authReturn';
import type { AuthErrorCode } from './errors';
import type { AuthGateway, AuthSession } from './types';
import type { SessionContextValue, SessionStatus } from './sessionTypes';

export function useSessionController(auth: AuthGateway): SessionContextValue {
  const sessionRef = useRef<AuthSession | null>(null);
  const mounted = useRef(true);
  const restarting = useRef(false);
  const adopting = useRef(false);

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
      const result = await requestEmailLinkAccount(auth, email, activeUiLanguage(i18n.language));
      if (!mounted.current || !result.ok) return result;

      const current = sessionRef.current;
      if (current && result.user && result.user.id === current.user.id) {
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

  const requestEmailSignIn = useCallback(
    async (email: string): Promise<LinkRequestResult> => {
      return requestEmailSignInAccount(auth, email, activeUiLanguage(i18n.language));
    },
    [auth],
  );

  const confirmEmailSignIn = useCallback(
    async (email: string, code: string): Promise<LinkConfirmResult> => {
      adopting.current = true;
      try {
        const result = await confirmEmailSignInAccount(auth, email, code);
        if (mounted.current && result.ok) applySession(result.session);
        return result;
      } finally {
        adopting.current = false;
      }
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
    const adoptUrl = async (url: string) => {
      if (restarting.current) return;
      try {
        const next = await adoptAuthCallback(auth, url, sessionRef.current);
        if (mounted.current && next && !restarting.current) applySession(next);
      } catch {
        // A bad redirect must not surface an error over the current session.
      }
    };

    const reloadLinkedAccount = async () => {
      if (restarting.current || adopting.current) return;
      try {
        const result = await auth.reloadUser();
        if (!mounted.current || restarting.current || adopting.current) return;
        const next = sessionFromUserReload(sessionRef.current, result.session);
        if (next) applySession(next);
      } catch {
        // Keep the session already on screen.
      }
    };

    const unsubscribe = auth.onAuthStateChange((next) => {
      if (!mounted.current || !next || restarting.current) return;
      const current = sessionRef.current;
      if (!adopting.current && current && next.user.id !== current.user.id) return;
      applySession(next);
    });
    const stopReturn = bindAuthReturn({
      onUrl: (url) => {
        void adoptUrl(url);
      },
      onForeground: () => {
        void reloadLinkedAccount();
      },
    });
    // Supabase is an external system: restore the session, then pick up an email link.
    void (async () => {
      await retry();
      if (!mounted.current) return;
      const url = await initialAuthUrl();
      if (url) await adoptUrl(url);
      await reloadLinkedAccount();
    })();

    return () => {
      mounted.current = false;
      unsubscribe();
      stopReturn();
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
    requestEmailSignIn,
    confirmEmailSignIn,
    signOut,
  };
}
