import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { playLessonAudio } from '@/features/audio/playback';
import i18n from '@/i18n';

import { ResultSheet } from './ResultSheet';

jest.mock('@/features/audio/playback', () => ({
  playLessonAudio: jest.fn(() => Promise.resolve('speech')),
  stopLessonAudio: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

type SheetProps = ComponentProps<typeof ResultSheet>;

function renderSheet(props: SheetProps) {
  return render(
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <ResultSheet {...props} />
      </SafeAreaProvider>
    </I18nextProvider>,
  );
}

describe('ResultSheet', () => {
  it('renders nothing when hidden', async () => {
    await renderSheet({
      visible: false,
      variant: 'success',
      title: 'Отлично!',
      onContinue: jest.fn(),
    });

    expect(screen.queryByText('Отлично!')).toBeNull();
  });

  it('calls onContinue from the continue button', async () => {
    const onContinue = jest.fn();

    await renderSheet({
      visible: true,
      variant: 'success',
      title: 'Отлично!',
      onContinue,
    });

    fireEvent.press(screen.getByRole('button', { name: 'Дальше' }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('renders error title', async () => {
    await renderSheet({
      visible: true,
      variant: 'error',
      title: 'Неверно',
      message: 'Попробуй ещё раз',
      onContinue: jest.fn(),
    });

    expect(screen.getByText('Неверно')).toBeOnTheScreen();
    expect(screen.getByText('Попробуй ещё раз')).toBeOnTheScreen();
  });

  it('shows the Spanish phrase, its translation, listen, and the phrasebook', async () => {
    const onSave = jest.fn();
    await renderSheet({
      visible: true,
      variant: 'success',
      title: 'Верно!',
      phraseEs: 'buenas tardes',
      phraseTr: 'добрий день',
      speakText: 'buenas tardes',
      autoPlay: true,
      onSave,
      onContinue: jest.fn(),
    });

    expect(screen.getByText('buenas tardes')).toBeOnTheScreen();
    expect(screen.getByText('добрий день')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Слушать' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'В словник' })).toBeOnTheScreen();
    expect(playLessonAudio).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'buenas tardes' }),
    );

    fireEvent.press(screen.getByRole('button', { name: 'В словник' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('labels the correct phrase when the answer was wrong and does not autoplay', async () => {
    jest.mocked(playLessonAudio).mockClear();
    await renderSheet({
      visible: true,
      variant: 'error',
      title: 'Неверно',
      correctLabel: 'Правильно:',
      phraseEs: 'buenas tardes',
      phraseTr: 'добрий день',
      speakText: 'buenas tardes',
      autoPlay: false,
      onContinue: jest.fn(),
    });

    expect(screen.getByText('Правильно:')).toBeOnTheScreen();
    expect(screen.getByText('buenas tardes')).toBeOnTheScreen();
    expect(screen.getByText('добрий день')).toBeOnTheScreen();
    expect(playLessonAudio).not.toHaveBeenCalled();
  });

  it('lists pairs and marks the ones that were chosen wrong', async () => {
    await renderSheet({
      visible: true,
      variant: 'error',
      title: 'Есть ошибки: 1',
      pairs: [
        { text: 'buenas tardes — добрий день', wrong: false },
        { text: 'hola — привіт ✗', wrong: true },
      ],
      onContinue: jest.fn(),
    });

    expect(screen.getByText('buenas tardes — добрий день')).toBeOnTheScreen();
    expect(screen.getByText('hola — привіт ✗')).toBeOnTheScreen();
    expect(screen.queryByText(/::/)).toBeNull();
    expect(screen.queryByText(/\|/)).toBeNull();
  });
});
