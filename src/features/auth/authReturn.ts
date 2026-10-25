import * as Linking from 'expo-linking';
import { AppState } from 'react-native';

import { isProgressSaved } from './account';
import type { AuthGateway, AuthSession } from './types';

const AUTH_PARAM_KEYS = [
  'access_token',
  'refresh_token',
  'type',
  'error',
  'error_code',
  'error_description',
] as const;

/** Tokens and errors from an auth redirect, whether they arrived in the query or the hash. */
export function authCallbackParams(url: string): Record<string, string> | null {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const query =
    queryIndex >= 0
      ? url.slice(queryIndex + 1, hashIndex > queryIndex ? hashIndex : undefined)
      : '';
  const hash = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';
  const params = new URLSearchParams(query);
  for (const [key, value] of new URLSearchParams(hash)) params.set(key, value);
  if (!AUTH_PARAM_KEYS.some((key) => params.has(key))) return null;
  return Object.fromEntries(params);
}

/**
 * A redirect may replace the session only when it is the same user (email link on this device)
 * or an explicit sign-in link (`magiclink` / `signup`) opened on a new device.
 */
export function sessionFromAuthReturn(
  current: AuthSession | null,
  incoming: AuthSession | null,
  type: string | null,
): AuthSession | null {
  if (!incoming) return null;
  if (!current || incoming.user.id === current.user.id) return incoming;
  if (type === 'magiclink' || type === 'signup') return incoming;
  return null;
}

/**
 * Foreground refresh keeps the user id. A stale anonymous payload must not wipe an email
 * that was just confirmed.
 */
export function sessionFromUserReload(
  current: AuthSession | null,
  incoming: AuthSession | null,
): AuthSession | null {
  if (!current || !incoming) return null;
  if (incoming.user.id !== current.user.id) return null;
  if (isProgressSaved(current.user) && !isProgressSaved(incoming.user)) return null;
  if (
    current.user.email === incoming.user.email &&
    current.user.new_email === incoming.user.new_email &&
    current.user.is_anonymous === incoming.user.is_anonymous
  ) {
    return null;
  }
  return incoming;
}

/**
 * Applies the session from an email link. A link without tokens (or with an error in the URL)
 * reloads the same user from the server so a confirmed email still shows as saved.
 */
export async function adoptAuthCallback(
  auth: Pick<AuthGateway, 'completeAuthRedirect' | 'reloadUser'>,
  url: string,
  current: AuthSession | null,
): Promise<AuthSession | null> {
  const params = authCallbackParams(url);
  if (!params) return null;

  const result = await auth.completeAuthRedirect(url);
  const adopted = sessionFromAuthReturn(
    current,
    result.session,
    result.type ?? params.type ?? null,
  );
  if (adopted) return adopted;

  try {
    const reloaded = await auth.reloadUser();
    return sessionFromUserReload(current, reloaded.session);
  } catch {
    return null;
  }
}

export function initialAuthUrl(): Promise<string | null> {
  return Linking.getInitialURL();
}

export function bindAuthReturn(handlers: {
  onUrl: (url: string) => void;
  onForeground: () => void;
}): () => void {
  const link = Linking.addEventListener('url', ({ url }) => {
    handlers.onUrl(url);
  });
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') handlers.onForeground();
  });
  return () => {
    link.remove();
    appState?.remove();
  };
}
