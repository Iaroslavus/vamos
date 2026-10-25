import type { EnsureResult, LinkConfirmResult, LinkRequestResult } from './account';
import type { AuthErrorCode } from './errors';
import type { AuthSession } from './types';

export type SessionStatus = 'loading' | 'ready' | 'error';

export type SessionContextValue = {
  status: SessionStatus;
  session: AuthSession | null;
  error: AuthErrorCode | null;
  signingOut: boolean;
  retry: () => Promise<void>;
  requestEmailLink: (email: string) => Promise<LinkRequestResult>;
  confirmEmailLink: (email: string, code: string) => Promise<LinkConfirmResult>;
  requestEmailSignIn: (email: string) => Promise<LinkRequestResult>;
  confirmEmailSignIn: (email: string, code: string) => Promise<LinkConfirmResult>;
  signOut: () => Promise<EnsureResult>;
};
