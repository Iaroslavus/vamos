import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n from '@/i18n';

import { DEFAULT_STUDY_SETTINGS, type StudyUnit } from '../types';
import { LearnPause } from './LearnPause';
import { LearnSession } from './LearnSession';

jest.mock('@/features/audio/playback', () => ({
  play: jest.fn(async () => 'file'),
  playLessonAudio: jest.fn(async () => 'speech'),
  stopLessonAudio: jest.fn(async () => undefined),
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

function word(id: string, es: string, tr: string): StudyUnit {
  return {
    id,
    es,
    tr,
    audio: null,
    introduced: true,
    state: 2,
    due: false,
    hard: false,
    recall: false,
  };
}

function renderSession() {
  return render(
    host(
      <LearnSession
        units={[word('hola', 'hola', 'привет'), word('adios', 'adiós', 'пока')]}
        settings={DEFAULT_STUDY_SETTINGS}
        mic={false}
        onRecord={jest.fn(async () => undefined)}
        onClose={jest.fn()}
      />,
    ),
  );
}

describe('LearnSession', () => {
  it('shows how many of the portion are learned and moves to the next phrase', async () => {
    await renderSession();

    expect(screen.getByTestId('learn-progress')).toHaveTextContent('0 из 2 выучено');
    await fireEvent.press(screen.getByRole('button', { name: 'Привет' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Проверить' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Дальше' }));

    expect(screen.getByText('Adiós')).toBeTruthy();
    expect(screen.getByTestId('learn-progress')).toHaveTextContent('0 из 2 выучено');
  });

  it('shows the break between portions as learned out of the set', async () => {
    await render(
      host(
        <LearnPause
          kind="break"
          learned={5}
          total={7}
          misses={2}
          onContinue={jest.fn()}
          onClose={jest.fn()}
        />,
      ),
    );

    expect(screen.getByTestId('learn-break')).toBeTruthy();
    expect(screen.getByText('5 из 7 выучено')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Следующая порция' })).toBeTruthy();
  });

  it('shows the session total and the misses', async () => {
    await render(
      host(
        <LearnPause
          kind="done"
          learned={10}
          total={10}
          misses={3}
          onContinue={jest.fn()}
          onClose={jest.fn()}
        />,
      ),
    );

    expect(screen.getByTestId('learn-summary')).toBeTruthy();
    expect(screen.getByText('Сессия готова')).toBeTruthy();
    expect(screen.getByText('За сессию выучено 10 из 10.')).toBeTruthy();
    expect(screen.getByText('Ошибок по пути: 3')).toBeTruthy();
  });
});
