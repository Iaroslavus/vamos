import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LessonScreen from '../../../app/(lesson)/lesson/[id]';
import { playLessonAudio } from '@/features/audio/playback';
import { getLesson } from '@/features/content/loader';
import type { DialogStep, LessonStep } from '@/features/lesson/generator';
import { loadLessonSession, type LoadedLesson } from '@/features/lesson/session';
import { DEFAULT_MAX_HEARTS, useLessonStore } from '@/features/lesson/store';
import { ProgressProvider } from '@/features/progress/ProgressProvider';
import type { ProgressRepository } from '@/features/progress/types';
import { reviewRepository } from '@/features/review/defaultRepository';
import i18n from '@/i18n';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
  useLocalSearchParams: () => ({ id: 'a1.hola.l1' }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('@/features/audio/playback', () => ({
  NORMAL_RATE: 1,
  SLOW_RATE: 0.7,
  playLessonAudio: jest.fn(() => Promise.resolve('speech')),
  stopLessonAudio: jest.fn(),
}));

jest.mock('@/features/audio/sounds', () => ({
  playGradeSound: jest.fn(),
  playUiSound: jest.fn(),
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
    recordRating: jest.fn(async () => undefined),
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

function renderLesson(recordCompletion: ProgressRepository['recordCompletion']) {
  const repo = repository();
  repo.recordCompletion = recordCompletion;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 47, left: 0, right: 0, bottom: 34 },
          }}
        >
          <ProgressProvider repository={repo}>
            <LessonScreen />
          </ProgressProvider>
        </SafeAreaProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

const user = userEvent.setup();

function pressableHost(node: ReactTestInstance): ReactTestInstance | null {
  let current: ReactTestInstance | null = node;
  while (current) {
    if (typeof (current.props as { onPress?: unknown }).onPress === 'function') return current;
    current = current.parent;
  }
  return null;
}

async function press(label: string): Promise<void> {
  const node = await screen.findByText(label);
  const host = pressableHost(node);
  if (host) {
    await fireEvent.press(host);
    return;
  }
  await user.press(node);
}

async function answerExercise(step: LessonStep): Promise<void> {
  if (step.type === 'match_pairs') {
    for (const pair of step.pairs) {
      await press(pair.left);
      await press(pair.right);
    }
    return;
  }
  if (step.type === 'build_sentence') {
    for (const token of step.answer.split(' ')) await press(token);
    return;
  }
  if (step.type === 'type_translation') {
    await fireEvent.changeText(await screen.findByLabelText('Введите ответ'), step.answer);
    return;
  }
  if (step.type === 'fill_gap') {
    await fireEvent.changeText(await screen.findByLabelText('Вставьте слово'), step.answer);
    return;
  }
  if (step.type === 'select_translation' || step.type === 'listen_select') {
    await press(step.answer);
  }
}

const playedCues = new WeakSet<object>();

async function finishLatestCue(): Promise<boolean> {
  const calls = (playLessonAudio as jest.Mock).mock.calls;
  for (let index = calls.length - 1; index >= 0; index -= 1) {
    const input = calls[index]?.[0] as { onEnd?: () => void } | undefined;
    if (!input?.onEnd || playedCues.has(input)) continue;
    playedCues.add(input);
    await act(async () => {
      input.onEnd?.();
    });
    return true;
  }
  return false;
}

function visibleText(): string {
  const texts: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      texts.push(node);
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    walk((node as { children?: unknown }).children);
  };
  walk(screen.toJSON());
  return texts.join(' | ');
}

function visibleDialogChoice(step: DialogStep, session: LoadedLesson): string | null {
  const recorded = useLessonStore.getState().dialogLineKeys;
  for (let index = 0; index < step.lines.length; index += 1) {
    const line = step.lines[index];
    if (!line || line.who !== 'user') continue;
    if (recorded.includes(`${step.id}:${index}`)) continue;
    const target = session.items.find((item) => item.id === line.target);
    if (!target) continue;
    if (screen.queryByText(target.es)) return target.es;
  }
  return null;
}

async function playDialog(
  step: DialogStep,
  session: LoadedLesson,
  scriptIndex: number,
): Promise<void> {
  for (let turn = 0; turn < 40; turn += 1) {
    const state = useLessonStore.getState();
    if (state.scriptIndex !== scriptIndex || state.status !== 'active') return;
    if (screen.queryByText('Дальше')) {
      await press('Дальше');
      return;
    }
    const choice = visibleDialogChoice(step, session);
    if (choice) {
      await press(choice);
      continue;
    }
    const finished = await finishLatestCue();
    if (!finished) {
      const calls = (playLessonAudio as jest.Mock).mock.calls.map((call) => {
        const input = call[0] as { text?: string; onEnd?: () => void } | undefined;
        return `${input?.text ?? '?'}:${typeof input?.onEnd}`;
      });
      throw new Error(
        `dialog waiting for audio: ${visibleText().slice(0, 300)} calls=${calls.join(' | ')}`,
      );
    }
  }
  throw new Error(`dialog did not finish: ${visibleText().slice(0, 400)}`);
}

async function playToSummary(session: LoadedLesson): Promise<void> {
  let previous = '';
  for (let guard = 0; guard < 80; guard += 1) {
    const state = useLessonStore.getState();
    if (state.status === 'completed' || state.status === 'failed') return;
    const step = state.flow === 'script' ? session.steps[state.scriptIndex] : undefined;
    const mark = `${state.status}:${state.flow}:${state.scriptIndex}:${state.dialogLineKeys.length}:${state.userAnswer}`;
    if (mark === previous) {
      throw new Error(
        `stuck on ${step?.type ?? 'retry'} (${mark}) screen=${visibleText().slice(0, 400)}`,
      );
    }
    previous = mark;

    if (state.status === 'mistakes_intro') {
      await press('Поехали');
      continue;
    }
    if (state.status === 'feedback') {
      await press('Дальше');
      continue;
    }
    if (!step) {
      const exercise = state.getCurrentExercise();
      if (!exercise) throw new Error('missing retry');
      if (exercise.type === 'select_translation') await press(exercise.answer);
      else {
        await fireEvent.changeText(await screen.findByLabelText('Введите ответ'), exercise.answer);
      }
      await press('Проверить');
      continue;
    }
    if (step.type === 'dialog') {
      await playDialog(step, session, state.scriptIndex);
      continue;
    }
    if (step.type === 'speak_repeat') {
      await press('Пропустить');
      continue;
    }
    if (step.type === 'intro') {
      await press('Дальше');
      continue;
    }
    if (step.type === 'match_pairs') {
      await answerExercise(step);
      continue;
    }
    if (
      step.type === 'select_translation' ||
      step.type === 'listen_select' ||
      step.type === 'build_sentence' ||
      step.type === 'type_translation' ||
      step.type === 'fill_gap'
    ) {
      await answerExercise(step);
      await press('Проверить');
      continue;
    }
    await press('Дальше');
  }
  throw new Error('lesson did not finish');
}

describe('LessonScreen v2', () => {
  jest.setTimeout(30_000);

  beforeEach(() => {
    mockReplace.mockClear();
    jest.mocked(reviewRepository.introduceItems).mockClear();
    useLessonStore.getState().reset();
  });

  it('plays a1.hola.l1 from the intro to the summary', async () => {
    const session = loadLessonSession('a1.hola.l1');
    const recordCompletion = jest.fn(async () => ({ lessons: [], totalXp: 10, pending: 0 }));
    await renderLesson(recordCompletion);

    expect(await screen.findByText('Новые фразы 1 из 8')).toBeOnTheScreen();
    expect(screen.queryByText('Прослушать и повторить')).toBeNull();
    expect(screen.getByLabelText('5 из 5')).toBeOnTheScreen();
    expect(screen.queryByText('Проверить')).toBeNull();

    await press('Дальше');
    expect(useLessonStore.getState().stepsCompleted).toBe(1);
    expect(await screen.findByText('Новые фразы 2 из 8')).toBeOnTheScreen();
    expect(screen.getByLabelText('5 из 5')).toBeOnTheScreen();

    await playToSummary(session);

    expect(useLessonStore.getState().status).toBe('completed');
    expect(useLessonStore.getState().hearts).toBe(DEFAULT_MAX_HEARTS);
    expect(useLessonStore.getState().wrongCount).toBe(0);
    expect(mockReplace).toHaveBeenCalledWith('/lesson/summary');

    const summary = useLessonStore.getState().summary;
    expect(summary?.newItems.map((item) => item.id)).toEqual(getLesson('a1.hola.l1').items);

    await act(async () => {
      await Promise.resolve();
    });
    expect(recordCompletion).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        lessonId: 'a1.hola.l1',
        accuracy: 100,
      }),
    );
    expect(reviewRepository.introduceItems).toHaveBeenCalledTimes(1);
    const introduced = jest.mocked(reviewRepository.introduceItems).mock.calls[0]?.[1] as
      { id: string }[] | undefined;
    expect(introduced?.map((item) => item.id)).toEqual(getLesson('a1.hola.l1').items);
  });
});
