import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

import { play } from '@/features/audio/playback';
import type { StoredCard } from '@/features/review/types';
import i18n from '@/i18n';

import { reviewRepository } from '@/features/review/defaultRepository';

import { FolderScreen } from './FolderScreen';
import { vocabRepository } from './defaultRepository';
import { VocabScreen } from './VocabScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockParams: { id?: string } = {};
const mockVocabMemory = new Map<string, string>();

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@/hooks/useReduceMotion', () => ({
  useReduceMotion: () => true,
}));

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react') as typeof import('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native') as typeof import('react-native');
  return {
    useRouter: () => ({ push: mockPush, back: mockBack, canGoBack: () => true }),
    useLocalSearchParams: () => mockParams,
    Stack: {
      Screen: ({
        options,
      }: {
        options?: { title?: string; headerRight?: () => React.ReactNode };
      }) =>
        React.createElement(
          React.Fragment,
          null,
          options?.title ? React.createElement(Text, null, options.title) : null,
          options?.headerRight ? options.headerRight() : null,
        ),
    },
  };
});

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
        deleteFolder: async () => undefined,
      },
      schedule: () => () => undefined,
    }),
  };
});

function mockDueCard(itemId: string, direction: StoredCard['direction'] = 'es_to_ru'): StoredCard {
  return {
    id: `${itemId}:${direction}`,
    itemId,
    direction,
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

function resetReview(cards: StoredCard[] = [mockDueCard('hola.hola')]) {
  jest.mocked(reviewRepository.read).mockReset();
  jest.mocked(reviewRepository.read).mockResolvedValue({
    cards,
    logs: [],
    dueCount: cards.length,
    pending: 0,
  });
}

async function seedFavorites(itemIds: readonly string[]) {
  const seeded = await vocabRepository.syncDerived('user-1', {
    topics: [],
    difficultItemIds: [],
  });
  const favorites = seeded.folders.find((folder) => folder.systemKey === 'favorites');
  await vocabRepository.addItems('user-1', favorites?.id ?? '', itemIds);
}

describe('VocabScreen', () => {
  jest.setTimeout(20_000);

  beforeEach(() => {
    mockVocabMemory.clear();
    mockPush.mockClear();
    mockParams.id = undefined;
    resetReview();
  });

  it('lists the learned count, the wait, and a new custom folder', async () => {
    await renderVocab();

    expect(await screen.findByText('Изучено 1 слово')).toBeTruthy();
    expect(screen.getByText('1 ждёт повторения · ~1 минута')).toBeTruthy();
    expect(screen.getByText('Повторить всё')).toBeTruthy();
    expect(screen.getByText('Избранное')).toBeTruthy();
    expect(screen.getByText('0 слов · 0 к повторению')).toBeTruthy();
    expect(screen.getByText('Сложные')).toBeTruthy();
    expect(screen.getByText('Здесь появятся слова, в которых вы часто ошибаетесь')).toBeTruthy();
    expect(screen.queryByText(/единиц/)).toBeNull();

    await user.press(screen.getByText('Повторить всё'));
    expect(mockPush).toHaveBeenCalledWith('/review');

    await user.press(screen.getByText('+ Новая папка'));
    await user.type(screen.getByLabelText('Название'), 'Для переезда');
    await user.press(screen.getByText('Создать'));

    expect(await screen.findByText('Для переезда')).toBeTruthy();
  });

  it('counts one word when both card directions are due', async () => {
    resetReview([mockDueCard('hola.hola', 'es_to_ru'), mockDueCard('hola.hola', 'ru_to_es')]);
    await renderVocab();

    expect(await screen.findByText('Изучено 1 слово')).toBeTruthy();
    expect(screen.getByText('1 ждёт повторения · ~1 минута')).toBeTruthy();
    expect(screen.queryByText('2 ждут повторения · ~1 минута')).toBeNull();
  });

  it('says everything is reviewed and disables the button when nothing is due', async () => {
    const later = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    resetReview([{ ...mockDueCard('hola.hola'), due: later }]);
    await renderVocab();

    expect(await screen.findByText('Изучено 1 слово')).toBeTruthy();
    expect(screen.getByText('Всё повторено, следующее — через 10 минут')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Повторить всё' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('calls a phrase folder phrases', async () => {
    await seedFavorites(['hola.buenos_dias']);
    await renderVocab();
    expect(await screen.findByText('1 фраза · 0 к повторению')).toBeTruthy();
  });

  it('uses the general word when a folder mixes words and phrases', async () => {
    await seedFavorites(['hola.hola', 'hola.buenos_dias']);
    await renderVocab();
    expect(await screen.findByText('2 слова · 1 к повторению')).toBeTruthy();
  });

  it('counts a folder phrase once when both directions are due', async () => {
    resetReview([
      mockDueCard('hola.buenos_dias', 'es_to_ru'),
      mockDueCard('hola.buenos_dias', 'ru_to_es'),
    ]);
    await seedFavorites(['hola.buenos_dias']);
    await renderVocab();

    expect(await screen.findByText('Изучено 1 слово')).toBeTruthy();
    expect(screen.getByText('1 ждёт повторения · ~1 минута')).toBeTruthy();
    expect(screen.getByText('1 фраза · 1 к повторению')).toBeTruthy();
    expect(screen.queryByText('1 фраза · 2 к повторению')).toBeNull();
  });
});

describe('FolderScreen', () => {
  jest.setTimeout(20_000);

  beforeEach(() => {
    mockVocabMemory.clear();
    mockParams.id = undefined;
    mockBack.mockClear();
    jest.mocked(play).mockClear();
    resetReview();
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

    expect(await screen.findByText('Hola')).toBeTruthy();
    expect(screen.getByText('Привет')).toBeTruthy();

    expect(screen.queryByRole('button', { name: 'Удалить Hola' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Перенести Hola' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Слушать Hola' }));
    expect(play).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'hola.hola', es: 'hola' }),
      'normal',
      'es',
    );

    fireEvent(screen.getByLabelText('Hola, Привет'), 'longPress');
    await fireEvent.press(await screen.findByRole('button', { name: 'Удалить Hola' }));
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
    expect(StyleSheet.flatten(screen.getByTestId('mastery-new').props.style).backgroundColor).toBe(
      colors.inkDisabled,
    );
    expect(
      StyleSheet.flatten(screen.getByTestId('mastery-learning').props.style).backgroundColor,
    ).toBe(colors.saffron);
    expect(
      StyleSheet.flatten(screen.getByTestId('mastery-known').props.style).backgroundColor,
    ).toBe(colors.teal);
    expect(screen.queryByText(/Повторить ·/)).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Учить' })).toHaveLength(1);
    expect(StyleSheet.flatten(screen.getByTestId('folder-study').props.style).gap).toBe(space.xxl);
    expect(StyleSheet.flatten(screen.getByTestId('folder-phrases').props.style).marginTop).toBe(
      space.xxl,
    );

    await user.press(screen.getByText('Учить'));
    expect(await screen.findByText('Как учить')).toBeTruthy();
    expect(screen.queryByText('скоро')).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId('study-mode-learn').props.accessibilityState).toEqual(
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
    expect(screen.getByText('1 к повторению')).toBeTruthy();
    expect(screen.queryByText('Контрольная')).toBeNull();
    expect(screen.queryByTestId('study-mode-match')).toBeNull();
    expect(screen.queryByTestId('study-mode-spell')).toBeNull();
    await user.press(screen.getByTestId('study-mode-learn'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/study',
      params: { folder: favorites?.id, mode: 'learn' },
    });
  });

  it('searches in Spanish and in the translation, and adds a phrase only once', async () => {
    const created = await vocabRepository.createFolder('user-1', {
      name: 'Поездка',
      color: 'coral',
    });
    const folder = created.folders.find((entry) => entry.kind === 'custom');
    mockParams.id = folder?.id;

    await renderFolder();

    expect(await screen.findByRole('button', { name: '+ Добавить слова' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Учить' })).toBeNull();

    await user.press(screen.getByRole('button', { name: '+ Добавить слова' }));
    fireEvent.changeText(await screen.findByLabelText('Поиск фразы'), 'dias');
    expect(await screen.findByText('Buenos días')).toBeTruthy();
    expect(screen.getByText('Доброе утро')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Поиск фразы'), 'привет');
    await user.press(await screen.findByRole('button', { name: 'Добавить Hola' }));
    expect(await screen.findByTestId('phrase-check-hola.hola')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Убрать Hola' })).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Убрать Hola' }));
    expect(await screen.findByRole('button', { name: 'Добавить Hola' })).toBeTruthy();
    expect(screen.queryByTestId('phrase-check-hola.hola')).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Добавить Hola' }));
    expect(await screen.findByTestId('phrase-check-hola.hola')).toBeTruthy();
    expect(screen.getAllByTestId('phrase-check-hola.hola')).toHaveLength(1);

    const speakers = screen.getAllByRole('button', { name: 'Слушать Hola' });
    const speaker = speakers[0];
    if (!speaker) throw new Error('missing speaker');
    await fireEvent.press(speaker);
    expect(play).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'hola.hola', es: 'hola' }),
      'normal',
      'es',
    );

    await user.press(screen.getByRole('button', { name: 'Закрыть' }));
    expect(screen.getAllByText('Hola')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '+ Добавить слова' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Учить' })).toBeTruthy();

    await user.press(screen.getByRole('button', { name: '+ Добавить слова' }));
    await user.press(await screen.findByRole('button', { name: 'Добавить своё слово' }));
    expect(await screen.findByText('скоро')).toBeTruthy();
  });

  it('hides the folder menu on favorites, tricky words, and topic folders', async () => {
    const seeded = await vocabRepository.syncDerived('user-1', {
      topics: [{ topicId: 'a1.hola', name: 'Приветствия', itemIds: ['hola.hola'] }],
      difficultItemIds: ['hola.hola'],
    });

    for (const folder of seeded.folders) {
      mockParams.id = folder.id;
      await renderFolder();
      expect(await screen.findByText('Освоение папки')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Действия с папкой' })).toBeNull();
      expect(screen.queryByText('Изменить папку')).toBeNull();
      await cleanup();
    }
  });

  it('renames and deletes a custom folder from the overflow menu', async () => {
    const created = await vocabRepository.createFolder('user-1', {
      name: 'Поездка',
      color: 'coral',
    });
    const folder = created.folders.find((entry) => entry.kind === 'custom');
    mockParams.id = folder?.id;

    await renderFolder();
    expect(await screen.findByText('Поездка')).toBeTruthy();
    expect(screen.queryByText('Изменить папку')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Учить' })).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Действия с папкой' }));
    await user.press(await screen.findByRole('button', { name: 'Редактировать папку' }));
    fireEvent.changeText(await screen.findByLabelText('Название'), 'Дорога');
    await user.press(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByText('Дорога')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Действия с папкой' }));
    await user.press(await screen.findByRole('button', { name: 'Удалить папку' }));
    expect(await screen.findByText('Удалить папку?')).toBeTruthy();
    expect(
      screen.getByText('«Дорога» исчезнет из словника. Фразы в курсе останутся.'),
    ).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });
});
