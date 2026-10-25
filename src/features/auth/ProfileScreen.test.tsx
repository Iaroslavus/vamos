import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import { Alert } from 'react-native';

import ProfileScreen from '../../../app/(tabs)/profile';
import { SessionProvider } from '@/features/auth/SessionProvider';
import type { AuthGateway, AuthSession, AuthUser } from '@/features/auth/types';
import i18n from '@/i18n';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: {} },
}));

type AlertButton = { text?: string; style?: string; onPress?: () => void };

function anonymous(id: string): AuthSession {
  return { user: { id, email: '', is_anonymous: true } };
}

function createAuth() {
  let current: AuthSession | null = anonymous('user-1');
  const listeners = new Set<(session: AuthSession | null) => void>();

  const emit = (next: AuthSession | null) => {
    current = next;
    listeners.forEach((listener) => listener(next));
  };

  const auth: AuthGateway = {
    getSession: jest.fn(async () => ({ session: current, error: null })),
    signInAnonymously: jest.fn(async () => {
      const next = anonymous('user-2');
      emit(next);
      return { session: next, error: null };
    }),
    updateUserEmail: jest.fn(async (email: string) => {
      const user: AuthUser = {
        ...(current?.user ?? { id: 'user-1' }),
        new_email: email,
        is_anonymous: true,
      };
      emit({ user });
      return { user, error: null };
    }),
    verifyEmailChange: jest.fn(async (email: string) => {
      const next: AuthSession = {
        user: {
          ...(current?.user ?? { id: 'user-1' }),
          email,
          new_email: null,
          is_anonymous: false,
        },
      };
      emit(next);
      return { session: next, error: null };
    }),
    signOut: jest.fn(async () => {
      emit(null);
      return { error: null };
    }),
    onAuthStateChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return auth;
}

function renderProfile(auth: AuthGateway) {
  return render(
    <I18nextProvider i18n={i18n}>
      <SessionProvider auth={auth}>
        <ProfileScreen />
      </SessionProvider>
    </I18nextProvider>,
  );
}

function confirmAlert() {
  const buttons = jest.mocked(Alert.alert).mock.calls[0]?.[2] as AlertButton[] | undefined;
  const confirm = buttons?.find((button) => button.style === 'destructive');
  if (!confirm?.onPress) throw new Error('sign-out confirm button missing');
  confirm.onPress();
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('links the anonymous account with an email OTP and keeps the same user', async () => {
    const auth = createAuth();
    await renderProfile(auth);

    expect(await screen.findByLabelText('Email')).toBeOnTheScreen();
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Отправить код' })).toBeDisabled();

    fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    const send = await screen.findByRole('button', { name: 'Отправить код', disabled: false });
    fireEvent.press(send);

    expect(await screen.findByText('Код отправлен на ada@example.com')).toBeOnTheScreen();
    expect(auth.updateUserEmail).toHaveBeenCalledWith('ada@example.com');

    fireEvent.changeText(screen.getByLabelText('Код из письма'), '123456');
    fireEvent.press(await screen.findByRole('button', { name: 'Подтвердить', disabled: false }));

    expect(await screen.findByText('Прогресс сохранён')).toBeOnTheScreen();
    expect(screen.getByText('ada@example.com')).toBeOnTheScreen();
    expect(auth.verifyEmailChange).toHaveBeenCalledWith('ada@example.com', '123456');

    const verified = jest.mocked(auth.verifyEmailChange).mock.results[0];
    await expect(verified?.value).resolves.toEqual(
      expect.objectContaining({
        session: expect.objectContaining({
          user: expect.objectContaining({ id: 'user-1', is_anonymous: false }),
        }),
      }),
    );
  });

  it('shows an error when the email is already taken', async () => {
    const auth = createAuth();
    jest.mocked(auth.updateUserEmail).mockResolvedValue({
      user: null,
      error: { message: 'taken', code: 'email_exists' },
    });
    await renderProfile(auth);

    fireEvent.changeText(await screen.findByLabelText('Email'), 'ada@example.com');
    fireEvent.press(await screen.findByRole('button', { name: 'Отправить код', disabled: false }));

    expect(await screen.findByText('Этот email уже занят. Укажите другой.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Код из письма')).toBeNull();
  });

  it('warns that unsaved progress will be lost, then starts a new anonymous account', async () => {
    const auth = createAuth();
    await renderProfile(auth);
    await screen.findByLabelText('Email');

    fireEvent.press(screen.getByRole('button', { name: 'Выйти' }));

    expect(Alert.alert).toHaveBeenCalledWith(
      i18n.t('auth.signOutTitle'),
      i18n.t('auth.signOutWarningUnsaved'),
      expect.any(Array),
    );

    confirmAlert();

    expect(await screen.findByLabelText('Email')).toBeOnTheScreen();
    await waitFor(() => {
      expect(auth.signOut).toHaveBeenCalledTimes(1);
      expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
    });
  });

  it('warns that a saved account stays on the email before signing out', async () => {
    const auth = createAuth();
    jest.mocked(auth.getSession).mockResolvedValue({
      session: {
        user: { id: 'user-1', email: 'ada@example.com', is_anonymous: false },
      },
      error: null,
    });
    await renderProfile(auth);

    expect(await screen.findByText('Прогресс сохранён')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Выйти' }));

    expect(Alert.alert).toHaveBeenCalledWith(
      i18n.t('auth.signOutTitle'),
      i18n.t('auth.signOutWarningSaved', { email: 'ada@example.com' }),
      expect.any(Array),
    );
  });
});
