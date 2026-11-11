import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { play, playLessonAudio } from '@/features/audio/playback';
import i18n from '@/i18n';

import { FlashcardSession } from './FlashcardSession';
import type { StudyFlashcardStep } from '../types';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('@/features/audio/playback', () => ({
  play: jest.fn(async () => 'file'),
  playLessonAudio: jest.fn(async () => 'speech'),
  stopLessonAudio: jest.fn(async () => undefined),
  NORMAL_RATE: 1,
  SLOW_RATE: 0.7,
}));

const hola = card('hola.hola', 'hola', 'привет');
const adios = card('missing.adios', 'adiós', 'пока');

describe('FlashcardSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('flips, counts both piles, and replays still-learning', async () => {
    const onStillLearning = jest.fn();
    await renderSession([hola, adios], onStillLearning);

    expect(screen.getByText('1 / 2')).toBeTruthy();
    await openMenu();
    expect(screen.getByLabelText('Перемешать').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false }),
    );
    await closeMenu();

    await fireEvent.press(screen.getAllByRole('button', { name: /Перевернуть карточку/ })[0]!);
    expect(screen.getAllByRole('button', { name: /Привет/ })[0]?.props.accessibilityState).toEqual(
      expect.objectContaining({ expanded: true }),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Знаю' }));
    expect(screen.getByText('2 / 2')).toBeTruthy();
    expect(screen.getByText('Adiós')).toBeTruthy();
    await openMenu();
    expect(screen.getByLabelText('Перемешать').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    await closeMenu();

    await fireEvent.press(screen.getByRole('button', { name: 'Ещё учу' }));
    expect(screen.getByText('Знаю 1 · Ещё учу 1')).toBeTruthy();
    expect(onStillLearning).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 'missing.adios',
        direction: 'es_to_ru',
        clientId: 'flash-again:missing.adios:es_to_ru:1',
      }),
    );
    expect(screen.queryByRole('button', { name: 'Добавить в Сложные' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'К папке' })).toBeNull();
    expect(screen.getByText('Пока')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Повторить «ещё учу»' }));
    expect(screen.getByText('1 / 1')).toBeTruthy();
    expect(screen.getByText('Adiós')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Ещё учу' }));
    expect(screen.getByRole('button', { name: 'Готово' })).toBeTruthy();
    expect(onStillLearning).toHaveBeenCalledTimes(2);
  });

  it('speaks a bundled phrase at normal speed and a missing one slowly', async () => {
    const first = await renderSession([hola]);

    await fireEvent.press(screen.getAllByRole('button', { name: 'Слушать' })[0]!);
    await waitFor(() => {
      expect(play).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'hola.hola', es: 'hola' }),
        'normal',
        'es',
      );
    });
    await first.unmount();

    await renderSession([adios]);
    await fireEvent.press(screen.getAllByRole('button', { name: 'Медленно' })[0]!);
    await waitFor(() => {
      expect(playLessonAudio).toHaveBeenCalledWith({
        text: 'adiós',
        rate: 0.7,
        language: 'es-ES',
      });
    });
  });

  it('autoplays Spanish only while that face is showing', async () => {
    await renderSession([
      card('hola.hola', 'привет', 'hola', {
        autoplay: true,
        direction: 'ru_to_es',
        phraseEs: 'hola',
        phraseTr: 'привет',
      }),
    ]);
    expect(play).not.toHaveBeenCalled();

    await fireEvent.press(screen.getAllByRole('button', { name: /Перевернуть карточку/ })[0]!);
    await waitFor(() => {
      expect(play).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'hola.hola' }),
        'normal',
        'es',
      );
    });
  });

  it('celebrates a round with nothing left to learn', async () => {
    await renderSession([hola]);
    await fireEvent.press(screen.getByRole('button', { name: 'Знаю' }));
    expect(screen.getByText('Без единой ошибки!')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Повторить «ещё учу»' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Готово' })).toBeTruthy();
  });
});

function renderSession(
  steps: readonly StudyFlashcardStep[],
  onStillLearning: (input: {
    itemId: string;
    direction: StudyFlashcardStep['direction'];
    clientId: string;
  }) => void = () => undefined,
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <FlashcardSession steps={steps} onClose={jest.fn()} onStillLearning={onStillLearning} />
      </SafeAreaProvider>
    </I18nextProvider>,
  );
}

async function openMenu() {
  await fireEvent.press(screen.getByLabelText('Меню сессии'));
}

async function closeMenu() {
  const closes = screen.getAllByLabelText('Закрыть');
  await fireEvent.press(closes[closes.length - 1]!);
}

function card(
  id: string,
  front: string,
  back: string,
  extra: Partial<StudyFlashcardStep> = {},
): StudyFlashcardStep {
  return {
    id,
    type: 'flashcard',
    autoplay: false,
    itemId: id,
    direction: 'es_to_ru',
    front,
    back,
    phraseEs: front,
    phraseTr: back,
    audio: null,
    ...extra,
  };
}
