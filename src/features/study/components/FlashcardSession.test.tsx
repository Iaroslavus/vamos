import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

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

  it('flips, counts both piles, replays still-learning, and pins them', async () => {
    const onAdd = jest.fn(async () => undefined);
    await renderSession([hola, adios], onAdd);

    expect(screen.getByText('1 / 2')).toBeTruthy();
    expect(screen.getByLabelText('Перемешать').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false }),
    );

    await fireEvent.press(screen.getByRole('button', { name: /Перевернуть карточку/ }));
    expect(screen.getByRole('button', { name: /Привет/ }).props.accessibilityState).toEqual(
      expect.objectContaining({ expanded: true }),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Знаю' }));
    expect(screen.getByText('2 / 2')).toBeTruthy();
    expect(screen.getByText('Adiós')).toBeTruthy();
    expect(screen.getByLabelText('Перемешать').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Ещё учу' }));
    expect(screen.getByText('Знаю 1 / Ещё учу 1')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Повторить «ещё учу»' }));
    expect(screen.getByText('1 / 1')).toBeTruthy();
    expect(screen.getByText('Adiós')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Ещё учу' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Добавить в Сложные' }));
    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(['missing.adios']);
    });
    expect(
      screen.getByRole('button', { name: 'Добавлено в Сложные' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: true }));
  });

  it('speaks a bundled phrase at normal speed and a missing one slowly', async () => {
    const first = await renderSession([hola]);

    await fireEvent.press(screen.getByRole('button', { name: 'Обычно' }));
    await waitFor(() => {
      expect(play).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'hola.hola', es: 'hola' }),
        'normal',
        'es',
      );
    });
    await first.unmount();

    await renderSession([adios]);
    await fireEvent.press(screen.getByRole('button', { name: 'Медленно' }));
    await waitFor(() => {
      expect(playLessonAudio).toHaveBeenCalledWith({
        text: 'adiós',
        audio: null,
        rate: 0.7,
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

    await fireEvent.press(screen.getByRole('button', { name: /Перевернуть карточку/ }));
    await waitFor(() => {
      expect(play).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'hola.hola' }),
        'normal',
        'es',
      );
    });
  });

  it('keeps the summary usable when pinning fails', async () => {
    const onAdd = jest.fn(async () => Promise.reject(new Error('full')));
    await renderSession([adios], onAdd);
    await fireEvent.press(screen.getByRole('button', { name: 'Ещё учу' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Добавить в Сложные' }));
    expect(
      await screen.findByText('Не удалось добавить в Сложные. Попробуйте ещё раз.'),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Добавить в Сложные' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: false }));
  });
});

function renderSession(
  steps: readonly StudyFlashcardStep[],
  onAdd: (itemIds: readonly string[]) => Promise<void> = async () => undefined,
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <FlashcardSession steps={steps} onClose={jest.fn()} onAddDifficult={onAdd} />
    </I18nextProvider>,
  );
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
