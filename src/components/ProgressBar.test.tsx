import { render, screen } from '@testing-library/react-native';

import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('exposes clamped progress to accessibility', async () => {
    await render(<ProgressBar progress={0.42} accessibilityLabel="Урок" />);

    expect(screen.getByLabelText('Урок')).toHaveProp('accessibilityValue', {
      min: 0,
      max: 100,
      now: 42,
    });
  });
});
