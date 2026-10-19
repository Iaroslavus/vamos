import { render, renderHook, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

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
});
