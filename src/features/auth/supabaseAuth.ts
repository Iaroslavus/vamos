import type { AuthError, Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import type { UiLanguage } from '@/i18n/language';
import { supabase } from '@/lib/supabase';

import { authCallbackParams } from './authReturn';
import type { AuthGateway, AuthSession, AuthUser, GatewayError } from './types';

function toError(error: AuthError | null): GatewayError | null {
  if (!error) return null;
  return {
    message: error.message,
    code: error.code,
    status: error.status,
  };
}

function toUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    new_email: user.new_email,
    is_anonymous: user.is_anonymous,
  };
}

function toSession(session: Session | null): AuthSession | null {
  if (!session?.user) return null;
  return { user: toUser(session.user) };
}

/** Profile screen. The allow-list in `supabase/config.toml` includes this path. */
function authRedirectUrl(): string {
  return Linking.createURL('profile');
}

export const supabaseAuth: AuthGateway = {
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { session: toSession(data.session), error: toError(error) };
  },

  async signInAnonymously() {
    const { data, error } = await supabase.auth.signInAnonymously();
    return { session: toSession(data.session), error: toError(error) };
  },

  async updateUserEmail(email, uiLanguage) {
    const { data, error } = await supabase.auth.updateUser(
      { email, data: { ui_language: uiLanguage } },
      { emailRedirectTo: authRedirectUrl() },
    );
    return { user: data.user ? toUser(data.user) : null, error: toError(error) };
  },

  /**
   * `updateUser({ email })` sends the email-change OTP. `email` (sign-in) would create
   * or switch accounts; `email_change` keeps the anonymous user id and its progress.
   */
  async verifyEmailChange(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email_change',
    });
    return { session: toSession(data.session), error: toError(error) };
  },

  async requestEmailSignIn(email, uiLanguage) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: authRedirectUrl(),
        data: { ui_language: uiLanguage },
      },
    });
    return { error: toError(error) };
  },

  /**
   * Sign-in OTP from `signInWithOtp`. `magiclink` is the deprecated alias; `email` is the
   * type that accepts the 6-digit code and opens the account that already owns the address.
   */
  async verifyEmailSignIn(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    return { session: toSession(data.session), error: toError(error) };
  },

  async reloadUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return { session: null, error: toError(error) };

      const stored = await supabase.auth.getSession();
      const session = stored.data.session;
      if (!session) return { session: null, error: toError(stored.error) };

      const fresh = { ...session, user: data.user };
      const unchanged =
        session.user.email === data.user.email &&
        session.user.new_email === data.user.new_email &&
        session.user.is_anonymous === data.user.is_anonymous;
      if (unchanged) return { session: toSession(fresh), error: null };

      const refreshed = await supabase.auth.refreshSession();
      if (refreshed.data.session) {
        return { session: toSession(refreshed.data.session), error: null };
      }
      return { session: toSession(fresh), error: null };
    } catch {
      return { session: null, error: { message: 'Network request failed' } };
    }
  },

  async completeAuthRedirect(url) {
    const params = authCallbackParams(url);
    const type = params?.type ?? null;
    if (!params?.access_token || !params.refresh_token) {
      return { session: null, type, error: null };
    }
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (error || !data.session) return { session: null, type, error: null };
      return { session: toSession(data.session), type, error: null };
    } catch {
      return { session: null, type, error: null };
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error: toError(error) };
  },

  onAuthStateChange(listener) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      listener(toSession(session));
    });
    return () => {
      data.subscription.unsubscribe();
    };
  },
};

/** Stores the interface language where the email template can read it (`user_metadata`). */
export async function syncUiLanguage(
  uiLanguage: UiLanguage,
): Promise<{ error: GatewayError | null }> {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return { error: null };
    const { error } = await supabase.auth.updateUser({ data: { ui_language: uiLanguage } });
    return { error: toError(error) };
  } catch {
    return { error: { message: 'Network request failed' } };
  }
}
