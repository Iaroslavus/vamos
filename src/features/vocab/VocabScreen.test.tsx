import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { play } from '@/features/audio/playback';
import type { StoredCard } from '@/features/review/types';
import i18n from '@/i18n';

import { FolderScreen } from './FolderScreen';
import { vocabRepository } from './defaultRepository';
import { VocabScreen } from './VocabScreen';

const mockPush = jest.fn();
const mockParams: { id?: string } = {};
const mockVocabMemory = new Map<string, string>();

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@/hooks/useReduceMotion', () => ({
  useReduceMotion: () => true,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  Stack: { Screen: () => null },
}));

jest.mock('@/features/auth/useSession', () => ({
  useSession: () => ({
    status: 'ready',
    session: { user: { id: 'user-1', is_anonymous: true } },
  }),
}));

jest.mock('@/features/progress/useProgress', () => ({
  useProgress: () => ({
    isSuccess: true,
    isPending: false,
    isError: false,
    data: { lessons: [], totalXp: 0, pending: 0 },
  }),
}));

jest.mock('@/features/audio/playback', () => ({
  play: jest.fn(() => Promise.resolve('file')),
}));

jest.mock('@/features/review/defaultRepository', () => ({
  reviewRepository: {
    read: jest.fn(async () => ({
      cards: [mockDueCard('hola.hola')],
      logs: [],
      dueCount: 1,
      pending: 0,
    })),
  },
}));

jest.mock('./defaultRepository', () => {
  const { createVocabRepository } = jest.requireActual(
    './repository',
  ) as typeof import('./repository');
  return {
    vocabRepository: createVocabRepository({
      storage: {
        getItem: async (key: string) => mockVocabMemory.get(key) ?? null,
        setItem: async (key: string, value: string) => {
          mockVocabMemory.set(key, value);
        },
        removeItem: async (key: string) => {
          mockVocabMemory.delete(key);
        },
      },
      network: {
        isOnline: async () => false,
        subscribe: () => () => undefined,
      },
      remote: {
        fetchFolders: async () => [],
        fetchItems: async () => [],
        upsertFolder: async (_userId: string, folder: never) => folder,
        insertItem: async () => undefined,
        deleteItem: async () => undefined,
      },
      schedule: () => () => undefined,
    }),
  };
});

function mockDueCard(itemId: string): StoredCard {
  return {
    id: itemId,
    itemId,
    direction: 'es_to_ru',
    due: '2020-01-01T00:00:00.000Z',
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

const safeArea = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderVocab() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <SafeAreaProvider initialMetrics={safeArea}>
          <VocabScreen />
        </SafeAreaProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

function renderFolder() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <SafeAreaProvider initialMetrics={safeArea}>
          <FolderScreen />
        </SafeAreaProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

const user = userEvent.setup();

describe('VocabScreen', () => {
  beforeEach(() => {
    mockVocabMemory.clear();
    mockPush.mockClear();
    mockParams.id = undefined;
  });

  it('lists the system folders, the due count, and a new custom folder', async () => {
    await renderVocab();

    expect(await screen.findByText('Повторить всё · 1 к повторению')).toBeTruthy();
    expect(screen.getByText('Избранное')).toBeTruthy();
    expect(screen.getByText('Сложные')).toBeTruthy();

    await user.press(screen.getByText('+ Новая папка'));
    await user.type(screen.getByLabelText('Название'), 'Для переезда');
    await user.press(screen.getByText('Создать'));

    expect(await screen.findByText('Для переезда')).toBeTruthy();
  });
});

describe('FolderScreen', () => {
  beforeEach(() => {
    mockVocabMemory.clear();
    mockParams.id = undefined;
    jest.mocked(play).mockClear();
  });

  it('plays a saved word and removes it from the folder', async () => {
    const seeded = await vocabRepository.syncDerived('user-1', {
      topics: [],
      difficultItemIds: [],
    });
    const favorites = seeded.folders.find((folder) => folder.systemKey === 'favorites');
    await vocabRepository.addItems('user-1', favorites?.id ?? '', ['hola.hola']);
    mockParams.id = favorites?.id;

    await renderFolder();

    expect(await screen.findByText('hola')).toBeTruthy();
    expect(screen.getByText('привет')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Слушать hola' }));
    expect(play).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'hola.hola', es: 'hola' }),
      'normal',
      'es',
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Убрать hola' }));
    expect(
      await screen.findByText('В этой папке пока пусто. Добавьте фразу с карточки или из диалога.'),
    ).toBeTruthy();
  });

  it('opens study modes, keeps the last settings, and marks unfinished modes', async () => {
    const seeded = await vocabRepository.syncDerived('user-1', {
      topics: [],
      difficultItemIds: [],
    });
    const favorites = seeded.folders.find((folder) => folder.systemKey === 'favorites');
    await vocabRepository.addItems('user-1', favorites?.id ?? '', ['hola.hola']);
    mockParams.id = favorites?.id;

    await renderFolder();
    expect(await screen.findByLabelText('1 новые, 0 учу, 0 знаю')).toBeTruthy();

    await user.press(screen.getByText('Учить'));
    expect(await screen.findByText('Как учить')).toBeTruthy();
    expect(screen.queryByText('скоро')).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId('study-mode-review').props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: false }),
      );
    });
    expect(screen.getByTestId('study-mode-flashcards').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false }),
    );
    expect(screen.getByTestId('study-mode-test').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false }),
    );

    await user.press(screen.getByLabelText('Настройки сессии'));
    expect(screen.getByText('Направление')).toBeTruthy();
    expect(screen.getByText('Автоозвучка')).toBeTruthy();

    await user.press(screen.getByLabelText('Назад'));
    await user.press(screen.getByTestId('study-mode-review'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/study',
      params: { folder: favorites?.id, mode: 'review' },
    });
  });
});
