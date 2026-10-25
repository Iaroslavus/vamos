import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import type { ComponentProps } from 'react';
import { I18nextProvider } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  NORMAL_RATE,
  playLessonAudio,
  SLOW_RATE,
  stopLessonAudio,
} from '@/features/audio/playback';
import type { Item } from '@/features/content/schema';
import { fillLocales } from '@/features/content/text';
import i18n from '@/i18n';

import { DEFAULT_MAX_HEARTS, useLessonStore } from '../store';
import { IntroStep } from './IntroStep';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@/features/audio/playback', () => ({
  NORMAL_RATE: 1,
  SLOW_RATE: 0.7,
  playLessonAudio: jest.fn(),
  stopLessonAudio: jest.fn(),
}));

const mockVocabMemory = new Map<string, string>();

jest.mock('@/features/auth/useSession', () => ({
  useSession: () => ({
    status: 'ready',
    session: { user: { id: 'user-1', is_anonymous: true } },
  }),
}));

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

const phrase: Item = {
  id: 'hola.buenos_dias',
  type: 'phrase',
  es: 'buenos días',
  tr: fillLocales('доброе утро'),
  parts: [
    { es: 'buenos', tr: fillLocales('добрые') },
    { es: 'días', tr: fillLocales('утро') },
  ],
  say: fillLocales('буЭнос дИас'),
  note: fillLocales('Так говорят утром, примерно до обеда.'),
  why: fillLocales('Día мужского рода, поэтому buenos, а не buenas.'),
  level: 'A1',
  variant: 'both',
  audio: { es: 'a1/buenos-dias.mp3', latam: 'a1/buenos-dias-latam.mp3' },
  tags: ['greeting'],
  draft: false,
  draft_i18n: false,
};

function renderStep(item: Item, props: Partial<ComponentProps<typeof IntroStep>> = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <IntroStep
          item={item}
          position={2}
          total={6}
          topicIcon="wave"
          onNext={jest.fn()}
          {...props}
        />
      </SafeAreaProvider>
    </I18nextProvider>,
  );
}

const speech = ExpoSpeechRecognitionModule as unknown as {
  __emit: (event: string, payload: unknown) => void;
};

const granted = {
  granted: true,
  canAskAgain: true,
  expires: 'never' as const,
  status: 'granted' as const,
};

function emitTranscript(transcript: string): void {
  speech.__emit('result', {
    isFinal: true,
    results: [{ transcript, confidence: 1, segments: [] }],
  });
}

describe('IntroStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVocabMemory.clear();
    useLessonStore.getState().reset();
    jest.mocked(ExpoSpeechRecognitionModule.isRecognitionAvailable).mockReturnValue(true);
    jest.mocked(ExpoSpeechRecognitionModule.getPermissionsAsync).mockResolvedValue(granted);
    jest.mocked(ExpoSpeechRecognitionModule.requestPermissionsAsync).mockResolvedValue(granted);
  });

  it('shows the new-phrase label, translation, hint, note, and equal audio buttons', async () => {
    await renderStep(phrase);

    expect(screen.getByText('Новые фразы 2 из 6')).toBeTruthy();
    expect(screen.getByText('buenos días')).toBeTruthy();
    expect(screen.getByText('буЭнос дИас')).toBeTruthy();
    expect(screen.getByText('доброе утро')).toBeTruthy();
    expect(screen.getByText('Так говорят утром, примерно до обеда.')).toBeTruthy();
    expect(screen.getByText('buenos · добрые')).toBeTruthy();
    expect(screen.getByText('días · утро')).toBeTruthy();

    const listen = StyleSheet.flatten(screen.getByTestId('intro-listen').props.style);
    const slow = StyleSheet.flatten(screen.getByTestId('intro-slow').props.style);
    expect(listen).toMatchObject({ width: 44, height: 44 });
    expect(slow).toMatchObject({ width: 44, height: 44 });
  });

  it('plays the phrase when the card appears, and again for listen and slow', async () => {
    await renderStep(phrase, { audioVariant: 'latam' });

    expect(playLessonAudio).toHaveBeenCalledWith({
      audio: 'a1/buenos-dias-latam.mp3',
      text: 'buenos días',
      rate: NORMAL_RATE,
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Слушать' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Медленно' }));

    expect(playLessonAudio).toHaveBeenCalledWith({
      audio: 'a1/buenos-dias-latam.mp3',
      text: 'buenos días',
      rate: NORMAL_RATE,
    });
    expect(playLessonAudio).toHaveBeenCalledWith({
      audio: 'a1/buenos-dias-latam.mp3',
      text: 'buenos días',
      rate: SLOW_RATE,
    });
  });

  it('speaks a part on its own when a chip is tapped', async () => {
    await renderStep(phrase);

    await fireEvent.press(screen.getByText('buenos · добрые'));

    expect(playLessonAudio).toHaveBeenCalledWith({ text: 'buenos', rate: NORMAL_RATE });
  });

  it('hides the pronunciation hint above A2 and skips an empty why', async () => {
    await renderStep({
      ...phrase,
      level: 'B1',
      say: fillLocales('буЭнос дИас'),
      why: null,
      note: null,
      parts: [],
    });

    expect(screen.queryByText('буЭнос дИас')).toBeNull();
    expect(screen.queryByText('Почему так?')).toBeNull();
    expect(screen.queryByText('Так говорят утром, примерно до обеда.')).toBeNull();
  });

  it('opens the why sheet when why_ru is set', async () => {
    await renderStep(phrase);

    expect(screen.queryByText(phrase.why?.ru ?? '')).toBeNull();
    await fireEvent.press(screen.getByText('Почему так?'));
    expect(screen.getByText(phrase.why?.ru ?? '')).toBeTruthy();

    await fireEvent.press(screen.getByText('Понятно'));
    expect(screen.queryByText(phrase.why?.ru ?? '')).toBeNull();
  });

  it('opens the folder sheet and saves the unit into favorites', async () => {
    await renderStep(phrase);

    await fireEvent.press(screen.getByRole('button', { name: '+ В словник' }));
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Добавить в «Избранное»' }));
    await fireEvent.press(screen.getByText('Готово'));

    expect(await screen.findByText('1 фраза добавлена в «Избранное»')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'В избранном' })).toBeTruthy();
  });

  it('opens speak practice when the learner taps repeat aloud', async () => {
    await renderStep(phrase);

    expect(screen.queryByText('Повторите вслух')).toBeNull();
    expect(screen.queryByText('Слушать образец')).toBeNull();

    await fireEvent.press(screen.getByText('Повторить вслух'));

    expect(await screen.findByText('Повторите вслух')).toBeTruthy();
    expect(screen.getByText('Слушать образец')).toBeTruthy();
    expect(screen.getByLabelText('Говорить')).toBeTruthy();
    expect(screen.getByText('Тренировка: сердечки и ошибки урока не меняются.')).toBeTruthy();
  });

  it('offers listen-and-repeat when recognition is unavailable', async () => {
    jest.mocked(ExpoSpeechRecognitionModule.isRecognitionAvailable).mockReturnValue(false);
    await renderStep(phrase);

    await fireEvent.press(screen.getByRole('button', { name: 'Повторить вслух' }));

    expect(await screen.findByText('Распознавание недоступно')).toBeTruthy();
    expect(screen.getByText(/Прослушайте фразу и повторите её сами/)).toBeTruthy();

    await fireEvent.press(screen.getByText('Прослушать и повторить'));

    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
    expect(playLessonAudio).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'buenos días', audio: 'a1/buenos-dias.mp3' }),
    );
  });

  it('offers listen-and-repeat when the microphone stays blocked', async () => {
    jest.mocked(ExpoSpeechRecognitionModule.getPermissionsAsync).mockResolvedValue({
      granted: false,
      canAskAgain: false,
      expires: 'never',
      status: 'denied',
    });
    await renderStep(phrase);

    await fireEvent.press(screen.getByText('Повторить вслух'));

    expect(await screen.findByText('Микрофон недоступен')).toBeTruthy();
    expect(screen.getByText(/Прослушайте фразу и повторите её сами/)).toBeTruthy();

    await fireEvent.press(screen.getByText('Прослушать и повторить'));

    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
    expect(playLessonAudio).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'buenos días', audio: 'a1/buenos-dias.mp3' }),
    );
  });

  it('scores a practice miss without hearts, mistakes, or lesson progress', async () => {
    useLessonStore.getState().startLesson({
      lessonId: 'a1.hola.l1',
      exercises: [
        {
          id: 'e1',
          type: 'select_translation',
          prompt_ru: 'Выберите перевод',
          prompt: 'hola',
          options: ['привет'],
          answer: 'hola',
        },
      ],
    });
    await renderStep(phrase);
    await fireEvent.press(screen.getByText('Повторить вслух'));
    expect(await screen.findByLabelText('Говорить')).toBeTruthy();

    await act(async () => {
      emitTranscript('zzzz');
    });

    expect(await screen.findByText('Не расслышали «buenos».')).toBeTruthy();
    const state = useLessonStore.getState();
    expect(state.hearts).toBe(DEFAULT_MAX_HEARTS);
    expect(state.wrongCount).toBe(0);
    expect(state.correctCount).toBe(0);
    expect(state.almostCount).toBe(0);
    expect(state.xpEarned).toBe(0);
    expect(state.status).toBe('active');
    expect(state.queue).toEqual(['e1']);
  });

  it('goes on from Дальше and lets the learner repeat aloud without grading', async () => {
    const onNext = jest.fn();
    const onRepeatAloud = jest.fn();
    await renderStep(phrase, { onNext, onRepeatAloud });
    const playsBeforeRepeat = jest.mocked(playLessonAudio).mock.calls.length;

    await fireEvent.press(screen.getByText('Повторить вслух'));
    await fireEvent.press(screen.getByText('Дальше'));

    expect(onRepeatAloud).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(playLessonAudio).toHaveBeenCalledTimes(playsBeforeRepeat);
  });

  it('stops audio when the step unmounts', async () => {
    const view = await renderStep(phrase);
    await view.unmount();
    expect(stopLessonAudio).toHaveBeenCalled();
  });
});
