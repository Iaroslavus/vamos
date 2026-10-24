import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LessonScreen from '../../../app/(lesson)/lesson/[id]';
import LearnScreen from '../../../app/(tabs)/index';
import { useLessonStore } from '@/features/lesson/store';
import { ProgressProvider } from '@/features/progress/ProgressProvider';
import { createProgressRepository } from '@/features/progress/repository';
import type {
  KeyValueStorage,
  NetworkMonitor,
  ProgressRemote,
  ProgressRepository,
} from '@/features/progress/types';
import { reviewStorageKey } from '@/features/review/repository';
import i18n from '@/i18n';

const mockPush = jest.fn();
const mockSearchParams: { id?: string } = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock('@/features/audio/playback', () => ({
  NORMAL_RATE: 1,
  SLOW_RATE: 0.7,
  playLessonAudio: jest.fn(() => Promise.resolve('speech')),
  stopLessonAudio: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/features/audio/sounds', () => ({
  playGradeSound: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
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

function repository(overrides: Partial<ProgressRepository> = {}): ProgressRepository {
  return {
    readProgress: jest.fn(async () => ({ lessons: [], totalXp: 0, pending: 0 })),
    recordCompletion: jest.fn(),
    awardXp: jest.fn(),
    sync: jest.fn(async () => ({ lessons: [], totalXp: 0, pending: 0 })),
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
          <LearnScreen />
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

describe('LearnScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockPush.mockClear();
    mockSearchParams.id = undefined;
    useLessonStore.getState().reset();
  });

  afterEach(async () => {
    await flush();
  });

  it('shows a skeleton while progress is loading', async () => {
    let release: (value: { lessons: []; totalXp: 0; pending: 0 }) => void = () => undefined;
    const pending = new Promise<{ lessons: []; totalXp: 0; pending: 0 }>((resolve) => {
      release = resolve;
    });
    await renderScreen(
      repository({
        readProgress: () => pending,
      }),
    );

    expect(screen.getByLabelText('Загружаем путь')).toBeOnTheScreen();
    await act(async () => {
      release({ lessons: [], totalXp: 0, pending: 0 });
    });
    expect(await screen.findByLabelText('Опыт 0')).toBeOnTheScreen();
    await flush();
  });

  it('offers a retry when the repository cannot be read', async () => {
    let fail = true;
    await renderScreen(
      repository({
        readProgress: async () => {
          if (fail) throw new Error('network');
          return { lessons: [], totalXp: 0, pending: 0 };
        },
      }),
    );

    expect(
      await screen.findByText('Не удалось загрузить путь. Проверьте сеть и повторите.'),
    ).toBeTruthy();
    fail = false;
    await fireEvent.press(screen.getByText('Повторить'));

    expect(await screen.findByLabelText('Опыт 0')).toBeTruthy();
    await flush();
  });

  it('shows the path, streak, XP, and daily goal from the repository', async () => {
    await renderScreen(repository());

    expect(await screen.findByLabelText('Серия 0')).toBeTruthy();
    expect(screen.getByLabelText('Опыт 0')).toBeTruthy();
    expect(screen.getByLabelText('Цель дня: 0 из 10 минут')).toBeTruthy();
    expect(screen.getByText('0/10')).toBeTruthy();
    expect(screen.getByText('A1 · Блок 1')).toBeTruthy();
    expect(screen.getByLabelText('Приветствия, текущий')).toBeTruthy();
    expect(screen.getByLabelText('Знакомство, закрыт')).toBeDisabled();
    expect(screen.queryByText(/повторения/)).toBeNull();
    await flush();
  });

  it('shows words waiting for review above the path and opens the session', async () => {
    await seedDue(['hola']);
    await renderScreen(repository());

    expect(await screen.findByText('1 слово ждёт повторения')).toBeTruthy();
    expect(screen.getByText('A1 · Блок 1')).toBeTruthy();

    mockPush.mockClear();
    await fireEvent.press(screen.getByText('Повторить'));
    expect(mockPush).toHaveBeenCalledWith('/review');
    expect(i18n.t('learn.reviewDue', { count: 2 })).toBe('2 слова ждут повторения');
    expect(i18n.t('learn.reviewDue', { count: 5 })).toBe('5 слов ждут повторения');
    expect(i18n.t('learn.reviewDue', { count: 21 })).toBe('21 слово ждёт повторения');
    await flush();
  });

  it('opens the current lesson and ignores a locked node', async () => {
    await renderScreen(repository());

    await fireEvent.press(await screen.findByLabelText('Приветствия, текущий'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/lesson/[id]',
      params: { id: 'a1.hola.l1' },
    });

    await fireEvent.press(screen.getByLabelText('Знакомство, закрыт'));
    expect(mockPush).toHaveBeenCalledTimes(1);
    await flush();
  });

  it('opens a1.hola.l1 on the first exercise when the first path node is pressed', async () => {
    const home = await renderScreen(repository());

    await fireEvent.press(await screen.findByLabelText('Приветствия, текущий'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/lesson/[id]',
      params: { id: 'a1.hola.l1' },
    });
    const destination = mockPush.mock.calls[0]?.[0] as { params: { id: string } };
    mockSearchParams.id = destination.params.id;
    await flush();
    await home.unmount();

    const lesson = await render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 47, left: 0, right: 0, bottom: 34 },
          }}
        >
          <I18nextProvider i18n={i18n}>
            <LessonScreen />
          </I18nextProvider>
        </SafeAreaProvider>
      </QueryClientProvider>,
    );

    expect(await lesson.findByText('Выберите перевод')).toBeOnTheScreen();
    expect(lesson.getByText('hola')).toBeOnTheScreen();
    expect(lesson.getByText('привет')).toBeOnTheScreen();
    expect(lesson.getByText('Проверить')).toBeOnTheScreen();
    expect(lesson.queryByText('Экран урока скоро будет здесь.')).toBeNull();
    await flush();
  });

  it('updates the path, streak, XP, and ring after a lesson is saved', async () => {
    const repo = offlineRepository();
    await renderScreen(repo);

    expect(await screen.findByLabelText('Опыт 0')).toBeTruthy();
    expect(screen.getByLabelText('Приветствия, текущий')).toBeTruthy();

    await act(async () => {
      await repo.recordCompletion('user-1', {
        lessonId: 'a1.hola.l1',
        accuracy: 100,
        xp: 20,
        completedAt: new Date().toISOString(),
      });
    });

    expect(await screen.findByLabelText('Опыт 20')).toBeTruthy();
    expect(screen.getByLabelText('Серия 1')).toBeTruthy();
    expect(screen.getByText('10/10')).toBeTruthy();
    expect(screen.getByLabelText('Приветствия, пройден')).toBeTruthy();
    expect(screen.getByLabelText('Знакомство, текущий')).toBeTruthy();
    await flush();
  });
});
