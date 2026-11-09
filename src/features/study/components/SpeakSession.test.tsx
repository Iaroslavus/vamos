import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n';

import type { StudySpeakStep } from '../types';
import { SpeakSession } from './SpeakSession';

jest.mock('@/features/speech/components/SpeakPractice', () => {
  // Jest mocks are hoisted above imports, so the factory loads React itself.
  /* eslint-disable @typescript-eslint/no-require-imports -- mock factories are hoisted above imports */
  const React = require('react') as typeof import('react');
  const { Pressable: MockPressable, Text: MockText } =
    require('react-native') as typeof import('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */

  return {
    SpeakPractice: ({
      phrase,
      passScore,
      onContinue,
      onSkip,
      onAttemptsUsed,
    }: {
      phrase: string;
      passScore?: number;
      onContinue?: () => void;
      onSkip?: () => void;
      onAttemptsUsed?: (count: number) => void;
    }) =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement(MockText, null, phrase),
        React.createElement(MockText, null, `pass ${passScore}`),
        React.createElement(MockPressable, {
          accessibilityRole: 'button',
          accessibilityLabel: 'mark-one',
          onPress: () => onAttemptsUsed?.(1),
        }),
        React.createElement(MockPressable, {
          accessibilityRole: 'button',
          accessibilityLabel: 'mark-two',
          onPress: () => onAttemptsUsed?.(2),
        }),
        React.createElement(MockPressable, {
          accessibilityRole: 'button',
          accessibilityLabel: 'say-continue',
          onPress: () => onContinue?.(),
        }),
        React.createElement(MockPressable, {
          accessibilityRole: 'button',
          accessibilityLabel: 'say-skip',
          onPress: () => onSkip?.(),
        }),
      ),
  };
});

function host(children: ReactNode) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

function step(id: string, es: string, passScore: number): StudySpeakStep {
  return {
    id,
    type: 'speak_repeat',
    autoplay: false,
    itemId: id,
    direction: 'es_to_ru',
    promptKey: 'speak',
    promptEs: es,
    phraseTr: 'перевод',
    audio: null,
    accentStrictness: 'strict',
    passScore,
  };
}

describe('SpeakSession', () => {
  it('sends each phrase through practice and grades the takes', async () => {
    const onRecord = jest.fn(async () => undefined);
    await render(
      host(
        <SpeakSession
          steps={[step('a', 'hola', 85), step('b', 'adiós', 70)]}
          onRecord={onRecord}
          onClose={jest.fn()}
        />,
      ),
    );

    expect(screen.getByText('hola')).toBeTruthy();
    expect(screen.getByText('pass 85')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'mark-one' }));
    await fireEvent.press(screen.getByRole('button', { name: 'say-continue' }));
    expect(onRecord).toHaveBeenLastCalledWith(
      expect.objectContaining({ itemId: 'a', grade: 'correct_first' }),
    );

    expect(screen.getByText('adiós')).toBeTruthy();
    expect(screen.getByText('pass 70')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'mark-two' }));
    await fireEvent.press(screen.getByRole('button', { name: 'say-continue' }));
    expect(onRecord).toHaveBeenLastCalledWith(
      expect.objectContaining({ itemId: 'b', grade: 'correct_after_error' }),
    );
    expect(screen.getByText('Готово')).toBeTruthy();
  });
});
