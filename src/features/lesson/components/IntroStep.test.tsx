import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import type { ComponentProps, ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  NORMAL_RATE,
  playLessonAudio,
  SLOW_RATE,
  stopLessonAudio,
} from '@/features/audio/playback';
import { blankAudio, type Item } from '@/features/content/schema';
import { fillLocales } from '@/features/content/text';
import { usePhraseBreakdownStore } from '@/features/settings/phraseBreakdownStore';
import i18n from '@/i18n';
import { colors } from '@/theme/tokens';

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
        deleteFolder: async () => undefined,
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
  literal: fillLocales('добрые дни'),
  parts: [
    { es: 'buenos', tr: fillLocales('добрые') },
    { es: 'días', tr: fillLocales('дни') },
  ],
  say: fillLocales('буЭнос дИас'),
  note: fillLocales('Так говорят утром, примерно до обеда.'),
  why: fillLocales('Día мужского рода, поэтому buenos, а не buenas.'),
  level: 'A1',
  variant: 'both',
  audio: blankAudio({
    es: 'a1/buenos-dias.mp3',
    latam: 'a1/buenos-dias-latam.mp3',
    slow: { latam: 'a1/buenos-dias-latam-slow.mp3' },
  }),
  tags: ['greeting'],
  confusables: [],
  draft: false,
  draft_i18n: false,
};

function stepTree(item: Item, props: Partial<ComponentProps<typeof IntroStep>> = {}): ReactElement {
  return (
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
    </I18nextProvider>
  );
}

function renderStep(item: Item, props: Partial<ComponentProps<typeof IntroStep>> = {}) {
  return render(stepTree(item, props));
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
  beforeEach(async () => {
    jest.clearAllMocks();
    mockVocabMemory.clear();
    useLessonStore.getState().reset();
    await AsyncStorage.clear();
    await usePhraseBreakdownStore.persist.rehydrate();
    usePhraseBreakdownStore.setState({ show: false, streak: 0 });
    jest.mocked(ExpoSpeechRecognitionModule.isRecognitionAvailable).mockReturnValue(true);
    jest.mocked(ExpoSpeechRecognitionModule.getPermissionsAsync).mockResolvedValue(granted);
    jest.mocked(ExpoSpeechRecognitionModule.requestPermissionsAsync).mockResolvedValue(granted);
  });

  it('shows the phrase, translation, and audio, with the breakdown closed', async () => {
    await renderStep(phrase);

    expect(screen.getByText('Новые фразы 2 из 6')).toBeTruthy();
    expect(screen.getByText('Buenos días')).toBeTruthy();
    expect(screen.getByText('Доброе утро')).toBeTruthy();
    expect(screen.getByRole('button', { name: '+ В словник' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Слушать' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Медленно' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Подробнее' })).toBeTruthy();
    expect(screen.queryByText('буЭнос дИас')).toBeNull();
    expect(screen.queryByText('Так говорят утром, примерно до обеда.')).toBeNull();
    expect(screen.queryByText('Buenos · Добрые')).toBeNull();
    expect(screen.queryByText('Почему так?')).toBeNull();
    expect(StyleSheet.flatten(screen.getByText('Подробнее').props.style).color).toBe(
      colors.inkMuted,
    );

    const listen = StyleSheet.flatten(screen.getByTestId('intro-listen').props.style);
    const slow = StyleSheet.flatten(screen.getByTestId('intro-slow').props.style);
    expect(listen).toMatchObject({ width: 44, height: 44 });
    expect(slow).toMatchObject({ width: 44, height: 44 });

    const footer = StyleSheet.flatten(screen.getByTestId('intro-footer').props.style);
    expect(footer).toMatchObject({ flexDirection: 'row' });
  });

  it('opens the breakdown inside the card and closes it again', async () => {
    await renderStep(phrase);

    await fireEvent.press(screen.getByRole('button', { name: 'Подробнее' }));

    expect(screen.getByText('Как произносить')).toBeTruthy();
    expect(screen.getByText('буЭнос дИас')).toBeTruthy();
    expect(screen.getByText('Дословно')).toBeTruthy();
    expect(screen.getByText('Buenos · Добрые')).toBeTruthy();
    expect(screen.getByText('Días · Дни')).toBeTruthy();
    expect(screen.getByText('буквально: Добрые дни')).toBeTruthy();
    expect(screen.getByText('Так говорят утром, примерно до обеда.')).toBeTruthy();
    expect(screen.getByText('Почему так?')).toBeTruthy();
    expect(screen.getByText(phrase.why?.ru ?? '')).toBeTruthy();
    expect(screen.queryByText('Понятно')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Скрыть' }));

    expect(screen.queryByText('буЭнос дИас')).toBeNull();
    expect(screen.queryByText('Почему так?')).toBeNull();
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
      audio: 'a1/buenos-dias-latam-slow.mp3',
      text: 'buenos días',
      rate: SLOW_RATE,
    });
  });

  it('speaks a part on its own when a chip is tapped', async () => {
    await renderStep(phrase);
    await fireEvent.press(screen.getByRole('button', { name: 'Подробнее' }));

    await fireEvent.press(screen.getByText('Buenos · Добрые'));

    expect(playLessonAudio).toHaveBeenCalledWith({
      audio: null,
      text: 'buenos',
      rate: NORMAL_RATE,
    });
  });

  it('hides the pronunciation hint above A2 and skips an empty why', async () => {
    await renderStep({
      ...phrase,
      level: 'B1',
      say: fillLocales('буЭнос дИас'),
      why: null,
      note: null,
      parts: [],
      literal: null,
    });

    expect(screen.queryByText('буЭнос дИас')).toBeNull();
    expect(screen.queryByText(/буквально/)).toBeNull();
    expect(screen.queryByText('Почему так?')).toBeNull();
    expect(screen.queryByText('Подробнее')).toBeNull();
    expect(screen.queryByText('Так говорят утром, примерно до обеда.')).toBeNull();
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
    expect(screen.queryByLabelText('Слушать образец')).toBeNull();

    await fireEvent.press(screen.getByText('Повторить вслух'));

    expect(screen.queryByText('Повторите вслух')).toBeNull();
    expect(screen.queryByText('Тренировка: сердечки и ошибки урока не меняются.')).toBeNull();
    expect(screen.getByLabelText('Слушать образец')).toBeTruthy();
    expect(screen.getByLabelText('Говорить')).toBeTruthy();
    expect(screen.getByText('Пропустить')).toBeTruthy();
    expect(screen.queryByText('Закрыть')).toBeNull();
  });

  it('offers listen-and-repeat when recognition is unavailable', async () => {
    jest.mocked(ExpoSpeechRecognitionModule.isRecognitionAvailable).mockReturnValue(false);
    await renderStep(phrase);

    await fireEvent.press(screen.getByRole('button', { name: 'Повторить вслух' }));

    expect(await screen.findByText('Распознавание недоступно')).toBeTruthy();
    expect(screen.getByText(/Прослушайте фразу и повторите её сами/)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Слушать образец'));

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

    await fireEvent.press(screen.getByLabelText('Слушать образец'));

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

    expect(await screen.findByText('ударение на отмеченной гласной: буЭнос дИас')).toBeTruthy();
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

  it('remembers the breakdown after three cards opened in a row', async () => {
    const onNext = jest.fn();
    const view = await renderStep(phrase, { onNext });

    await fireEvent.press(screen.getByRole('button', { name: 'Подробнее' }));
    expect(usePhraseBreakdownStore.getState()).toMatchObject({ show: false, streak: 1 });

    await view.rerender(stepTree({ ...phrase, id: 'phrase.2' }, { onNext }));
    expect(screen.queryByText('буЭнос дИас')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Подробнее' }));
    expect(usePhraseBreakdownStore.getState()).toMatchObject({ show: false, streak: 2 });

    await view.rerender(stepTree({ ...phrase, id: 'phrase.3' }, { onNext }));
    await fireEvent.press(screen.getByRole('button', { name: 'Подробнее' }));
    expect(usePhraseBreakdownStore.getState()).toMatchObject({ show: true, streak: 0 });

    await view.rerender(stepTree({ ...phrase, id: 'phrase.4' }, { onNext }));
    expect(screen.getByText('Как произносить')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Скрыть' })).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('resets the streak when the next card is left closed', async () => {
    const onNext = jest.fn();
    const view = await renderStep(phrase, { onNext });

    await fireEvent.press(screen.getByRole('button', { name: 'Подробнее' }));
    await fireEvent.press(screen.getByText('Дальше'));
    expect(usePhraseBreakdownStore.getState().streak).toBe(1);

    await view.rerender(stepTree({ ...phrase, id: 'phrase.2' }, { onNext }));
    await fireEvent.press(screen.getByText('Дальше'));

    expect(usePhraseBreakdownStore.getState()).toMatchObject({ show: false, streak: 0 });
    expect(onNext).toHaveBeenCalledTimes(2);
  });

  it('starts expanded when the profile setting is on', async () => {
    usePhraseBreakdownStore.setState({ show: true, streak: 0 });
    await renderStep(phrase);

    expect(screen.getByText('буЭнос дИас')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Скрыть' })).toBeTruthy();
  });

  it('stops audio when the step unmounts', async () => {
    const view = await renderStep(phrase);
    await view.unmount();
    expect(stopLessonAudio).toHaveBeenCalled();
  });

  it('releases the microphone when the practice sheet closes', async () => {
    (globalThis as { __resetAudio__?: () => void }).__resetAudio__?.();
    await renderStep(phrase);
    await fireEvent.press(screen.getByText('Повторить вслух'));
    await fireEvent.press(await screen.findByLabelText('Говорить'));
    expect(await screen.findByLabelText('Остановить запись')).toBeTruthy();

    const close = screen.getAllByLabelText('Закрыть');
    await fireEvent.press(close[close.length - 1]);

    const audio = (globalThis as { __VAMOS_AUDIO__: { isRecording: boolean } }).__VAMOS_AUDIO__;
    expect(audio.isRecording).toBe(false);
  });
});
