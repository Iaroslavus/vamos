import {
  confirmEmailLink,
  ensureAnonymousSession,
  isProgressSaved,
  requestEmailLink,
  signOutAndRestart,
  signOutWarningKind,
} from './account';
import type { AuthGateway, AuthSession } from './types';

function session(id: string, extra: Partial<AuthSession['user']> = {}): AuthSession {
  return { user: { id, email: '', is_anonymous: true, ...extra } };
}

function gateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    getSession: jest.fn(async () => ({ session: null, error: null })),
    signInAnonymously: jest.fn(async () => ({ session: session('anon'), error: null })),
    updateUserEmail: jest.fn(async () => ({ user: null, error: null })),
    verifyEmailChange: jest.fn(async () => ({ session: null, error: null })),
    signOut: jest.fn(async () => ({ error: null })),
    onAuthStateChange: jest.fn(() => () => undefined),
    ...overrides,
  };
}

describe('isProgressSaved', () => {
  it('is false for anonymous users and true once an email is confirmed', () => {
    expect(isProgressSaved(null)).toBe(false);
    expect(isProgressSaved({ id: 'u', email: '', is_anonymous: true })).toBe(false);
    expect(isProgressSaved({ id: 'u', email: '', new_email: 'a@b.co', is_anonymous: true })).toBe(
      false,
    );
    expect(isProgressSaved({ id: 'u', email: 'a@b.co', is_anonymous: false })).toBe(true);
    expect(signOutWarningKind({ id: 'u', email: '', is_anonymous: true })).toBe('unsaved');
    expect(signOutWarningKind({ id: 'u', email: 'a@b.co', is_anonymous: false })).toBe('saved');
  });
});

describe('ensureAnonymousSession', () => {
  it('keeps an existing session and does not create another user', async () => {
    const auth = gateway({
      getSession: jest.fn(async () => ({ session: session('user-1'), error: null })),
    });

    const result = await ensureAnonymousSession(auth);

    expect(result).toEqual({ ok: true, session: session('user-1'), created: false });
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('signs in anonymously when there is no session', async () => {
    const auth = gateway();

    const result = await ensureAnonymousSession(auth);

    expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true, session: session('anon'), created: true });
  });

  it('shares one in-flight request', async () => {
    let resolveSession: (value: { session: null; error: null }) => void = () => undefined;
    const auth = gateway({
      getSession: jest.fn(
        () =>
          new Promise((resolve) => {
            resolveSession = resolve;
          }),
      ),
    });

    const first = ensureAnonymousSession(auth);
    const second = ensureAnonymousSession(auth);
    expect(first).toBe(second);

    resolveSession({ session: null, error: null });
    await first;

    expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('does not sign in when reading the session fails', async () => {
    const auth = gateway({
      getSession: jest.fn(async () => ({
        session: null,
        error: { message: 'Network request failed' },
      })),
    });

    await expect(ensureAnonymousSession(auth)).resolves.toEqual({ ok: false, error: 'network' });
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('maps a thrown client error to network', async () => {
    const auth = gateway({
      getSession: jest.fn(async () => {
        throw new Error('offline');
      }),
    });

    await expect(ensureAnonymousSession(auth)).resolves.toEqual({ ok: false, error: 'network' });
  });
});

describe('requestEmailLink', () => {
  it('rejects an invalid email before calling updateUser', async () => {
    const auth = gateway();

    await expect(requestEmailLink(auth, 'not-an-email')).resolves.toEqual({
      ok: false,
      error: 'invalid_email',
    });
    expect(auth.updateUserEmail).not.toHaveBeenCalled();
  });

  it('sends a normalized email and waits for the OTP when the user is still anonymous', async () => {
    const user = { id: 'user-1', email: '', new_email: 'ada@example.com', is_anonymous: true };
    const auth = gateway({
      updateUserEmail: jest.fn(async () => ({ user, error: null })),
    });

    const result = await requestEmailLink(auth, '  Ada@Example.com ');

    expect(auth.updateUserEmail).toHaveBeenCalledWith('ada@example.com');
    expect(result).toEqual({ ok: true, step: 'code_sent', email: 'ada@example.com', user });
  });

  it('reports the account as saved when updateUser confirms immediately', async () => {
    const user = { id: 'user-1', email: 'ada@example.com', is_anonymous: false };
    const auth = gateway({
      updateUserEmail: jest.fn(async () => ({ user, error: null })),
    });

    await expect(requestEmailLink(auth, 'ada@example.com')).resolves.toEqual({
      ok: true,
      step: 'saved',
      user,
    });
  });

  it('maps an email that is already taken', async () => {
    const auth = gateway({
      updateUserEmail: jest.fn(async () => ({
        user: null,
        error: { message: 'taken', code: 'email_exists' },
      })),
    });

    await expect(requestEmailLink(auth, 'ada@example.com')).resolves.toEqual({
      ok: false,
      error: 'email_taken',
    });
  });
});

describe('confirmEmailLink', () => {
  it('rejects a short code before verify', async () => {
    const auth = gateway();

    await expect(confirmEmailLink(auth, 'ada@example.com', '123', 'user-1')).resolves.toEqual({
      ok: false,
      error: 'invalid_code',
    });
    expect(auth.verifyEmailChange).not.toHaveBeenCalled();
  });

  it('verifies the email-change OTP and keeps the same user id', async () => {
    const linked = session('user-1', { email: 'ada@example.com', is_anonymous: false });
    const auth = gateway({
      verifyEmailChange: jest.fn(async () => ({ session: linked, error: null })),
    });

    const result = await confirmEmailLink(auth, 'ada@example.com', '12 34 56', 'user-1');

    expect(auth.verifyEmailChange).toHaveBeenCalledWith('ada@example.com', '123456');
    expect(result).toEqual({ ok: true, session: linked });
    if (result.ok) expect(result.session.user.id).toBe('user-1');
  });

  it('refuses a session that belongs to a different user', async () => {
    const auth = gateway({
      verifyEmailChange: jest.fn(async () => ({
        session: session('someone-else', { email: 'ada@example.com', is_anonymous: false }),
        error: null,
      })),
    });

    await expect(confirmEmailLink(auth, 'ada@example.com', '123456', 'user-1')).resolves.toEqual({
      ok: false,
      error: 'unknown',
    });
  });

  it('maps an expired code', async () => {
    const auth = gateway({
      verifyEmailChange: jest.fn(async () => ({
        session: null,
        error: { message: 'expired', code: 'otp_expired' },
      })),
    });

    await expect(confirmEmailLink(auth, 'ada@example.com', '123456', 'user-1')).resolves.toEqual({
      ok: false,
      error: 'code_expired',
    });
  });
});

describe('signOutAndRestart', () => {
  it('signs out and creates a new anonymous session', async () => {
    const auth = gateway({
      signInAnonymously: jest.fn(async () => ({ session: session('user-2'), error: null })),
    });

    const result = await signOutAndRestart(auth);

    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true, session: session('user-2'), created: true });
  });

  it('does not create a new user when sign out fails', async () => {
    const auth = gateway({
      signOut: jest.fn(async () => ({ error: { message: 'nope', code: 'session_not_found' } })),
    });

    await expect(signOutAndRestart(auth)).resolves.toEqual({ ok: false, error: 'unknown' });
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });
});
