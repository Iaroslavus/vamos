import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './Button';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('Button', () => {
  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();

    await render(<Button title="Продолжить" disabled onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();

    await render(<Button title="Продолжить" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
