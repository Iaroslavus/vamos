import { supabase } from '@/lib/supabase';

import { supabaseAuth, syncUiLanguage } from './supabaseAuth';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInAnonymously: jest.fn(),
      updateUser: jest.fn(),
      verifyOtp: jest.fn(),
      signInWithOtp: jest.fn(),
      getUser: jest.fn(),
      refreshSession: jest.fn(),
      setSession: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

const auth = supabase.auth;

describe('supabaseAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signs in anonymously and maps the session user', async () => {
    jest.mocked(auth.signInAnonymously).mockResolvedValue({
      data: {
        session: {
          user: { id: 'anon-1', email: '', is_anonymous: true },
        },
      },
      error: null,
    } as never);

    const result = await supabaseAuth.signInAnonymously();

    expect(auth.signInAnonymously).toHaveBeenCalledWith();
    expect(result.session?.user).toEqual(
      expect.objectContaining({ id: 'anon-1', is_anonymous: true }),
    );
    expect(result.error).toBeNull();
  });

  it('links an email with updateUser', async () => {
    jest.mocked(auth.updateUser).mockResolvedValue({
      data: {
        user: { id: 'user-1', email: '', new_email: 'ada@example.com', is_anonymous: true },
      },
      error: null,
    } as never);

    const result = await supabaseAuth.updateUserEmail('ada@example.com', 'ru');

    expect(auth.updateUser).toHaveBeenCalledWith(
      { email: 'ada@example.com', data: { ui_language: 'ru' } },
      { emailRedirectTo: 'vamos://profile' },
    );
    expect(result.user).toEqual(
      expect.objectContaining({ id: 'user-1', new_email: 'ada@example.com', is_anonymous: true }),
    );
  });

  it('confirms the code as an email change so the anonymous user id stays', async () => {
    jest.mocked(auth.verifyOtp).mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'ada@example.com', is_anonymous: false },
        },
      },
      error: null,
    } as never);

    const result = await supabaseAuth.verifyEmailChange('ada@example.com', '123456');

    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: 'ada@example.com',
      token: '123456',
      type: 'email_change',
    });
    expect(auth.verifyOtp).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'email' }));
    expect(auth.verifyOtp).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'magiclink' }));
    expect(result.session?.user.id).toBe('user-1');
    expect(result.session?.user.is_anonymous).toBe(false);
  });

  it('signs in with an email code and returns the account that owns the address', async () => {
    jest.mocked(auth.signInWithOtp).mockResolvedValue({ data: {}, error: null } as never);
    jest.mocked(auth.verifyOtp).mockResolvedValue({
      data: {
        session: {
          user: { id: 'saved-user', email: 'ada@example.com', is_anonymous: false },
        },
      },
      error: null,
    } as never);

    await supabaseAuth.requestEmailSignIn('ada@example.com', 'uk');
    const result = await supabaseAuth.verifyEmailSignIn('ada@example.com', '123456');

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'ada@example.com',
      options: {
        shouldCreateUser: false,
        emailRedirectTo: 'vamos://profile',
        data: { ui_language: 'uk' },
      },
    });
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: 'ada@example.com',
      token: '123456',
      type: 'email',
    });
    expect(result.session?.user.id).toBe('saved-user');
    expect(result.error).toBeNull();
  });

  it('refreshes the same user after the email link is confirmed in the browser', async () => {
    jest.mocked(auth.getUser).mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'ada@example.com', is_anonymous: false },
      },
      error: null,
    } as never);
    jest.mocked(auth.getSession).mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: '', is_anonymous: true },
          refresh_token: 'refresh',
        },
      },
      error: null,
    } as never);
    jest.mocked(auth.refreshSession).mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'ada@example.com', is_anonymous: false },
        },
      },
      error: null,
    } as never);

    const result = await supabaseAuth.reloadUser();

    expect(result.session?.user).toEqual(
      expect.objectContaining({ id: 'user-1', email: 'ada@example.com', is_anonymous: false }),
    );
    expect(result.error).toBeNull();
  });

  it('stores the interface language on the signed-in user', async () => {
    jest.mocked(auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    } as never);
    jest.mocked(auth.updateUser).mockResolvedValue({ data: { user: null }, error: null } as never);

    await syncUiLanguage('uk');

    expect(auth.updateUser).toHaveBeenCalledWith({ data: { ui_language: 'uk' } });
  });

  it('forwards auth state changes and unsubscribes', () => {
    const unsubscribe = jest.fn();
    let callback: ((event: string, session: { user: { id: string } } | null) => void) | undefined;
    jest.mocked(auth.onAuthStateChange).mockImplementation((cb) => {
      callback = cb as typeof callback;
      return { data: { subscription: { unsubscribe } } } as never;
    });

    const listener = jest.fn();
    const stop = supabaseAuth.onAuthStateChange(listener);
    callback?.('SIGNED_IN', { user: { id: 'user-1' } });
    stop();

    expect(listener).toHaveBeenCalledWith({
      user: expect.objectContaining({ id: 'user-1' }),
    });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
