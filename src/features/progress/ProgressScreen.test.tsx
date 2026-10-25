import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import ProgressScreen from '../../../app/(tabs)/progress';
import { ProgressProvider } from '@/features/progress/ProgressProvider';
import { createProgressRepository } from '@/features/progress/repository';
import type {
  KeyValueStorage,
  NetworkMonitor,
  ProgressRemote,
  ProgressRepository,
  ProgressSnapshot,
} from '@/features/progress/types';
import { reviewStorageKey } from '@/features/review/repository';
import i18n from '@/i18n';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
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

const EMPTY: ProgressSnapshot = { lessons: [], totalXp: 0, pending: 0 };

function repository(overrides: Partial<ProgressRepository> = {}): ProgressRepository {
  return {
    readProgress: jest.fn(async () => EMPTY),
    recordCompletion: jest.fn(),
    awardXp: jest.fn(),
    sync: jest.fn(async () => EMPTY),
    start: jest.fn(() => () => undefined),
    settled: jest.fn(async () => undefined),
    ...overrides,
  };
}

function memoryStorage(): KeyValueStorage {
  const items = new Map<string, string>();
  return {
    async getItem(key) {
      return items.get(key) ?? null;
    },
    async setItem(key, value) {
      items.set(key, value);
    },
    async removeItem(key) {
      items.delete(key);
    },
  };
}

function offlineRepository() {
  const network: NetworkMonitor = {
    async isOnline() {
      return false;
    },
    subscribe() {
      return () => undefined;
    },
  };
  const remote: ProgressRemote = {
    async fetchLessons() {
      return [];
    },
    async fetchXp() {
      return [];
    },
    async saveLesson(_userId, lesson) {
      return lesson;
    },
    async insertXp() {
      return undefined;
    },
  };
  return createProgressRepository({
    storage: memoryStorage(),
    network,
    remote,
    now: () => new Date().toISOString(),
    createId: () => 'xp-test',
  });
}

function renderScreen(repo: ProgressRepository) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <ProgressProvider repository={repo}>
          <ProgressScreen />
        </ProgressProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const WEEKDAY = '^(вс|пн|вт|ср|чт|пт|сб)';

function dueCard(id: string) {
  return {
    id,
    itemId: id,
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
  };
}

async function seedDue(ids: readonly string[]): Promise<void> {
  const cards: Record<string, ReturnType<typeof dueCard>> = {};
  for (const id of ids) cards[`${id}:es_to_ru`] = dueCard(id);
  await AsyncStorage.setItem(
    reviewStorageKey('user-1'),
    JSON.stringify({ version: 1, cards, logs: [], outbox: [] }),
  );
}

describe('ProgressScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockPush.mockClear();
  });

  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it('shows a skeleton while progress is loading', async () => {
    let release: (value: ProgressSnapshot) => void = () => undefined;
    const pending = new Promise<ProgressSnapshot>((resolve) => {
      release = resolve;
    });
    await renderScreen(
      repository({
        readProgress: () => pending,
      }),
    );

    expect(screen.getByLabelText('Загружаем прогресс')).toBeOnTheScreen();
    await act(async () => {
      release(EMPTY);
    });
    expect(await screen.findByLabelText('Время в языке: 0 мин')).toBeOnTheScreen();
    await flush();
  });

  it('offers a retry when the repository cannot be read', async () => {
    let fail = true;
    await renderScreen(
      repository({
        readProgress: async () => {
          if (fail) throw new Error('network');
          return EMPTY;
        },
      }),
    );

    expect(
      await screen.findByText('Не удалось загрузить прогресс. Проверьте сеть и повторите.'),
    ).toBeTruthy();
    fail = false;
    await fireEvent.press(screen.getByText('Повторить'));

    expect(await screen.findByLabelText('Время в языке: 0 мин')).toBeTruthy();
    await flush();
  });

  it('shows levels, empty skills, zero reviews, and no study time', async () => {
    await renderScreen(repository());

    expect(await screen.findByLabelText('Время в языке: 0 мин')).toBeTruthy();
    expect(screen.getByLabelText('Повторить сегодня: 0')).toBeTruthy();
    expect(screen.getByText('На 7 дней')).toBeTruthy();
    expect(screen.getAllByLabelText(new RegExp(`${WEEKDAY}: 0$`))).toHaveLength(7);
    expect(screen.getByLabelText('A1, 0 из 14')).toBeTruthy();
    expect(screen.getAllByText('Скоро')).toHaveLength(5);
    expect(screen.getByLabelText('Словарь, 0%')).toBeTruthy();
    expect(screen.getByLabelText('Грамматика, 0%')).toBeTruthy();
    expect(screen.getByLabelText('Аудирование, 0%')).toBeTruthy();
    expect(screen.getByLabelText('Разговор, 0%')).toBeTruthy();
    expect(screen.queryByText(/Ждёт отправки/)).toBeNull();
    await flush();

    mockPush.mockClear();
    fireEvent.press(screen.getByLabelText('Повторить сегодня: 0'));
    expect(mockPush).toHaveBeenCalledWith('/review');
  });

  it('shows today and the rest of the week from the deck', async () => {
    await seedDue(['hola', 'gracias']);
    await renderScreen(repository());

    expect(await screen.findByLabelText('Повторить сегодня: 2')).toBeTruthy();
    expect(screen.getAllByLabelText(new RegExp(`${WEEKDAY}: 0$`))).toHaveLength(6);
    expect(screen.getByLabelText(new RegExp(`${WEEKDAY}: 2$`))).toBeTruthy();
    await flush();
  });

  it('turns seven finished lessons into one hour and ten minutes', async () => {
    const completedAt = '2020-01-01T00:00:00.000Z';
    const ids = [
      'a1.hola.l1',
      'a1.hola.l2',
      'a1.numbers.l1',
      'extra-4',
      'extra-5',
      'extra-6',
      'extra-7',
    ];
    await renderScreen(
      repository({
        readProgress: async () => ({
          lessons: ids.map((lessonId) => ({
            lessonId,
            status: 'completed',
            bestAccuracy: 100,
            completedAt,
          })),
          totalXp: 140,
          pending: 2,
        }),
      }),
    );

    expect(await screen.findByLabelText('Время в языке: 1 ч 10 мин')).toBeTruthy();
    expect(screen.getByLabelText('A1, 3 из 14')).toBeTruthy();
    expect(screen.getByLabelText('Повторить сегодня: 0')).toBeTruthy();
    expect(screen.getByLabelText('Словарь, 0%')).toBeTruthy();
    expect(screen.getByText('Ждёт отправки: 2.')).toBeTruthy();
    await flush();
  });

  it('updates time, the A1 bar, and the queue after a lesson is saved', async () => {
    const repo = offlineRepository();
    await renderScreen(repo);

    expect(await screen.findByLabelText('Время в языке: 0 мин')).toBeTruthy();
    expect(screen.getByLabelText('Повторить сегодня: 0')).toBeTruthy();

    await act(async () => {
      await repo.recordCompletion('user-1', {
        lessonId: 'a1.hola.l1',
        accuracy: 80,
        xp: 18,
        completedAt: new Date().toISOString(),
      });
    });

    expect(await screen.findByLabelText('Время в языке: 10 мин')).toBeTruthy();
    expect(screen.getByLabelText('A1, 1 из 14')).toBeTruthy();
    expect(screen.getByLabelText('Повторить сегодня: 0')).toBeTruthy();
    expect(screen.getByText('Ждёт отправки: 2.')).toBeTruthy();
    await flush();
  });
});
