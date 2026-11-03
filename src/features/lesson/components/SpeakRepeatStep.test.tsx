import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { playLessonAudio } from '@/features/audio/playback';
import i18n from '@/i18n';

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
  confusables = [] as string[],
}: {
  onSkip?: jest.Mock;
  onContinue?: jest.Mock;
  promptEs?: string;
  confusables?: string[];
} = {}) {
  await render(
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider initialMetrics={safeArea}>
        <SpeakRepeatStep
          promptEs={promptEs}
          audio="a1/buenos-dias.mp3"
          sayRu="буЭнос дИас"
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
  return { onSkip, onContinue };
}

describe('SpeakRepeatStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(ExpoSpeechRecognitionModule.getPermissionsAsync).mockResolvedValue(granted);
    jest.mocked(ExpoSpeechRecognitionModule.requestPermissionsAsync).mockResolvedValue(granted);
    jest.mocked(ExpoSpeechRecognitionModule.supportsOnDeviceRecognition).mockReturnValue(true);
    jest.mocked(ExpoSpeechRecognitionModule.getSupportedLocales).mockResolvedValue({
      locales: ['es-ES'],
      installedLocales: ['es-ES'],
    });
  });

  it('shows the phrase, the sample, the attempts and skip', async () => {
    await renderStep();

    expect(screen.getByText('Скажите вслух')).toBeTruthy();
    expect(screen.getByText('buenos')).toBeTruthy();
    expect(screen.getByText('días')).toBeTruthy();
    expect(screen.getByText('Слушать образец')).toBeTruthy();
    expect(screen.getByText('Пропустить')).toBeTruthy();
    expect(screen.getByText('Осталось 3 попытки')).toBeTruthy();
    expect(screen.getByText('Проверяем, понятно ли вы сказали.')).toBeTruthy();
    expect(screen.getByText('Ударение там, где стоит знак ударения.')).toBeTruthy();
  });

  it('grades a short phrase without the reference and keeps a temp recording', async () => {
    await renderStep();

    await fireEvent.press(screen.getByLabelText('Говорить'));

    await waitFor(() => {
      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith(
        expect.objectContaining({
          lang: 'es-ES',
          requiresOnDeviceRecognition: true,
          maxAlternatives: 5,
          recordingOptions: { persist: true },
        }),
      );
    });
    const options = jest.mocked(ExpoSpeechRecognitionModule.start).mock.calls[0]?.[0];
    expect(options).not.toHaveProperty('contextualStrings');
    expect(options).not.toHaveProperty('audioSource');
  });

  it('grades a longer phrase without saving audio or hinting the reference', async () => {
    await renderStep({ promptEs: 'una mesa roja' });

    expect(screen.getByText(/Запись не сохраняется/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Говорить'));

    await waitFor(() => {
      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalled();
    });
    const options = jest.mocked(ExpoSpeechRecognitionModule.start).mock.calls[0]?.[0];
    expect(options).not.toHaveProperty('contextualStrings');
    expect(options).not.toHaveProperty('recordingOptions');
  });

  it('colors the words, shows the percent and the problem hint', async () => {
    const { onContinue } = await renderStep();

    await act(async () => {
      emitTranscript('buenos dias');
    });

    expect(screen.getByText('Почти «días» — проверьте ударение.')).toBeTruthy();
    expect(screen.getByText('Это значит «утро».')).toBeTruthy();
    expect(screen.getByText('Как звучит: буЭнос дИас')).toBeTruthy();
    expect(screen.getByText('93%')).toBeTruthy();
    expect(screen.getByText('Осталось 2 попытки')).toBeTruthy();
    expect(screen.getByText('Звучит так же')).toBeTruthy();
    expect(screen.getByText('Ещё раз')).toBeTruthy();
    expect(screen.queryByText('Дальше')).toBeNull();

    await fireEvent.press(screen.getByText('Звучит так же'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('accepts a longer phrase from the recognizer when every word is clear', async () => {
    const { onContinue } = await renderStep({ promptEs: 'una mesa roja' });

    await act(async () => {
      emitTranscript('una mesa roja');
    });

    expect(screen.getByText('Дальше')).toBeTruthy();
    expect(screen.queryByText('Звучит так же')).toBeNull();
    await fireEvent.press(screen.getByText('Дальше'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('does not accept hola when a neighbor is among the alternatives', async () => {
    await renderStep({
      promptEs: 'hola',
      confusables: ['ola', 'olla', 'hora', 'jola'],
    });

    expect(screen.getByText('h в начале слова не читается.')).toBeTruthy();

    await act(async () => {
      emitTranscript('hola', { alternatives: ['jola'] });
    });

    expect(screen.getByText('Почти «hola». Послушайте образец ещё раз.')).toBeTruthy();
    expect(screen.queryByText('Дальше')).toBeNull();
    expect(screen.getByText('Звучит так же')).toBeTruthy();
  });

  it('disables the microphone after three attempts', async () => {
    await renderStep();

    await act(async () => {
      emitTranscript('zzzz');
      emitTranscript('zzzz');
      emitTranscript('zzzz');
    });

    expect(screen.getByLabelText('Говорить')).toBeDisabled();
    expect(screen.getByText('Пропустить')).toBeTruthy();
    expect(screen.queryByText('Дальше')).toBeNull();
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
    expect(screen.getByText('Слушать образец')).toBeTruthy();
    expect(screen.getByText(/Без доступа можно слушать образец/)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Говорить'));
    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Слушать образец'));
    expect(playLessonAudio).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'buenos días', audio: 'a1/buenos-dias.mp3' }),
    );

    await fireEvent.press(screen.getByText('Пропустить'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
