import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { setAudioModeAsync } from 'expo-audio';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { playLessonAudio, stopLessonAudio } from '@/features/audio/playback';
import i18n from '@/i18n';

import { colors } from '@/theme/tokens';

import { SpeakRepeatStep } from './SpeakRepeatStep';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('@/features/audio/playback', () => ({
  playLessonAudio: jest.fn(() => Promise.resolve('speech')),
  stopLessonAudio: jest.fn(() => Promise.resolve()),
}));

const speech = ExpoSpeechRecognitionModule as unknown as {
  __emit: (event: string, payload: unknown) => void;
};

const granted = {
  granted: true,
  canAskAgain: true,
  expires: 'never' as const,
  status: 'granted' as const,
};

function emitTranscript(
  transcript: string,
  extra: { confidence?: number; alternatives?: string[] } = {},
): void {
  speech.__emit('result', {
    isFinal: true,
    results: [
      { transcript, confidence: extra.confidence ?? 1, segments: [] },
      ...(extra.alternatives ?? []).map((alternative) => ({
        transcript: alternative,
        confidence: 0.4,
        segments: [],
      })),
    ],
  });
}

const safeArea = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

async function renderStep({
  onSkip = jest.fn(),
  onContinue = jest.fn(),
  promptEs = 'buenos días',
  sayRu = 'буЭнос дИас',
  confusables = [] as string[],
}: {
  onSkip?: jest.Mock;
  onContinue?: jest.Mock;
  promptEs?: string;
  sayRu?: string | null;
  confusables?: string[];
} = {}) {
  const rendered = await render(
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider initialMetrics={safeArea}>
        <SpeakRepeatStep
          promptEs={promptEs}
          audio="a1/buenos-dias.mp3"
          sayRu={sayRu}
          parts={[
            { es: 'buenos', ru: 'добрые' },
            { es: 'días', ru: 'утро' },
          ]}
          confusables={confusables}
          onSkip={onSkip}
          onContinue={onContinue}
        />
      </SafeAreaProvider>
    </I18nextProvider>,
  );
  return { onSkip, onContinue, unmount: rendered.unmount };
}

function audioState(): { isRecording: boolean; metering?: number } {
  return (
    globalThis as {
      __VAMOS_AUDIO__: { isRecording: boolean; metering?: number };
    }
  ).__VAMOS_AUDIO__;
}

describe('SpeakRepeatStep', () => {
  beforeEach(() => {
    (globalThis as { __resetAudio__?: () => void }).__resetAudio__?.();
    jest.clearAllMocks();
    jest.mocked(ExpoSpeechRecognitionModule.getPermissionsAsync).mockResolvedValue(granted);
    jest.mocked(ExpoSpeechRecognitionModule.requestPermissionsAsync).mockResolvedValue(granted);
    jest.mocked(ExpoSpeechRecognitionModule.supportsOnDeviceRecognition).mockReturnValue(true);
    jest.mocked(ExpoSpeechRecognitionModule.getSupportedLocales).mockResolvedValue({
      locales: ['es-ES'],
      installedLocales: ['es-ES'],
    });
  });

  it('shows the phrase, a sample icon and a quiet skip', async () => {
    await renderStep();

    expect(screen.queryByText('Скажите вслух')).toBeNull();
    expect(screen.queryByText(/Проверяем/)).toBeNull();
    expect(screen.queryByText(/не сохраняется/)).toBeNull();
    expect(screen.queryByText(/Осталось/)).toBeNull();
    expect(screen.getByText('buenos')).toBeTruthy();
    expect(screen.getByText('días')).toBeTruthy();
    expect(screen.getByLabelText('Слушать образец')).toBeTruthy();
    expect(screen.getByText('Пропустить')).toBeTruthy();
    expect(screen.queryByText('Дальше')).toBeNull();
  });

  it('records alone, then recognizes the wav without a second microphone', async () => {
    await renderStep();

    await fireEvent.press(screen.getByLabelText('Говорить'));

    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByLabelText('Остановить запись')).toBeTruthy();
    });
    expect(ExpoSpeechRecognitionModule.abort).toHaveBeenCalled();
    expect(setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsRecording: true, playsInSilentMode: true }),
    );

    await fireEvent.press(screen.getByLabelText('Остановить запись'));

    expect(audioState().isRecording).toBe(false);
    await waitFor(() => {
      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith(
        expect.objectContaining({
          lang: 'es-ES',
          requiresOnDeviceRecognition: true,
          maxAlternatives: 5,
          audioSource: { uri: 'file:///cache/take.wav' },
        }),
      );
    });
    const options = jest.mocked(ExpoSpeechRecognitionModule.start).mock.calls[0]?.[0];
    expect(options).not.toHaveProperty('contextualStrings');
    expect(options).not.toHaveProperty('recordingOptions');
  });

  it('does not mention where the recording is kept', async () => {
    await renderStep({ promptEs: 'una mesa roja' });

    expect(screen.queryByText(/не сохраняется/)).toBeNull();
    expect(screen.queryByText(/только для сравнения/)).toBeNull();
    await fireEvent.press(screen.getByLabelText('Говорить'));
    await waitFor(() => {
      expect(screen.getByLabelText('Остановить запись')).toBeTruthy();
    });
    await fireEvent.press(screen.getByLabelText('Остановить запись'));

    await waitFor(() => {
      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalled();
    });
    const options = jest.mocked(ExpoSpeechRecognitionModule.start).mock.calls.at(-1)?.[0];
    expect(options).not.toHaveProperty('contextualStrings');
    expect(options).not.toHaveProperty('recordingOptions');
    expect(options).toEqual(
      expect.objectContaining({ audioSource: { uri: 'file:///cache/take.wav' } }),
    );
  });

  it('shows the microphone message when the input cannot be opened', async () => {
    const state = (
      globalThis as {
        __VAMOS_AUDIO__: { inputs: unknown[]; current: { uid: string } | null };
      }
    ).__VAMOS_AUDIO__;
    state.inputs = [];
    state.current = null;

    await renderStep();
    await fireEvent.press(screen.getByLabelText('Говорить'));

    expect(await screen.findByText('Микрофон недоступен')).toBeTruthy();
    expect(screen.getByLabelText('Слушать образец')).toBeTruthy();
    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
    expect(setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsRecording: false, playsInSilentMode: true }),
    );
  });

  it('stops the sample before arming the microphone', async () => {
    const order: string[] = [];
    jest.mocked(stopLessonAudio).mockImplementation(async () => {
      order.push('stop');
    });
    jest.mocked(setAudioModeAsync).mockImplementation(async (mode) => {
      order.push(mode.allowsRecording ? 'record' : 'play');
    });

    await renderStep();
    await fireEvent.press(screen.getByLabelText('Слушать образец'));
    await fireEvent.press(screen.getByLabelText('Говорить'));

    await waitFor(() => {
      expect(order).toContain('record');
    });
    expect(order.indexOf('stop')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('stop')).toBeLessThan(order.indexOf('record'));
    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
  });

  it('paints the phrase and the ring the same color, then moves on', async () => {
    const { onContinue } = await renderStep();

    await act(async () => {
      emitTranscript('buenos dias');
    });

    expect(screen.getByText('ударение на отмеченной гласной: буЭнос дИас')).toBeTruthy();
    expect(screen.queryByText(/Это значит/)).toBeNull();
    expect(screen.queryByText(/Как звучит/)).toBeNull();
    expect(screen.getByText('93%')).toBeTruthy();
    expect(screen.getByText('buenos')).toHaveStyle({ color: colors.teal });
    expect(screen.getByText('días')).toHaveStyle({ color: colors.teal });
    expect(screen.getByText('Ещё раз')).toBeTruthy();
    expect(screen.getByText('Дальше')).toBeTruthy();
    expect(screen.queryByText('Звучит так же')).toBeNull();
    expect(screen.queryByText('Пропустить')).toBeNull();

    await fireEvent.press(screen.getByText('Дальше'));
    expect(onContinue).toHaveBeenCalledWith(true);
  });

  it('accepts a longer phrase from the recognizer when every word is clear', async () => {
    const { onContinue } = await renderStep({ promptEs: 'una mesa roja' });

    await act(async () => {
      emitTranscript('una mesa roja');
    });

    expect(screen.getByText('Дальше')).toBeTruthy();
    expect(screen.queryByText('Звучит так же')).toBeNull();
    expect(screen.queryByText(/гласной/)).toBeNull();
    await fireEvent.press(screen.getByText('Дальше'));
    expect(onContinue).toHaveBeenCalledWith(true);
  });

  it('does not accept hola when a neighbor is among the alternatives', async () => {
    await renderStep({
      promptEs: 'hola',
      confusables: ['ola', 'olla', 'hora', 'jola'],
    });

    expect(screen.queryByText(/h не читается/)).toBeNull();

    await act(async () => {
      emitTranscript('hola', { alternatives: ['jola'] });
    });

    expect(screen.getByText('h не читается: буЭнос дИас')).toBeTruthy();
    expect(screen.getByText('Дальше')).toBeTruthy();
    expect(screen.queryByText('Звучит так же')).toBeNull();
  });

  it('disables the microphone after three attempts', async () => {
    await renderStep();

    await act(async () => {
      emitTranscript('zzzz');
      emitTranscript('zzzz');
      emitTranscript('zzzz');
    });

    expect(screen.getByRole('button', { name: 'Ещё раз' })).toBeDisabled();
    expect(screen.getByText('Дальше')).toBeTruthy();
    expect(screen.queryByText('Пропустить')).toBeNull();
  });

  it('keeps listen and skip available when the microphone is blocked', async () => {
    jest.mocked(ExpoSpeechRecognitionModule.getPermissionsAsync).mockResolvedValue({
      granted: false,
      canAskAgain: false,
      expires: 'never',
      status: 'denied',
    });
    const { onSkip } = await renderStep();

    expect(await screen.findByText('Микрофон недоступен')).toBeTruthy();
    expect(screen.getByLabelText('Слушать образец')).toBeTruthy();
    expect(screen.getByText(/Без доступа можно слушать образец/)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Говорить'));
    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Слушать образец'));
    expect(playLessonAudio).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'buenos días', audio: 'a1/buenos-dias.mp3' }),
    );

    await fireEvent.press(screen.getByText('Пропустить'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('stops a take when the screen goes away', async () => {
    const { unmount } = await renderStep();

    await fireEvent.press(screen.getByLabelText('Говорить'));
    await waitFor(() => {
      expect(audioState().isRecording).toBe(true);
    });

    await unmount();

    expect(audioState().isRecording).toBe(false);
  });

  it('stops and grades about a second after the voice goes quiet', async () => {
    jest.useFakeTimers();
    try {
      await renderStep();
      await act(async () => {
        fireEvent.press(screen.getByLabelText('Говорить'));
        await jest.advanceTimersByTimeAsync(20);
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(50);
      });
      expect(audioState().isRecording).toBe(true);

      audioState().metering = -20;
      await act(async () => {
        await jest.advanceTimersByTimeAsync(400);
      });
      audioState().metering = -80;
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1_200);
      });

      expect(audioState().isRecording).toBe(false);
      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith(
        expect.objectContaining({ audioSource: { uri: 'file:///cache/take.wav' } }),
      );
    } finally {
      audioState().metering = undefined;
      jest.useRealTimers();
    }
  });

  it('stops at 8 seconds when the sample length is unknown and nobody spoke', async () => {
    jest.useFakeTimers();
    try {
      await renderStep();
      await act(async () => {
        fireEvent.press(screen.getByLabelText('Говорить'));
        await jest.advanceTimersByTimeAsync(50);
      });
      expect(audioState().isRecording).toBe(true);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(7_900);
      });
      expect(audioState().isRecording).toBe(true);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(200);
      });
      expect(audioState().isRecording).toBe(false);
      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows one pronunciation hint, and only after a miss', async () => {
    await renderStep({ promptEs: 'me llamo', sayRu: 'ме йАмо' });

    expect(screen.queryByText(/ll звучит/)).toBeNull();

    await act(async () => {
      emitTranscript('xxxx');
    });

    expect(screen.getByText('ll звучит как «й»: ме йАмо')).toBeTruthy();
    expect(screen.queryByText(/Это значит/)).toBeNull();
    expect(screen.getByText('me')).toHaveStyle({ color: colors.coralDeep });

    await fireEvent.press(screen.getByText('Ещё раз'));
    await waitFor(() => {
      expect(screen.getByLabelText('Остановить запись')).toBeTruthy();
    });
  });
});
