import {
  adoptAuthCallback,
  authCallbackParams,
  sessionFromAuthReturn,
  sessionFromUserReload,
} from './authReturn';
import type { AuthSession } from './types';

function session(id: string, extra: Partial<AuthSession['user']> = {}): AuthSession {
  return { user: { id, email: '', is_anonymous: true, ...extra } };
}

describe('authCallbackParams', () => {
  it('reads tokens from the hash and the query', () => {
    expect(
      authCallbackParams('vamos://profile#access_token=a&refresh_token=b&type=email_change'),
    ).toEqual({
      access_token: 'a',
      refresh_token: 'b',
      type: 'email_change',
    });
    expect(authCallbackParams('vamos://profile?code=abc&type=signup')).toEqual({
      code: 'abc',
      type: 'signup',
    });
  });

  it('ignores ordinary links', () => {
    expect(authCallbackParams('vamos://profile')).toBeNull();
    expect(authCallbackParams('https://example.com/lesson')).toBeNull();
  });
});

describe('sessionFromAuthReturn', () => {
  const linked = session('user-1', { email: 'ada@example.com', is_anonymous: false });

  it('keeps the same user when the email-change link returns', () => {
    expect(sessionFromAuthReturn(session('user-1'), linked, 'email_change')).toEqual(linked);
  });

  it('does not switch accounts on an email-change redirect for someone else', () => {
    expect(sessionFromAuthReturn(session('user-1'), session('other'), 'email_change')).toBeNull();
  });

  it('opens the saved account when a sign-in link is opened on a new device', () => {
    const saved = session('saved-user', { email: 'ada@example.com', is_anonymous: false });
    expect(sessionFromAuthReturn(session('anon'), saved, 'magiclink')).toEqual(saved);
  });
});

describe('sessionFromUserReload', () => {
  it('applies a confirmed email without changing the user id', () => {
    const linked = session('user-1', { email: 'ada@example.com', is_anonymous: false });
    expect(sessionFromUserReload(session('user-1'), linked)).toEqual(linked);
  });

  it('ignores a different user and a stale anonymous payload', () => {
    const saved = session('user-1', { email: 'ada@example.com', is_anonymous: false });
    expect(sessionFromUserReload(session('user-1'), session('other'))).toBeNull();
    expect(sessionFromUserReload(saved, session('user-1'))).toBeNull();
  });
});

describe('adoptAuthCallback', () => {
  it('shows the linked email and does not surface an error when the link has no tokens', async () => {
    const current = session('user-1');
    const linked = session('user-1', { email: 'ada@example.com', is_anonymous: false });
    const auth = {
      completeAuthRedirect: jest.fn(async () => ({
        session: null,
        type: 'email_change',
        error: { message: 'access denied', code: 'access_denied' },
      })),
      reloadUser: jest.fn(async () => ({ session: linked, error: null })),
    };

    const next = await adoptAuthCallback(
      auth,
      'vamos://profile#error=access_denied&error_code=access_denied&type=email_change',
      current,
    );

    expect(next).toEqual(linked);
    expect(next?.user.id).toBe('user-1');
  });

  it('uses the redirect session when the email-change link returns tokens', async () => {
    const linked = session('user-1', { email: 'ada@example.com', is_anonymous: false });
    const auth = {
      completeAuthRedirect: jest.fn(async () => ({
        session: linked,
        type: 'email_change',
        error: null,
      })),
      reloadUser: jest.fn(),
    };

    const next = await adoptAuthCallback(
      auth,
      'vamos://profile#access_token=a&refresh_token=b&type=email_change',
      session('user-1'),
    );

    expect(next).toEqual(linked);
    expect(auth.reloadUser).not.toHaveBeenCalled();
  });
});
