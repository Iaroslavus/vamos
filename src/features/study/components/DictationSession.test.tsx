import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { playLessonAudio } from '@/features/audio/playback';
import i18n from '@/i18n';

import type { StudyRecordInput } from '../hooks/useStudyPlayer';
import type { StudyUnit } from '../types';
import { DictationSession } from './DictationSession';

jest.mock('@/features/audio/playback', () => ({
  play: jest.fn(async () => 'file'),
  playLessonAudio: jest.fn(async () => 'speech'),
  stopLessonAudio: jest.fn(async () => undefined),
  NORMAL_RATE: 1,
  SLOW_RATE: 0.7,
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

const safeArea = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function host(children: ReactNode) {
  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider initialMetrics={safeArea}>{children}</SafeAreaProvider>
    </I18nextProvider>
  );
}

const adios: StudyUnit = {
  id: 'missing.adios',
  es: 'adiós',
  tr: 'пока',
  audio: null,
  introduced: true,
  state: 1,
  due: false,
  hard: false,
  recall: false,
};

describe('DictationSession', () => {
  it('plays the phrase, charges a revealed letter, and grades the typed answer', async () => {
    const onRecord = jest.fn(async () => undefined);
    await render(
      host(<DictationSession units={[adios]} onRecord={onRecord} onClose={jest.fn()} />),
    );

    expect(screen.getByText('·····')).toBeTruthy();
    expect(screen.getByText('Баллы за фразу: 10')).toBeTruthy();
    expect(playLessonAudio).toHaveBeenCalledWith({
      text: 'adiós',
      rate: 1,
      language: 'es-ES',
    });

    await fireEvent.press(screen.getByRole('button', { name: /Открыть букву/ }));
    expect(screen.getByText('a····')).toBeTruthy();
    expect(screen.getByText('Баллы за фразу: 9')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Напишите, что слышите'), 'adiós');
    await fireEvent.press(screen.getByRole('button', { name: 'Проверить' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Дальше' }));

    expect(onRecord).toHaveBeenCalledWith({
      itemId: 'missing.adios',
      direction: 'es_to_ru',
      grade: 'correct_after_error',
      stepId: 'dictation-missing.adios',
    } satisfies StudyRecordInput);
    expect(screen.getByText('Диктант готов')).toBeTruthy();
    expect(screen.getByText('Баллы: 9')).toBeTruthy();
  });
});
