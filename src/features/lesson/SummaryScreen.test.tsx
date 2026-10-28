import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LessonSummaryScreen from '../../../app/(lesson)/lesson/summary';
import { LearnerProvider } from '@/features/learner/context';
import type { LearnerProfile } from '@/features/learner/profile';
import { useFinishLesson } from '@/features/lesson/hooks/useFinishLesson';
import type { VocabularyItem } from '@/features/lesson/schema';
import { useLessonStore, type LessonExerciseItem } from '@/features/lesson/store';
import { ProgressProvider } from '@/features/progress/ProgressProvider';
import type { ProgressRepository } from '@/features/progress/types';
import { reviewRepository } from '@/features/review/defaultRepository';
import { vocabRepository } from '@/features/vocab/defaultRepository';
import i18n from '@/i18n';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

const EXERCISE: LessonExerciseItem = {
  id: 'e1',
  type: 'select_translation',
  prompt_ru: 'Выберите перевод',
  prompt: 'hola',
  options: ['привет'],
  answer: 'привет',
};

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
}));

jest.mock('lottie-react-native', () => 'LottieView');

jest.mock('@/features/audio/sounds', () => ({
  playUiSound: jest.fn(),
}));

jest.mock('@/features/audio/playback', () => ({
  playLessonAudio: jest.fn(() => Promise.resolve('speech')),
}));

jest.mock('@/hooks/useReduceMotion', () => ({
  useReduceMotion: () => true,
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

jest.mock('@/features/review/defaultRepository', () => ({
  reviewRepository: {
    introduceItems: jest.fn(async () => ({ cards: [], dueCount: 0, pending: 0 })),
  },
}));

const mockVocabMemory = new Map<string, string>();

jest.mock('@/features/vocab/defaultRepository', () => {
  const { createVocabRepository } = jest.requireActual(
    '@/features/vocab/repository',
  ) as typeof import('@/features/vocab/repository');
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

function repository(recordCompletion: jest.Mock): ProgressRepository {
  return {
    readProgress: jest.fn(async () => ({ lessons: [], totalXp: 0, pending: 0 })),
    recordCompletion,
    awardXp: jest.fn(async () => ({ lessons: [], totalXp: 0, pending: 0 })),
    sync: jest.fn(async () => ({ lessons: [], totalXp: 0, pending: 0 })),
    start: jest.fn(() => () => undefined),
    settled: jest.fn(async () => undefined),
  };
}

const HOLA: VocabularyItem = { id: 'hola', es: 'hola', ru: 'привет', pos: 'interjection' };
const ADIOS: VocabularyItem = { id: 'adios', es: 'adiós', ru: 'пока', pos: 'interjection' };

function finishLessonInStore(newItems: VocabularyItem[] = [HOLA]): void {
  useLessonStore.getState().reset();
  useLessonStore.getState().startLesson({
    lessonId: 'a1-u01-l01',
    exercises: [EXERCISE],
    newItems,
    now: () => 1_000,
  });
  useLessonStore.getState().setAnswer('привет');
  useLessonStore.getState().checkAnswer();
  useLessonStore.getState().continueAfterFeedback();
  useLessonStore.getState().finishLesson();
}

/** Same hand-off the lesson screen performs before opening the summary. */
function FinishThenSummary({ screenKey }: { screenKey: number }) {
  const finish = useFinishLesson();

  useEffect(() => {
    void finish();
  }, [finish, screenKey]);

  return <LessonSummaryScreen key={screenKey} />;
}

const ASKED: LearnerProfile = {
  name: 'Анна',
  goal: 'travel',
  dailyMinutes: 10,
  preferencesAsked: true,
  uiLanguage: null,
  spanishVariant: 'spain',
};

function summaryTree(
  recordCompletion: jest.Mock,
  screenKey: number,
  client: QueryClient,
  profile: LearnerProfile = ASKED,
) {
  return (
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 47, left: 0, right: 0, bottom: 34 },
          }}
        >
          <ProgressProvider repository={repository(recordCompletion)}>
            <LearnerProvider
              repository={{
                read: async () => profile,
                save: async () => profile,
              }}
            >
              <FinishThenSummary screenKey={screenKey} />
            </LearnerProvider>
          </ProgressProvider>
        </SafeAreaProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

async function renderSummary(
  recordCompletion: jest.Mock,
  screenKey = 0,
  profile: LearnerProfile = ASKED,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  // Present on the first render, so «Дальше» does not race the profile query.
  client.setQueryData(['learner', 'user-1'], profile);
  const view = await render(summaryTree(recordCompletion, screenKey, client, profile));
  return { client, ...view };
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('LessonSummaryScreen', () => {
  beforeEach(() => {
    jest.mocked(reviewRepository.introduceItems).mockClear();
    mockVocabMemory.clear();
    finishLessonInStore();
  });

  afterEach(async () => {
    await cleanup();
    useLessonStore.getState().reset();
  });

  it('renders the finished lesson without snapshot loop errors', async () => {
    const errors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const recordCompletion = jest.fn().mockResolvedValue({ lessons: [], totalXp: 10, pending: 0 });

    await renderSummary(recordCompletion);
    await flush();

    expect(screen.getByText('Урок пройден!')).toBeOnTheScreen();
    expect(screen.getByText('100%')).toBeOnTheScreen();
    expect(screen.getByText('0:00')).toBeOnTheScreen();
    expect(screen.getByText('1 новая фраза')).toBeOnTheScreen();
    expect(screen.getByText('hola')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'В словник · 1' })).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'hola, привет' })).toBeChecked();

    const check = screen.getByRole('checkbox', { name: 'hola, привет' });
    const checkStyle = StyleSheet.flatten(check.props.style);
    expect(checkStyle).toMatchObject({ width: 44, height: 44 });

    const value = screen.getByText('+10');
    expect(StyleSheet.flatten(value.props.style).lineHeight).toBeGreaterThanOrEqual(48);
    const scroll = screen.getByTestId('lesson-summary-scroll');
    const contentStyle = StyleSheet.flatten(scroll.props.contentContainerStyle);
    expect(contentStyle.paddingTop).toBeGreaterThanOrEqual(47);

    const logged = errors.mock.calls.map((args) => args.map(String).join(' '));
    expect(logged.filter((line) => /getSnapshot|Maximum update depth/i.test(line))).toEqual([]);
    expect(logged.filter((line) => !line.includes('not wrapped in act'))).toEqual([]);
    errors.mockRestore();
  });

  it('records the lesson once when the summary rerenders or is focused again', async () => {
    const recordCompletion = jest.fn().mockResolvedValue({ lessons: [], totalXp: 10, pending: 0 });
    const view = await renderSummary(recordCompletion, 0);
    await flush();

    expect(screen.getByText('Урок пройден!')).toBeOnTheScreen();
    await flush();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(recordCompletion).toHaveBeenCalledWith('user-1', {
      lessonId: 'a1-u01-l01',
      accuracy: 100,
      xp: 10,
    });
    expect(reviewRepository.introduceItems).toHaveBeenCalledTimes(1);
    expect(reviewRepository.introduceItems).toHaveBeenCalledWith('user-1', [
      { id: 'hola', es: 'hola', ru: 'привет', pos: 'interjection' },
    ]);

    await view.rerender(summaryTree(recordCompletion, 1, view.client));

    expect(screen.getByText('Урок пройден!')).toBeOnTheScreen();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(reviewRepository.introduceItems).toHaveBeenCalledTimes(1);
  });

  it('saves every phrase from the lesson into favorites', async () => {
    const recordCompletion = jest.fn().mockResolvedValue({ lessons: [], totalXp: 10, pending: 0 });

    await renderSummary(recordCompletion);
    await flush();

    await fireEvent.press(screen.getByRole('button', { name: 'В словник · 1' }));
    expect(await screen.findByTestId('bottom-sheet')).toBeOnTheScreen();
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Добавить в «Избранное»' }));
    await fireEvent.press(screen.getByText('Готово'));

    expect(await screen.findByText('1 фраза добавлена в «Избранное»')).toBeOnTheScreen();
    expect(await folderItemIds('Избранное')).toEqual(['hola']);
    expect(screen.getByRole('button', { name: 'В словник · 1' })).toBeOnTheScreen();
  });

  it('shows the summary when saving the result fails', async () => {
    const recordCompletion = jest.fn().mockRejectedValue(new Error('disk'));

    await renderSummary(recordCompletion);
    await flush();

    expect(screen.getByText('Урок пройден!')).toBeOnTheScreen();
    expect(screen.getByText('100%')).toBeOnTheScreen();
    await flush();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(reviewRepository.introduceItems).toHaveBeenCalledTimes(1);
  });

  it('opens goal and minutes after the first lesson of day 1', async () => {
    useLessonStore.getState().reset();
    useLessonStore.getState().startLesson({
      lessonId: 'a1.hola.l1',
      exercises: [EXERCISE],
      newItems: [],
      now: () => 1_000,
    });
    useLessonStore.getState().setAnswer('привет');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();
    useLessonStore.getState().finishLesson();
    mockReplace.mockClear();

    const recordCompletion = jest.fn().mockResolvedValue({ lessons: [], totalXp: 10, pending: 0 });
    const view = await renderSummary(recordCompletion, 0, {
      name: 'Анна',
      goal: null,
      dailyMinutes: 10,
      preferencesAsked: false,
      uiLanguage: null,
      spanishVariant: 'spain',
    });
    await waitFor(() => {
      expect(view.client.getQueryData(['learner', 'user-1'])).toMatchObject({
        name: 'Анна',
        preferencesAsked: false,
      });
    });

    await fireEvent.press(screen.getByText('Дальше'));
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/preferences');
  });

  it('selects, clears, and selects every phrase again', async () => {
    finishLessonInStore([HOLA, ADIOS]);
    const recordCompletion = jest.fn().mockResolvedValue({ lessons: [], totalXp: 10, pending: 0 });

    await renderSummary(recordCompletion);
    await flush();

    expect(screen.getByRole('button', { name: 'В словник · 2' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'hola, привет' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'adiós, пока' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Снять все' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('checkbox', { name: 'adiós, пока' }));

    expect(screen.getByRole('checkbox', { name: 'adiós, пока' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'В словник · 1' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Выбрать все' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Выбрать все' }));

    expect(screen.getByRole('checkbox', { name: 'adiós, пока' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'В словник · 2' })).toBeEnabled();

    await fireEvent.press(screen.getByRole('button', { name: 'Снять все' }));

    expect(screen.getByRole('checkbox', { name: 'hola, привет' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'В словник · 0' })).toBeDisabled();
  });

  it('adds only the phrases that are selected', async () => {
    finishLessonInStore([HOLA, ADIOS]);
    const recordCompletion = jest.fn().mockResolvedValue({ lessons: [], totalXp: 10, pending: 0 });

    await renderSummary(recordCompletion);
    await flush();

    await fireEvent.press(screen.getByRole('checkbox', { name: 'adiós, пока' }));
    await fireEvent.press(screen.getByRole('button', { name: 'В словник · 1' }));
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Добавить в «Избранное»' }));
    await fireEvent.press(screen.getByText('Готово'));

    expect(await screen.findByText('1 фраза добавлена в «Избранное»')).toBeOnTheScreen();
    expect(await folderItemIds('Избранное')).toEqual(['hola']);
  });

  it('adds only the phrase that was long-pressed', async () => {
    finishLessonInStore([HOLA, ADIOS]);
    const recordCompletion = jest.fn().mockResolvedValue({ lessons: [], totalXp: 10, pending: 0 });

    await renderSummary(recordCompletion);
    await flush();

    fireEvent(screen.getByRole('button', { name: 'adiós, пока' }), 'longPress');
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Добавить в «Избранное»' }));
    await fireEvent.press(screen.getByText('Готово'));

    expect(await screen.findByText('1 фраза добавлена в «Избранное»')).toBeOnTheScreen();
    expect(await folderItemIds('Избранное')).toEqual(['adios']);
  });

  it('does not duplicate phrases that are already in the folder', async () => {
    const recordCompletion = jest.fn().mockResolvedValue({ lessons: [], totalXp: 10, pending: 0 });

    await renderSummary(recordCompletion);
    await flush();

    await fireEvent.press(screen.getByRole('button', { name: 'В словник · 1' }));
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Добавить в «Избранное»' }));
    await fireEvent.press(screen.getByText('Готово'));
    expect(await screen.findByText('1 фраза добавлена в «Избранное»')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'В словник · 1' }));
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Уже в папке «Избранное»' })).toBeChecked();
    });
    await fireEvent.press(screen.getByText('Готово'));
    await waitFor(() => {
      expect(screen.queryByText('Добавить в словник')).toBeNull();
    });

    expect(await folderItemIds('Избранное')).toEqual(['hola']);
  });

  it('creates a folder from the sheet and saves the selected phrases there', async () => {
    const recordCompletion = jest.fn().mockResolvedValue({ lessons: [], totalXp: 10, pending: 0 });

    await renderSummary(recordCompletion);
    await flush();

    await fireEvent.press(screen.getByRole('button', { name: 'В словник · 1' }));
    await fireEvent.press(await screen.findByRole('button', { name: '+ Новая папка' }));
    await fireEvent.changeText(screen.getByLabelText('Название'), 'Поездка');
    await fireEvent.press(screen.getByRole('button', { name: 'Готово' }));

    expect(await screen.findByText('1 фраза добавлена в «Поездка»')).toBeOnTheScreen();
    expect(await folderItemIds('Поездка')).toEqual(['hola']);
    expect(await folderItemIds('Избранное')).toEqual([]);
  });
});

async function folderItemIds(name: string): Promise<string[]> {
  const snapshot = await vocabRepository.read('user-1');
  const folder = snapshot.folders.find(
    (entry) => entry.name === name || (name === 'Избранное' && entry.systemKey === 'favorites'),
  );
  if (!folder) return [];
  return snapshot.items
    .filter((item) => item.folderId === folder.id)
    .map((item) => item.itemId)
    .sort();
}
