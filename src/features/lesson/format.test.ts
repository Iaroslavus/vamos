import { formatAccuracyPercent, formatElapsed } from './format';

describe('formatElapsed', () => {
  it('formats minutes and seconds', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(65_000)).toBe('1:05');
    expect(formatElapsed(125_500)).toBe('2:05');
  });
});

describe('formatAccuracyPercent', () => {
  it('rounds to whole percent', () => {
    expect(formatAccuracyPercent(0)).toBe('0%');
    expect(formatAccuracyPercent(0.875)).toBe('88%');
    expect(formatAccuracyPercent(1)).toBe('100%');
  });
});
