import type { UiLanguage } from '@/i18n/language';

export type AuthUser = {
  id: string;
  email?: string | null;
  new_email?: string | null;
  is_anonymous?: boolean;
};

export type AuthSession = {
  user: AuthUser;
};

export type GatewayError = {
  message: string;
  code?: string;
  status?: number;
};

export type AuthGateway = {
  getSession: () => Promise<{ session: AuthSession | null; error: GatewayError | null }>;
  signInAnonymously: () => Promise<{ session: AuthSession | null; error: GatewayError | null }>;
  updateUserEmail: (
    email: string,
    uiLanguage: UiLanguage,
  ) => Promise<{ user: AuthUser | null; error: GatewayError | null }>;
  verifyEmailChange: (
    email: string,
    token: string,
  ) => Promise<{ session: AuthSession | null; error: GatewayError | null }>;
  /** Passwordless sign-in for an email that already belongs to a saved account. */
  requestEmailSignIn: (
    email: string,
    uiLanguage: UiLanguage,
  ) => Promise<{ error: GatewayError | null }>;
  verifyEmailSignIn: (
    email: string,
    token: string,
  ) => Promise<{ session: AuthSession | null; error: GatewayError | null }>;
  /** Reads the user from the server so a link opened in the browser is visible after return. */
  reloadUser: () => Promise<{ session: AuthSession | null; error: GatewayError | null }>;
  /** Turns an auth redirect (`access_token` / `refresh_token`) into a session. Never raises. */
  completeAuthRedirect: (url: string) => Promise<{
    session: AuthSession | null;
    type: string | null;
    error: GatewayError | null;
  }>;
  signOut: () => Promise<{ error: GatewayError | null }>;
  onAuthStateChange: (listener: (session: AuthSession | null) => void) => () => void;
};
