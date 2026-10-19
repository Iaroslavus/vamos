import type { AuthError, Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

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

export const supabaseAuth: AuthGateway = {
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { session: toSession(data.session), error: toError(error) };
  },

  async signInAnonymously() {
    const { data, error } = await supabase.auth.signInAnonymously();
    return { session: toSession(data.session), error: toError(error) };
  },

  async updateUserEmail(email) {
    const { data, error } = await supabase.auth.updateUser({ email });
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
