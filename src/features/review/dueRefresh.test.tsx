import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import { Pressable } from 'react-native';

import { Text } from '@/components/Text';
import { ReviewPrompt } from '@/features/home/ReviewPrompt';
import { useFinishLesson } from '@/features/lesson/hooks/useFinishLesson';
import { useLessonStore, type LessonExerciseItem } from '@/features/lesson/store';
import { ProgressProvider } from '@/features/progress/ProgressProvider';
import { deviceTimeZone } from '@/features/progress/study';
import type { ProgressRepository } from '@/features/progress/types';
import { reviewRepository } from '@/features/review/defaultRepository';
import { reviewAgenda } from '@/features/review/forecast';
import { useReviewAgenda } from '@/features/review/hooks/useReviewDueCount';
import { useReviewSession } from '@/features/review/hooks/useReviewSession';
import i18n from '@/i18n';

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
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
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

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: async () => ({ isConnected: false, isInternetReachable: false }),
    addEventListener: () => () => undefined,
  },
}));

function repository(): ProgressRepository {
  return {
    readProgress: jest.fn(async () => ({ lessons: [], totalXp: 0, pending: 0 })),
    recordCompletion: jest.fn(async () => ({ lessons: [], totalXp: 10, pending: 0 })),
    awardXp: jest.fn(async () => ({ lessons: [], totalXp: 5, pending: 0 })),
    sync: jest.fn(async () => ({ lessons: [], totalXp: 0, pending: 0 })),
    start: jest.fn(() => () => undefined),
    settled: jest.fn(async () => undefined),
  };
}

function AgendaProbe() {
  const { dueCount, forecast } = useReviewAgenda();
  const session = useReviewSession();
  const finish = useFinishLesson();
  const counts = forecast.map((day) => day.count).join(',');

  return (
    <>
      <Text>{`agenda:${dueCount}|${counts}`}</Text>
      <ReviewPrompt count={dueCount} onPress={() => undefined} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="finish-lesson"
        onPress={() => finish()}
      />
      {session.phase.status === 'choose' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="start-cards"
          onPress={() => session.begin('cards')}
        />
      ) : null}
      {session.phase.status === 'study' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="rate-again"
          onPress={() => session.rate('again')}
        />
      ) : null}
    </>
  );
}

function renderProbe() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <ProgressProvider repository={repository()}>
          <AgendaProbe />
        </ProgressProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

function prepareLesson(): void {
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
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('review counters refresh', () => {
  beforeEach(async () => {
    useLessonStore.getState().reset();
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    useLessonStore.getState().reset();
    await flush();
  });

  it('shows the new word on the home card and in today after a lesson', async () => {
    prepareLesson();
    await renderProbe();

    expect(await screen.findByText(/^agenda:0\|/)).toBeTruthy();
    expect(screen.queryByText(/повторения/)).toBeNull();

    await fireEvent.press(screen.getByLabelText('finish-lesson'));

    expect(await screen.findByText('1 слово ждёт повторения')).toBeTruthy();
    expect(screen.getByText(/^agenda:1\|1,/)).toBeTruthy();
  });

  it('drops the due count after the review session rates the card', async () => {
    await reviewRepository.introduceItems('user-1', [{ id: 'hola' }]);
    await renderProbe();

    expect(await screen.findByText('1 слово ждёт повторения')).toBeTruthy();
    await fireEvent.press(await screen.findByLabelText('start-cards'));
    await fireEvent.press(await screen.findByLabelText('rate-again'));

    const snapshot = await reviewRepository.read('user-1');
    const agenda = reviewAgenda({
      cards: snapshot.cards,
      logs: snapshot.logs,
      now: new Date(),
      timeZone: deviceTimeZone(),
    });
    expect(agenda.dueCount).toBe(0);

    const label = `agenda:${agenda.dueCount}|${agenda.forecast.map((day) => day.count).join(',')}`;
    expect(await screen.findByText(label)).toBeTruthy();
    expect(screen.queryByText(/повторения/)).toBeNull();
  });
});
