import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ReviewScreen from '../../../app/(lesson)/review';
import { playLessonAudio } from '@/features/audio/playback';
import { useLessonStore } from '@/features/lesson/store';
import { ProgressProvider } from '@/features/progress/ProgressProvider';
import type { ProgressRepository } from '@/features/progress/types';
import { reviewRepository } from '@/features/review/defaultRepository';
import { vocabRepository } from '@/features/vocab/defaultRepository';
import type { StoredCard } from '@/features/review/types';
import i18n from '@/i18n';

let mockReviewFolder: string | undefined;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
  useLocalSearchParams: () => ({ folder: mockReviewFolder }),
  Redirect: () => null,
}));

jest.mock('@/features/vocab/defaultRepository', () => ({
  vocabRepository: {
    read: jest.fn(),
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
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

jest.mock('@/features/audio/playback', () => ({
  NORMAL_RATE: 1,
  SLOW_RATE: 0.7,
  playLessonAudio: jest.fn(() => Promise.resolve('speech')),
  stopLessonAudio: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/features/audio/sounds', () => ({
  playGradeSound: jest.fn(),
}));

jest.mock('@/features/review/defaultRepository', () => ({
  reviewRepository: {
    read: jest.fn(),
    recordRating: jest.fn(async () => ({ cards: [], logs: [], dueCount: 0, pending: 0 })),
  },
}));

const read = reviewRepository.read as jest.Mock;
const readFolders = vocabRepository.read as jest.Mock;
const recordRating = reviewRepository.recordRating as jest.Mock;
const awardXp = jest.fn(async () => ({ lessons: [], totalXp: 5, pending: 0 }));

function card(id: string, direction: StoredCard['direction'] = 'es_to_ru'): StoredCard {
  return {
    id,
    itemId: id,
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

function repository(): ProgressRepository {
  return {
    readProgress: jest.fn(async () => ({ lessons: [], totalXp: 0, pending: 0 })),
    recordCompletion: jest.fn(),
    awardXp,
    sync: jest.fn(async () => ({ lessons: [], totalXp: 0, pending: 0 })),
    start: jest.fn(() => () => undefined),
    settled: jest.fn(async () => undefined),
  };
}

const initialMetrics = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

async function pressRating(label: string) {
  await fireEvent.press(screen.getByText(label));
  // The rating promise resolves after this turn. Wait it out before the next act().
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function renderReview() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <ProgressProvider repository={repository()}>
            <ReviewScreen />
          </ProgressProvider>
        </SafeAreaProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

async function startCards() {
  fireEvent.press(await screen.findByText('Карточки'));
}

async function pressContinue() {
  await fireEvent.press(screen.getByRole('button', { name: 'Дальше' }));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('ReviewScreen', () => {
  beforeEach(() => {
    mockReviewFolder = undefined;
    useLessonStore.getState().reset();
    read.mockReset();
    readFolders.mockReset();
    recordRating.mockClear();
    awardXp.mockClear();
    (playLessonAudio as jest.Mock).mockClear();
    (Haptics.impactAsync as jest.Mock).mockClear();
  });

  afterEach(() => {
    useLessonStore.getState().reset();
  });

  it('speaks a Spanish prompt, then rates it and shows when the card returns', async () => {
    read.mockResolvedValue({ cards: [card('hola.hola')], logs: [], dueCount: 1, pending: 0 });
    await renderReview();
    await startCards();

    expect(await screen.findByText('hola')).toBeTruthy();
    expect(playLessonAudio).toHaveBeenCalledWith({ text: 'hola', audio: 'a1/hola.mp3' });

    fireEvent.press(screen.getByText('Показать ответ'));
    expect(await screen.findByText('привет')).toBeTruthy();
    expect(screen.getByLabelText(/Снова, /)).toBeTruthy();
    expect(screen.getByLabelText(/Трудно, /)).toBeTruthy();
    expect(screen.getByLabelText(/Хорошо, /)).toBeTruthy();
    expect(screen.getByLabelText(/Легко, /)).toBeTruthy();
    expect(screen.getAllByText(/\d+ (мин|ч|дн)/).length).toBeGreaterThanOrEqual(4);

    await fireEvent(screen.getByRole('button', { name: /Хорошо/ }), 'pressIn');
    expect(Haptics.impactAsync).toHaveBeenCalled();
    await pressRating('Хорошо');
    expect(screen.getByText('Повторение готово')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('+0')).toBeTruthy();
    expect(awardXp).not.toHaveBeenCalled();
    expect(recordRating).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ itemId: 'hola.hola', direction: 'es_to_ru', rating: 'good' }),
    );
  });

  it('shows the translation first for recall and speaks Spanish after the flip', async () => {
    read.mockResolvedValue({
      cards: [card('hola.gracias', 'ru_to_es')],
      logs: [],
      dueCount: 1,
      pending: 0,
    });
    await renderReview();
    await startCards();

    expect(await screen.findByText('спасибо')).toBeTruthy();
    expect(playLessonAudio).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Показать ответ'));
    expect(await screen.findByText('gracias')).toBeTruthy();
    expect(playLessonAudio).toHaveBeenCalledWith({ text: 'gracias', audio: 'a1/gracias.mp3' });
  });

  it('awards 5 XP through the progress repository after 10 cards', async () => {
    read.mockResolvedValue({
      cards: Array.from({ length: 10 }, (_, index) => card(`word-${index}`)),
      logs: [],
      dueCount: 10,
      pending: 0,
    });
    await renderReview();
    await startCards();

    for (let step = 0; step < 10; step += 1) {
      await fireEvent.press(await screen.findByText('Показать ответ'));
      await pressRating('Хорошо');
    }

    expect(screen.getByText('Повторение готово')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('+5')).toBeTruthy();
    expect(awardXp).toHaveBeenCalledTimes(1);
    expect(awardXp).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ amount: 5, source: 'review' }),
    );
    const grant = awardXp.mock.calls[0]?.[1] as { clientId: string; refId: string };
    expect(grant.clientId).toBe(grant.refId);
    expect(recordRating).toHaveBeenCalledTimes(10);
  });

  it('counts Again as a miss', async () => {
    read.mockResolvedValue({ cards: [card('hola.hola')], logs: [], dueCount: 1, pending: 0 });
    await renderReview();
    await startCards();

    await fireEvent.press(await screen.findByText('Показать ответ'));
    await pressRating('Снова');

    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.getByText('+0')).toBeTruthy();
  });

  it('rates a first-try exercise Good', async () => {
    read.mockResolvedValue({ cards: [card('hola.hola')], logs: [], dueCount: 1, pending: 0 });
    await renderReview();

    await fireEvent.press(await screen.findByText('Быстрое повторение'));
    await fireEvent.press(await screen.findByRole('button', { name: 'привет' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Проверить' }));
    await pressContinue();

    expect(screen.getByText('Повторение готово')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    expect(awardXp).not.toHaveBeenCalled();
    expect(recordRating).toHaveBeenCalledTimes(1);
    expect(recordRating).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ itemId: 'hola.hola', direction: 'es_to_ru', rating: 'good' }),
    );
  });

  it('rates a success after a miss Hard', async () => {
    read.mockResolvedValue({ cards: [card('hola.hola')], logs: [], dueCount: 1, pending: 0 });
    await renderReview();

    await fireEvent.press(await screen.findByText('Быстрое повторение'));
    await fireEvent.press(await screen.findByRole('button', { name: 'до свидания' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Проверить' }));
    await pressContinue();

    expect(recordRating).not.toHaveBeenCalled();
    await fireEvent.press(await screen.findByText('Поехали'));
    await fireEvent.press(screen.getByRole('button', { name: 'привет' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Проверить' }));
    await pressContinue();

    expect(screen.getByText('Повторение готово')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    expect(recordRating).toHaveBeenCalledTimes(1);
    expect(recordRating).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ itemId: 'hola.hola', direction: 'es_to_ru', rating: 'hard' }),
    );
  });

  it('studies only the cards that sit in the chosen folder', async () => {
    mockReviewFolder = 'folder-1';
    readFolders.mockResolvedValue({
      folders: [
        {
          id: 'folder-1',
          name: 'Работа',
          color: 'ink',
          kind: 'custom',
          topicId: null,
          systemKey: null,
          createdAt: '2026-10-25T00:00:00.000Z',
        },
      ],
      items: [{ folderId: 'folder-1', itemId: 'hola.hola', addedAt: '2026-10-25T00:00:00.000Z' }],
      pending: 0,
    });
    read.mockResolvedValue({
      cards: [card('hola.hola'), card('hola.gracias')],
      logs: [],
      dueCount: 2,
      pending: 0,
    });
    await renderReview();
    await startCards();

    await fireEvent.press(await screen.findByText('Показать ответ'));
    await pressRating('Хорошо');

    expect(screen.getByText('Повторение готово')).toBeTruthy();
    expect(recordRating).toHaveBeenCalledTimes(1);
    expect(recordRating).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ itemId: 'hola.hola', rating: 'good' }),
    );
  });

  it('explains an empty deck', async () => {
    read.mockResolvedValue({ cards: [], logs: [], dueCount: 0, pending: 0 });
    await renderReview();
    expect(await screen.findByText('На сегодня всё')).toBeTruthy();
  });

  it('stops when the daily cap of 20 new cards is already used', async () => {
    read.mockResolvedValue({
      cards: [card('hola.hola')],
      logs: Array.from({ length: 20 }, () => ({
        reviewedAt: new Date().toISOString(),
        state: 0,
      })),
      dueCount: 1,
      pending: 0,
    });
    await renderReview();
    expect(await screen.findByText('Лимит на сегодня')).toBeTruthy();
  });
});
