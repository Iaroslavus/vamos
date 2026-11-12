import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PathScreen } from '@/features/path/PathScreen';
import { LearnerProvider } from '@/features/learner/context';
import type { LearnerProfile } from '@/features/learner/profile';
import type { LearnerRepository } from '@/features/learner/repository';
import { ProgressProvider } from '@/features/progress/ProgressProvider';
import type { LessonProgress, ProgressRepository } from '@/features/progress/types';
import { reviewStorageKey } from '@/features/review/repository';
import i18n from '@/i18n';

const mockPush = jest.fn();

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    useRouter: () => ({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    }),
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(() => effect(), [effect]);
    },
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@/features/auth/useSession', () => ({
  useSession: () => ({
    status: 'ready',
    session: { user: { id: 'user-1', is_anonymous: true } },
  }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: {} },
}));

const LEARNER: LearnerProfile = {
  name: 'Анна',
  goal: 'travel',
  dailyMinutes: 10,
  preferencesAsked: true,
  uiLanguage: null,
  spanishVariant: 'spain',
};

function learnerRepository(): LearnerRepository {
  return {
    read: async () => LEARNER,
    save: async () => LEARNER,
  };
}

function repository(lessons: LessonProgress[] = []): ProgressRepository {
  return {
    readProgress: jest.fn(async () => ({ lessons, totalXp: 0, pending: 0 })),
    recordCompletion: jest.fn(),
    awardXp: jest.fn(),
    sync: jest.fn(async () => ({ lessons, totalXp: 0, pending: 0 })),
    start: jest.fn(() => () => undefined),
    settled: jest.fn(async () => undefined),
  };
}

function renderPath(lessons: LessonProgress[] = []) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <I18nextProvider i18n={i18n}>
          <ProgressProvider repository={repository(lessons)}>
            <LearnerProvider repository={learnerRepository()}>
              <PathScreen />
            </LearnerProvider>
          </ProgressProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('Path screen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockPush.mockClear();
    await i18n.changeLanguage('ru');
  });

  afterEach(async () => {
    await flush();
  });

  it('opens on the recommended topic and scrolls the header to Madrid', async () => {
    await renderPath();

    expect(await screen.findByText('Начать тему')).toBeTruthy();
    expect(screen.getByText('A1 · Неделя 1 · Мадрид')).toBeTruthy();
    expect(screen.getByText('День 1 · РЕКОМЕНДУЕМ')).toBeTruthy();
    expect(screen.getByLabelText('¡Hola! Знакомство, рекомендуем сейчас')).toBeTruthy();
    expect(screen.getByLabelText('В кафе, ещё не начато')).toBeTruthy();
    expect(screen.getByLabelText('Сундук, чекпоинт')).toBeTruthy();
    await flush();
  });

  it('selects an open topic and starts its first lesson', async () => {
    await renderPath();

    await screen.findByText('Начать тему');
    await fireEvent.press(screen.getByLabelText('В кафе, ещё не начато'));

    expect(screen.getByText('День 2 · МОЖНО СРАЗУ')).toBeTruthy();
    expect(screen.getAllByText('В кафе').length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByText('Начать тему'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/lesson/[id]',
      params: { id: 'a1.cafe.l1' },
    });
    await flush();
  });

  it('continues the next lesson of the recommended topic', async () => {
    await renderPath([
      {
        lessonId: 'a1.hola.l1',
        status: 'completed',
        bestAccuracy: 1,
        completedAt: '2026-05-01T10:00:00.000Z',
      },
    ]);

    await fireEvent.press(await screen.findByText('Продолжить · урок 2'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/lesson/[id]',
      params: { id: 'a1.hola.l2' },
    });
    await flush();
  });

  it('opens review from the header chip', async () => {
    const cards = {
      'hola:es_to_ru': {
        id: 'hola:es_to_ru',
        itemId: 'hola',
        direction: 'es_to_ru' as const,
        due: new Date().toISOString(),
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        learningSteps: 0,
        reps: 0,
        lapses: 0,
        state: 0,
        lastReview: null,
      },
    };
    await AsyncStorage.setItem(
      reviewStorageKey('user-1'),
      JSON.stringify({ version: 1, cards, logs: [], outbox: [] }),
    );
    await renderPath();

    await fireEvent.press(await screen.findByLabelText('Повторить 1'));
    expect(mockPush).toHaveBeenCalledWith('/review');
    await flush();
  });
});
