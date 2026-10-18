import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ResultSheet } from './ResultSheet';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

type SheetProps = ComponentProps<typeof ResultSheet>;

function renderSheet(props: SheetProps) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <ResultSheet {...props} />
    </SafeAreaProvider>,
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
});
