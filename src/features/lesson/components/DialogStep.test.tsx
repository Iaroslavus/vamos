import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import type { ComponentProps } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { playLessonAudio } from '@/features/audio/playback';
import { playGradeSound } from '@/features/audio/sounds';
import type { Item } from '@/features/content/schema';
import i18n from '@/i18n';

import type { DialogStep as DialogStepData } from '../generator';
import { dialogRetryExerciseId, useLessonStore } from '../store';
import { DialogStep } from './DialogStep';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@/features/audio/playback', () => ({
  playLessonAudio: jest.fn(() => Promise.resolve('speech')),
  stopLessonAudio: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/features/audio/sounds', () => ({
  playGradeSound: jest.fn(),
}));

function item(id: string, es: string, ru: string): Item {
  return {
    id,
    type: 'phrase',
    es,
    ru,
    parts: [],
    say_ru: 'sa',
    note_ru: null,
    why_ru: null,
    level: 'A1',
    variant: 'both',
    audio: { es: `${id}.mp3`, latam: null },
    tags: [],
    draft: false,
  };
}

const buenos = item('hola.buenos_dias', 'buenos días', 'доброе утро');
const gracias = item('hola.gracias', 'gracias', 'спасибо');
const adios = item('hola.adios', 'adiós', 'пока');

const step: DialogStepData = {
  id: 's9',
  type: 'dialog',
  lines: [
    { who: 'npc', es: '¡Hola!', ru: 'Привет!' },
    {
      who: 'user',
      target: 'hola.buenos_dias',
      options: ['hola.buenos_dias', 'hola.gracias', 'hola.adios'],
    },
    { who: 'npc', es: '¿Un café?', ru: 'Кофе?' },
  ],
  itemIds: ['hola.buenos_dias'],
  distractorIds: ['hola.gracias', 'hola.adios'],
};

const safeArea = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderStep(props: Partial<ComponentProps<typeof DialogStep>> = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider initialMetrics={safeArea}>
        <DialogStep
          step={step}
          items={[buenos, gracias, adios]}
          onContinue={jest.fn()}
          onComplete={jest.fn()}
          {...props}
        />
      </SafeAreaProvider>
    </I18nextProvider>,
  );
}

async function finishPlayback() {
  const calls = (playLessonAudio as jest.Mock).mock.calls;
  const input = calls[calls.length - 1]?.[0] as { onEnd?: () => void } | undefined;
  if (!input?.onEnd) throw new Error('audio was not playing');
  await act(async () => {
    input.onEnd?.();
  });
}

describe('DialogStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLessonStore.getState().reset();
  });

  it('plays the npc line, then reveals the translation on tap', async () => {
    await renderStep();

    expect(playLessonAudio).toHaveBeenCalledWith(
      expect.objectContaining({ text: '¡Hola!', audio: null }),
    );
    expect(screen.queryByText('gracias')).toBeNull();
    expect(screen.queryByText('Привет!')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Показать перевод: ¡Hola!'));
    expect(screen.getByText('Привет!')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Скрыть перевод: ¡Hola!'));
    expect(screen.queryByText('Привет!')).toBeNull();
  });

  it('sends a correct chip with the line audio and finishes the script', async () => {
    const onComplete = jest.fn();
    const onContinue = jest.fn();
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
    await renderStep({ onComplete, onContinue });

    await finishPlayback();
    await fireEvent.press(screen.getByText('buenos días'));

    expect(screen.getByLabelText('Ваша реплика: buenos días')).toBeTruthy();
    expect(playLessonAudio).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'buenos días', audio: 'hola.buenos_dias.mp3' }),
    );
    expect(useLessonStore.getState().xpEarned).toBe(10);
    expect(useLessonStore.getState().correctCount).toBe(1);
    expect(useLessonStore.getState().queue).toEqual(['e1']);

    await finishPlayback();
    expect(screen.getByText('¿Un café?')).toBeTruthy();
    await finishPlayback();

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ stepId: 's9', missedItemIds: [] }),
    );
    await fireEvent.press(screen.getByText('Дальше'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('shakes a miss, hints, and queues the line when the second chance fails', async () => {
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
      hearts: 1,
      maxHearts: 1,
    });
    const onComplete = jest.fn();
    await renderStep({ onComplete });

    await finishPlayback();
    await fireEvent.press(screen.getByText('gracias'));

    expect(screen.getByText('Подсказка: доброе утро')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'gracias' })).toBeDisabled();
    expect(playGradeSound).toHaveBeenCalledWith('wrong');
    expect(screen.queryByLabelText('Ваша реплика: buenos días')).toBeNull();

    await fireEvent.press(screen.getByText('adiós'));

    expect(screen.getByLabelText('Ваша реплика: buenos días')).toBeTruthy();
    expect(useLessonStore.getState().status).toBe('failed');
    expect(useLessonStore.getState().hearts).toBe(0);
    expect(useLessonStore.getState().wrongCount).toBe(1);
    const retryId = dialogRetryExerciseId('s9', 1);
    expect(useLessonStore.getState().queue).toEqual(['e1', retryId]);
    expect(useLessonStore.getState().exerciseById[retryId]).toMatchObject({
      type: 'select_translation',
      prompt_ru: 'Выберите реплику',
      prompt: 'доброе утро',
      answer: 'buenos días',
      options: ['buenos días', 'gracias', 'adiós'],
    });

    await finishPlayback();
    expect(screen.queryByText('¿Un café?')).toBeNull();
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ missedItemIds: ['hola.buenos_dias'] }),
    );
  });

  it('shows «Сказать вслух» instead of chips when speech mode is on', async () => {
    const onSpeakAloud = jest.fn();
    await renderStep({ responseMode: 'speak', onSpeakAloud });
    await finishPlayback();

    expect(screen.queryByText('gracias')).toBeNull();
    await fireEvent.press(screen.getByText('Сказать вслух'));
    expect(onSpeakAloud).toHaveBeenCalledTimes(1);
  });

  it('shows «Сказать вслух» next to the chips and accepts a matching line', async () => {
    await renderStep();
    await finishPlayback();

    expect(screen.getByText('Сказать вслух')).toBeTruthy();
    expect(screen.getByText('gracias')).toBeTruthy();

    await fireEvent.press(screen.getByText('Сказать вслух'));
    const speech = ExpoSpeechRecognitionModule as unknown as {
      __emit: (event: string, payload: unknown) => void;
    };
    await act(async () => {
      speech.__emit('result', {
        isFinal: true,
        results: [{ transcript: 'buenos días', confidence: 1, segments: [] }],
      });
    });

    expect(screen.getByLabelText('Ваша реплика: buenos días')).toBeTruthy();
  });

  it('keeps the chips when the recognizer misses the line', async () => {
    await renderStep();
    await finishPlayback();

    await fireEvent.press(screen.getByText('Сказать вслух'));
    const speech = ExpoSpeechRecognitionModule as unknown as {
      __emit: (event: string, payload: unknown) => void;
    };
    await act(async () => {
      speech.__emit('result', {
        isFinal: true,
        results: [{ transcript: 'zzzz', confidence: 1, segments: [] }],
      });
    });

    expect(
      screen.getByText('Не расслышали реплику. Скажите ещё раз или выберите её.'),
    ).toBeTruthy();
    expect(screen.getByText('gracias')).toBeTruthy();
    expect(screen.queryByLabelText('Ваша реплика: buenos días')).toBeNull();
  });
});
