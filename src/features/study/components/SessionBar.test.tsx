import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n from '@/i18n';

import { DEFAULT_STUDY_SETTINGS } from '../types';
import { SessionBar } from './SessionBar';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
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

describe('SessionBar', () => {
  it('counts the place and keeps shuffle in the menu', async () => {
    const onShuffle = jest.fn();
    await render(
      host(<SessionBar current={2} total={4} onClose={jest.fn()} onShuffle={onShuffle} />),
    );

    expect(screen.getByTestId('session-counter')).toHaveTextContent('2 / 4');
    expect(screen.queryByLabelText('Перемешать')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Меню сессии'));
    await fireEvent.press(screen.getByLabelText('Перемешать'));
    expect(onShuffle).toHaveBeenCalledTimes(1);
  });

  it('leaves the timer off until the session setting turns it on', async () => {
    const onChange = jest.fn();
    await render(
      host(
        <SessionBar
          current={1}
          total={3}
          onClose={jest.fn()}
          settings={DEFAULT_STUDY_SETTINGS}
          onChangeSettings={onChange}
        />,
      ),
    );

    await fireEvent.press(screen.getByLabelText('Меню сессии'));
    expect(screen.getByLabelText('Перемешать').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    await fireEvent.press(screen.getByLabelText('Настройки сессии'));
    const toggle = screen.getByLabelText('Показывать таймер');
    expect(toggle.props.value).toBe(false);
    await fireEvent(toggle, 'valueChange', true);
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_STUDY_SETTINGS, showTimer: true });
  });
});
