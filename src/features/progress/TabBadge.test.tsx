import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import { Pressable } from 'react-native';

import TabLayout from '../../../app/(tabs)/_layout';
import { useFinishLesson } from '@/features/lesson/hooks/useFinishLesson';
import { useLessonStore, type LessonExerciseItem } from '@/features/lesson/store';
import { ProgressProvider } from '@/features/progress/ProgressProvider';
import type { ProgressRepository } from '@/features/progress/types';
import { reviewStorageKey } from '@/features/review/repository';
import i18n from '@/i18n';

const EXERCISE: LessonExerciseItem = {
  id: 'e1',
  type: 'select_translation',
  prompt_ru: 'Выберите перевод',
  prompt: 'hola',
  options: ['привет'],
  answer: 'привет',
};

jest.mock('expo-router', () => {
  // jest.mock is hoisted above imports, so the factory loads these itself.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require('react-native');

  function Screen({
    name,
    options,
  }: {
    name: string;
    options?: {
      title?: string;
      href?: string | null;
      tabBarBadge?: number;
      tabBarAccessibilityLabel?: string;
    };
  }) {
    if (options?.href === null) return null;
    const badge = options?.tabBarBadge;
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, options?.title ?? name),
      badge != null ? React.createElement(Text, null, `badge:${badge}`) : null,
      options?.tabBarAccessibilityLabel
        ? React.createElement(Text, null, `a11y:${options.tabBarAccessibilityLabel}`)
        : null,
    );
  }

  function Tabs({ children }: { children: React.ReactNode }) {
    return React.createElement(View, null, children);
  }

  Tabs.Screen = Screen;
  return { Tabs };
});

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
    awardXp: jest.fn(async () => ({ lessons: [], totalXp: 0, pending: 0 })),
    sync: jest.fn(async () => ({ lessons: [], totalXp: 0, pending: 0 })),
    start: jest.fn(() => () => undefined),
    settled: jest.fn(async () => undefined),
  };
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

function FinishLesson() {
  const finish = useFinishLesson();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="finish-lesson"
      onPress={() => finish()}
    />
  );
}

function renderTabs(withFinish = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <ProgressProvider repository={repository()}>
          <TabLayout />
          {withFinish ? <FinishLesson /> : null}
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

describe('progress tab badge', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useLessonStore.getState().reset();
  });

  afterEach(async () => {
    useLessonStore.getState().reset();
    await flush();
  });

  it('hides the badge when nothing is due', async () => {
    await renderTabs();

    expect(await screen.findByText('Сегодня')).toBeTruthy();
    expect(screen.getByText('Темы')).toBeTruthy();
    expect(screen.getByText('Словник')).toBeTruthy();
    expect(screen.getByText('Профиль')).toBeTruthy();
    expect(screen.queryByText('Диалог')).toBeNull();
    expect(screen.queryByText('Прогресс')).toBeNull();
    await flush();
    expect(screen.queryByText(/^badge:/)).toBeNull();
    expect(screen.getByText('a11y:Сегодня')).toBeTruthy();
  });

  it('shows the due count on the progress tab', async () => {
    const cards = {
      'hola:es_to_ru': dueCard('hola'),
      'gracias:es_to_ru': dueCard('gracias'),
    };
    await AsyncStorage.setItem(
      reviewStorageKey('user-1'),
      JSON.stringify({ version: 1, cards, logs: [], outbox: [] }),
    );
    await renderTabs();

    expect(await screen.findByText('badge:2')).toBeTruthy();
    expect(screen.getByText('a11y:Сегодня, повторить: 2')).toBeTruthy();
    await flush();
  });

  it('updates the badge after a lesson introduces a word', async () => {
    prepareLesson();
    await renderTabs(true);

    expect(await screen.findByText('a11y:Сегодня')).toBeTruthy();
    expect(screen.queryByText(/^badge:/)).toBeNull();

    await fireEvent.press(screen.getByLabelText('finish-lesson'));

    expect(await screen.findByText('badge:1')).toBeTruthy();
    expect(screen.getByText('a11y:Сегодня, повторить: 1')).toBeTruthy();
    await flush();
  });
});
