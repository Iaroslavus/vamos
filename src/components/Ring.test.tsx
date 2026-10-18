import { render, screen } from '@testing-library/react-native';

import { Ring } from './Ring';

describe('Ring', () => {
  it('renders progress label and accessibility value', async () => {
    await render(<Ring progress={0.75} label="3/4" />);

    expect(screen.getByText('3/4')).toBeOnTheScreen();
    expect(screen.getByLabelText('3/4')).toHaveProp('accessibilityValue', {
      min: 0,
      max: 100,
      now: 75,
    });
  });
});
