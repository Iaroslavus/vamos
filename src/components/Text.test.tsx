import { render, screen } from '@testing-library/react-native';

import { Text } from './Text';
import { fonts, type } from '@/theme/tokens';

describe('Text', () => {
  it('renders children', async () => {
    await render(<Text>Hola</Text>);
    expect(screen.getByText('Hola')).toBeOnTheScreen();
  });

  it('applies body type token by default', async () => {
    await render(<Text>Body</Text>);
    expect(screen.getByText('Body')).toHaveStyle({
      fontFamily: fonts.body,
      fontSize: type.body.fontSize,
    });
  });

  it('applies display font for h1', async () => {
    await render(<Text variant="h1">Título</Text>);
    expect(screen.getByText('Título')).toHaveStyle({
      fontFamily: fonts.display,
      fontSize: type.h1.fontSize,
    });
  });
});
