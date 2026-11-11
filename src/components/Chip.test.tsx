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

  it('uses a 56px full-width hit target when fill is set', async () => {
    await render(<Chip label="hola" fill onPress={() => undefined} />);

    expect(screen.getByRole('button', { name: 'hola' })).toHaveStyle({ minHeight: 56 });
  });

  it('keeps selected chips pressable for reselection', async () => {
    const onPress = jest.fn();

    await render(<Chip label="hola" selected onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
