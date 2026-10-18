import { render, screen } from '@testing-library/react-native';

import { MonoText } from './StyledText';

describe('MonoText', () => {
  it('renders the provided text', async () => {
    await render(<MonoText>Vamos</MonoText>);
    expect(screen.getByText('Vamos')).toBeOnTheScreen();
  });
});
