import { isValidEmail, isValidOtp, normalizeEmail, normalizeOtp } from './email';
import { mapAuthError, type AuthErrorCode } from './errors';
import type { AuthGateway, AuthSession, AuthUser } from './types';

export type AuthFailure = { ok: false; error: AuthErrorCode };

export type EnsureResult = { ok: true; session: AuthSession; created: boolean } | AuthFailure;

export type LinkRequestResult =
  | { ok: true; step: 'code_sent'; email: string; user: AuthUser }
  | { ok: true; step: 'saved'; user: AuthUser }
  | AuthFailure;

export type LinkConfirmResult = { ok: true; session: AuthSession } | AuthFailure;

const ensureLocks = new WeakMap<AuthGateway, Promise<EnsureResult>>();

/**
 * A linked account has a real email. Anonymous sessions keep the same user id;
 * `is_anonymous` flips off only after the email OTP is confirmed.
 */
export function isProgressSaved(user: AuthUser | null | undefined): boolean {
  if (!user?.email?.trim()) return false;
  return user.is_anonymous !== true;
}

export function signOutWarningKind(user: AuthUser | null | undefined): 'saved' | 'unsaved' {
  return isProgressSaved(user) ? 'saved' : 'unsaved';
}

async function runEnsure(auth: AuthGateway): Promise<EnsureResult> {
  try {
    const current = await auth.getSession();
    if (current.error) return { ok: false, error: mapAuthError(current.error) };
    if (current.session) return { ok: true, session: current.session, created: false };

    const signed = await auth.signInAnonymously();
    if (signed.error || !signed.session) {
      return { ok: false, error: signed.error ? mapAuthError(signed.error) : 'unknown' };
    }
    return { ok: true, session: signed.session, created: true };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/** Restores a persisted session or creates an anonymous one. Overlapping calls share one request. */
export function ensureAnonymousSession(auth: AuthGateway): Promise<EnsureResult> {
  const existing = ensureLocks.get(auth);
  if (existing) return existing;

  const run = runEnsure(auth).finally(() => {
    if (ensureLocks.get(auth) === run) ensureLocks.delete(auth);
  });
  ensureLocks.set(auth, run);
  return run;
}

/**
 * Asks Supabase to attach `email` to the current user (`updateUser`).
 * With confirmations enabled this sends an OTP and does not create a second account.
 */
export async function requestEmailLink(
  auth: AuthGateway,
  email: string,
): Promise<LinkRequestResult> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) return { ok: false, error: 'invalid_email' };

  try {
    const result = await auth.updateUserEmail(normalized);
    if (result.error || !result.user) {
      return { ok: false, error: result.error ? mapAuthError(result.error) : 'unknown' };
    }
    if (isProgressSaved(result.user)) {
      return { ok: true, step: 'saved', user: result.user };
    }
    return { ok: true, step: 'code_sent', email: normalized, user: result.user };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/**
 * Confirms the email-change OTP. The returned session must be the same user:
 * linking keeps lesson progress on the anonymous account instead of signing into a new one.
 */
export async function confirmEmailLink(
  auth: AuthGateway,
  email: string,
  code: string,
  expectedUserId: string,
): Promise<LinkConfirmResult> {
  const normalizedEmail = normalizeEmail(email);
  const token = normalizeOtp(code);
  if (!isValidEmail(normalizedEmail)) return { ok: false, error: 'invalid_email' };
  if (!isValidOtp(token)) return { ok: false, error: 'invalid_code' };

  try {
    const result = await auth.verifyEmailChange(normalizedEmail, token);
    if (result.error || !result.session) {
      return { ok: false, error: result.error ? mapAuthError(result.error) : 'unknown' };
    }
    if (result.session.user.id !== expectedUserId || !isProgressSaved(result.session.user)) {
      return { ok: false, error: 'unknown' };
    }
    return { ok: true, session: result.session };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/** Ends the current session and starts a fresh anonymous one so the app never shows a sign-up screen. */
export async function signOutAndRestart(auth: AuthGateway): Promise<EnsureResult> {
  try {
    const signedOut = await auth.signOut();
    if (signedOut.error) return { ok: false, error: mapAuthError(signedOut.error) };

    const signed = await auth.signInAnonymously();
    if (signed.error || !signed.session) {
      return { ok: false, error: signed.error ? mapAuthError(signed.error) : 'unknown' };
    }
    return { ok: true, session: signed.session, created: true };
  } catch {
    return { ok: false, error: 'network' };
  }
}
