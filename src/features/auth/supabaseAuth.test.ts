import { supabase } from '@/lib/supabase';

import { supabaseAuth } from './supabaseAuth';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInAnonymously: jest.fn(),
      updateUser: jest.fn(),
      verifyOtp: jest.fn(),
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

    const result = await supabaseAuth.updateUserEmail('ada@example.com');

    expect(auth.updateUser).toHaveBeenCalledWith({ email: 'ada@example.com' });
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
    expect(result.session?.user.id).toBe('user-1');
    expect(result.session?.user.is_anonymous).toBe(false);
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
