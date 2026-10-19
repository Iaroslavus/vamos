import { fireEvent, render, screen } from '@testing-library/react-native';

import { Chip } from './Chip';

describe('Chip', () => {
  it('calls onPress when available', async () => {
    const onPress = jest.fn();

    await render(<Chip label="hola" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when used', async () => {
    const onPress = jest.fn();

    await render(<Chip label="hola" used onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();

    await render(<Chip label="hola" disabled onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps selected chips pressable for reselection', async () => {
    const onPress = jest.fn();

    await render(<Chip label="hola" selected onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
