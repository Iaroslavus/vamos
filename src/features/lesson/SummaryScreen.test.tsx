import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LessonSummaryScreen from '../../../app/(lesson)/lesson/summary';
import { useFinishLesson } from '@/features/lesson/hooks/useFinishLesson';
import { useLessonStore, type LessonExerciseItem } from '@/features/lesson/store';
import { ProgressProvider } from '@/features/progress/ProgressProvider';
import type { ProgressRepository } from '@/features/progress/types';
import { reviewRepository } from '@/features/review/defaultRepository';
import { useFavoritesStore } from '@/features/vocab/favoritesStore';
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

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
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

function finishLessonInStore(): void {
  useLessonStore.getState().reset();
  useLessonStore.getState().startLesson({
    lessonId: 'a1-u01-l01',
    exercises: [EXERCISE],
    newItems: [{ id: 'hola', es: 'hola', ru: 'привет', pos: 'interjection' }],
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

function summaryTree(recordCompletion: jest.Mock, screenKey: number, client: QueryClient) {
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
            <FinishThenSummary screenKey={screenKey} />
          </ProgressProvider>
        </SafeAreaProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

async function renderSummary(recordCompletion: jest.Mock, screenKey = 0) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const view = await render(summaryTree(recordCompletion, screenKey, client));
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
    useFavoritesStore.setState({ itemIds: [] });
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
    expect(screen.getByText('В словник')).toBeOnTheScreen();

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

  it('saves every phrase from the lesson into the vocabulary list', async () => {
    const recordCompletion = jest.fn().mockResolvedValue({ lessons: [], totalXp: 10, pending: 0 });

    await renderSummary(recordCompletion);
    await flush();

    await fireEvent.press(screen.getByText('В словник'));

    expect(useFavoritesStore.getState().itemIds).toEqual(['hola']);
    expect(screen.getByText('В избранном')).toBeOnTheScreen();
    expect(screen.queryByText('В словник')).toBeNull();
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
});
