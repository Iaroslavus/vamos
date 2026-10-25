import { render, renderHook, screen, waitFor } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import type { ReactNode } from 'react';
import { AppState, Text } from 'react-native';

import { SessionProvider } from './SessionProvider';
import type { AuthGateway, AuthSession } from './types';
import { useSession } from './useSession';

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: {} },
}));

function session(id: string): AuthSession {
  return { user: { id, email: '', is_anonymous: true } };
}

function gateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    getSession: jest.fn(async () => ({ session: session('user-1'), error: null })),
    signInAnonymously: jest.fn(async () => ({ session: session('anon'), error: null })),
    updateUserEmail: jest.fn(async () => ({ user: null, error: null })),
    verifyEmailChange: jest.fn(async () => ({ session: null, error: null })),
    requestEmailSignIn: jest.fn(async () => ({ error: null })),
    verifyEmailSignIn: jest.fn(async () => ({ session: null, error: null })),
    reloadUser: jest.fn(async () => ({ session: null, error: null })),
    completeAuthRedirect: jest.fn(async () => ({ session: null, type: null, error: null })),
    signOut: jest.fn(async () => ({ error: null })),
    onAuthStateChange: jest.fn(() => () => undefined),
    ...overrides,
  };
}

function wrap(auth: AuthGateway) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SessionProvider auth={auth}>{children}</SessionProvider>;
  };
}

function Probe() {
  const { status, session: current, error } = useSession();
  return <Text>{`${status}:${current?.user.id ?? ''}:${error ?? ''}`}</Text>;
}

describe('useSession', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.mocked(Linking.getInitialURL).mockReset();
    jest.mocked(Linking.getInitialURL).mockImplementation(async () => null);
  });

  it('requires a SessionProvider', async () => {
    await expect(renderHook(() => useSession())).rejects.toThrow(/SessionProvider/);
  });

  it('reuses a persisted session on launch', async () => {
    const auth = gateway();

    await render(
      <SessionProvider auth={auth}>
        <Probe />
      </SessionProvider>,
    );

    expect(await screen.findByText('ready:user-1:')).toBeOnTheScreen();
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('creates an anonymous session when nothing is stored', async () => {
    const auth = gateway({
      getSession: jest.fn(async () => ({ session: null, error: null })),
    });

    await render(
      <SessionProvider auth={auth}>
        <Probe />
      </SessionProvider>,
    );

    expect(await screen.findByText('ready:anon:')).toBeOnTheScreen();
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('exposes a retry after anonymous sign-in fails', async () => {
    const getSession = jest
      .fn()
      .mockResolvedValueOnce({
        session: null,
        error: { message: 'off', code: 'anonymous_provider_disabled' },
      })
      .mockResolvedValueOnce({ session: session('user-2'), error: null });
    const auth = gateway({ getSession });

    const { result } = await renderHook(() => useSession(), { wrapper: wrap(auth) });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.error).toBe('anonymous_disabled');

    await result.current.retry();

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(result.current.session?.user.id).toBe('user-2');
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('keeps the same user id when the email-change code is confirmed', async () => {
    const auth = gateway({
      verifyEmailChange: jest.fn(async () => ({
        session: {
          user: { id: 'user-1', email: 'ada@example.com', is_anonymous: false },
        },
        error: null,
      })),
    });
    const { result } = await renderHook(() => useSession(), { wrapper: wrap(auth) });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    const confirmed = await result.current.confirmEmailLink('ada@example.com', '123456');

    expect(confirmed).toEqual({
      ok: true,
      session: {
        user: { id: 'user-1', email: 'ada@example.com', is_anonymous: false },
      },
    });
    expect(result.current.session?.user.id).toBe('user-1');
    expect(result.current.error).toBeNull();
  });

  it('replaces the anonymous session when signing in on a new device', async () => {
    const auth = gateway({
      verifyEmailSignIn: jest.fn(async () => ({
        session: {
          user: { id: 'saved-user', email: 'ada@example.com', is_anonymous: false },
        },
        error: null,
      })),
    });
    const { result } = await renderHook(() => useSession(), { wrapper: wrap(auth) });

    await waitFor(() => expect(result.current.session?.user.id).toBe('user-1'));
    const signedIn = await result.current.confirmEmailSignIn('ada@example.com', '123456');

    expect(signedIn.ok).toBe(true);
    await waitFor(() => expect(result.current.session?.user.id).toBe('saved-user'));
    expect(result.current.session?.user.email).toBe('ada@example.com');
    expect(result.current.error).toBeNull();
  });

  it('shows the linked email after returning from the confirmation link', async () => {
    const listeners: ((state: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((type, listener) => {
      if (type === 'change') listeners.push(listener as (state: string) => void);
      return { remove: jest.fn() };
    });
    const reloadUser = jest.fn(async () => ({ session: null, error: null }));
    const auth = gateway({ reloadUser });
    const { result } = await renderHook(() => useSession(), { wrapper: wrap(auth) });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.session?.user.id).toBe('user-1');
    expect(result.current.session?.user.is_anonymous).toBe(true);

    reloadUser.mockResolvedValue({
      session: {
        user: { id: 'user-1', email: 'ada@example.com', is_anonymous: false },
      },
      error: null,
    });
    listeners.forEach((listener) => listener('active'));

    await waitFor(() => expect(result.current.session?.user.email).toBe('ada@example.com'));
    expect(result.current.session?.user.id).toBe('user-1');
    expect(result.current.session?.user.is_anonymous).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('adopts the confirmed email from the redirect without showing an error', async () => {
    jest
      .mocked(Linking.getInitialURL)
      .mockResolvedValueOnce(
        'vamos://profile#access_token=token&refresh_token=refresh&type=email_change',
      );
    const auth = gateway({
      completeAuthRedirect: jest.fn(async () => ({
        session: {
          user: { id: 'user-1', email: 'ada@example.com', is_anonymous: false },
        },
        type: 'email_change',
        error: null,
      })),
    });
    const { result } = await renderHook(() => useSession(), { wrapper: wrap(auth) });

    await waitFor(() => expect(result.current.session?.user.email).toBe('ada@example.com'));
    expect(result.current.session?.user.id).toBe('user-1');
    expect(result.current.error).toBeNull();
    expect(auth.completeAuthRedirect).toHaveBeenCalledWith(
      'vamos://profile#access_token=token&refresh_token=refresh&type=email_change',
    );
  });
});
