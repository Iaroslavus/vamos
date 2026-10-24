import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import { ProgressProvider } from '@/features/progress/ProgressProvider';
import type {
  LessonProgress,
  ProgressRepository,
  ProgressSnapshot,
} from '@/features/progress/types';
import i18n from '@/i18n';

import { TopicScreen } from './TopicScreen';
import { TopicsScreen } from './TopicsScreen';

const mockPush = jest.fn();
const mockParams: { id?: string } = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => mockParams,
  Stack: { Screen: () => null },
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
    readProgress: jest.fn(async () => snapshot()),
    recordCompletion: jest.fn(),
    awardXp: jest.fn(),
    sync: jest.fn(async () => snapshot()),
    start: jest.fn(() => () => undefined),
    settled: jest.fn(async () => undefined),
    ...overrides,
  };
}

function completed(lessonId: string): LessonProgress {
  return {
    lessonId,
    status: 'completed',
    bestAccuracy: 1,
    completedAt: '2026-10-01T10:00:00.000Z',
  };
}

function snapshot(ids: readonly string[] = []): ProgressSnapshot {
  return { lessons: ids.map(completed), totalXp: 0, pending: 0 };
}

function renderWith(node: ReactNode, repo: ProgressRepository) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <ProgressProvider repository={repo}>{node}</ProgressProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('TopicsScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockParams.id = undefined;
  });

  afterEach(async () => {
    await flush();
  });

  it('shows a skeleton while progress is loading', async () => {
    let release: (value: ProgressSnapshot) => void = () => undefined;
    const pending = new Promise<ProgressSnapshot>((resolve) => {
      release = resolve;
    });
    await renderWith(<TopicsScreen />, repository({ readProgress: () => pending }));

    expect(screen.getByLabelText('Загружаем темы')).toBeOnTheScreen();
    expect(screen.getByLabelText('Поиск темы')).toBeOnTheScreen();
    await act(async () => {
      release(snapshot());
    });
    expect(await screen.findByText('Первые шаги')).toBeOnTheScreen();
    await flush();
  });

  it('offers a retry when the repository cannot be read', async () => {
    let fail = true;
    await renderWith(
      <TopicsScreen />,
      repository({
        readProgress: async () => {
          if (fail) throw new Error('network');
          return snapshot();
        },
      }),
    );

    expect(
      await screen.findByText('Не удалось загрузить прогресс. Проверьте сеть и повторите.'),
    ).toBeTruthy();
    fail = false;
    await fireEvent.press(screen.getByText('Повторить'));
    expect(await screen.findByText('¡Hola! Знакомство')).toBeTruthy();
    await flush();
  });

  it('lists topics from the index and opens one', async () => {
    await renderWith(<TopicsScreen />, repository());

    expect(
      await screen.findByLabelText('¡Hola! Знакомство, 2 урока, 15 фраз, пройдено 0 из 2'),
    ).toBeTruthy();
    expect(screen.getByText('2 урока · 15 фраз')).toBeTruthy();
    expect(screen.getByLabelText('Числа 1–10, 1 урок, 7 фраз, пройдено 0 из 1')).toBeTruthy();
    expect(screen.getByLabelText('Уровень A1')).toBeSelected();
    expect(screen.queryByText('Темы этого уровня ещё готовятся.')).toBeNull();

    await fireEvent.press(
      screen.getByLabelText('¡Hola! Знакомство, 2 урока, 15 фраз, пройдено 0 из 2'),
    );
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/topics/[id]', params: { id: 'a1.hola' } });
    await flush();
  });

  it('filters by search and shows soon for a level without topics', async () => {
    await renderWith(<TopicsScreen />, repository());
    expect(await screen.findByText('¡Hola! Знакомство')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Поиск темы'), 'числа');
    expect(screen.queryByText('¡Hola! Знакомство')).toBeNull();
    expect(screen.getByText('Числа 1–10')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Поиск темы'), 'zzzz');
    expect(screen.getByText('Ничего не нашли')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Очистить поиск'));
    expect(screen.getByText('¡Hola! Знакомство')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('A2, скоро'));
    expect(screen.getByText('Темы этого уровня ещё готовятся.')).toBeTruthy();
    expect(screen.queryByText('Ничего не нашли')).toBeNull();
    expect(i18n.t('topics.lessonCount', { count: 5 })).toBe('5 уроков');
    expect(i18n.t('topics.phraseCount', { count: 21 })).toBe('21 фраза');
    await flush();
  });

  it('shows saved progress on the card and ignores an in-progress lesson', async () => {
    await renderWith(
      <TopicsScreen />,
      repository({
        readProgress: async () => ({
          lessons: [
            completed('a1.hola.l1'),
            {
              lessonId: 'a1.numbers.l1',
              status: 'in_progress',
              bestAccuracy: null,
              completedAt: null,
            },
          ],
          totalXp: 10,
          pending: 0,
        }),
      }),
    );

    expect(
      await screen.findByLabelText('¡Hola! Знакомство, 2 урока, 15 фраз, пройдено 1 из 2'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Числа 1–10, 1 урок, 7 фраз, пройдено 0 из 1')).toBeTruthy();
    await flush();
  });
});

describe('TopicScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockParams.id = 'a1.hola';
  });

  afterEach(async () => {
    await flush();
  });

  it('locks later lessons and the scene until the previous lesson is done', async () => {
    await renderWith(<TopicScreen />, repository());

    expect(await screen.findByText('Смогу…')).toBeTruthy();
    expect(screen.getByLabelText('Поздороваться и попрощаться, ещё впереди')).toBeTruthy();
    expect(screen.getByLabelText('Приветствия, текущий')).toBeTruthy();
    expect(screen.getByLabelText('Знакомство, закрыт')).toBeDisabled();
    expect(screen.getByLabelText('Знакомство на улице, сценка, закрыта')).toBeTruthy();
    expect(screen.getByLabelText('Пройдено 0 из 2')).toBeTruthy();

    mockPush.mockClear();
    await fireEvent.press(screen.getByLabelText('Знакомство, закрыт'));
    expect(mockPush).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Приветствия, текущий'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/lesson/[id]',
      params: { id: 'a1.hola.l1' },
    });
    await flush();
  });

  it('checks goals and unlocks the next lesson from the repository', async () => {
    await renderWith(
      <TopicScreen />,
      repository({ readProgress: async () => snapshot(['a1.hola.l1']) }),
    );

    expect(
      await screen.findByLabelText('Поздороваться и попрощаться, уже получается'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Сказать «спасибо» и «пожалуйста», ещё впереди')).toBeTruthy();
    expect(screen.getByLabelText('Приветствия, пройден')).not.toBeDisabled();
    expect(screen.getByLabelText('Знакомство, текущий')).toBeTruthy();
    expect(screen.getByLabelText('Знакомство на улице, сценка, закрыта')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Знакомство, текущий'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/lesson/[id]',
      params: { id: 'a1.hola.l2' },
    });
    await flush();
  });

  it('marks every goal done and the scene ready when the topic is finished', async () => {
    mockParams.id = 'a1.numbers';
    await renderWith(
      <TopicScreen />,
      repository({ readProgress: async () => snapshot(['a1.numbers.l1']) }),
    );

    expect(await screen.findByLabelText('Понять числа от 1 до 10, уже получается')).toBeTruthy();
    expect(screen.getByLabelText('Назвать количество, уже получается')).toBeTruthy();
    expect(screen.getByLabelText('Числа 1–10, пройден')).toBeTruthy();
    expect(screen.getByLabelText('Сколько штук?, сценка')).toBeTruthy();
    expect(screen.queryByText('Сценка · закрыта')).toBeNull();
    await flush();
  });

  it('says when the topic id is unknown without waiting for progress', async () => {
    mockParams.id = 'a1.missing';
    let release: (value: ProgressSnapshot) => void = () => undefined;
    const pending = new Promise<ProgressSnapshot>((resolve) => {
      release = resolve;
    });
    await renderWith(<TopicScreen />, repository({ readProgress: () => pending }));

    expect(screen.getByText('Такой темы нет')).toBeTruthy();
    expect(screen.queryByLabelText('Загружаем темы')).toBeNull();
    await act(async () => {
      release(snapshot());
    });
    await flush();
  });
});
