import { REVIEWS_DUE, skillBars } from './overview';

describe('progress overview', () => {
  it('keeps reviews at zero until FSRS exists', () => {
    expect(REVIEWS_DUE).toBe(0);
  });

  it('lists the four skills with an empty score', () => {
    expect(skillBars()).toEqual([
      { id: 'vocabulary', progress: 0 },
      { id: 'grammar', progress: 0 },
      { id: 'listening', progress: 0 },
      { id: 'speaking', progress: 0 },
    ]);
  });
});
