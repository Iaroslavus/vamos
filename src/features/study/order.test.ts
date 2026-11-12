import { shuffleFrom } from './order';

describe('shuffleFrom', () => {
  it('leaves answered items in place and keeps every remaining one', () => {
    const shuffled = shuffleFrom(['a', 'b', 'c', 'd'], 1, () => 0);
    expect(shuffled[0]).toBe('a');
    expect(shuffled.slice(1).sort()).toEqual(['b', 'c', 'd']);
    expect(shuffled).not.toEqual(['a', 'b', 'c', 'd']);
  });

  it('does nothing when fewer than two items remain', () => {
    expect(shuffleFrom(['a', 'b'], 1, () => 0)).toEqual(['a', 'b']);
    expect(shuffleFrom(['only'], 0, () => 0.5)).toEqual(['only']);
  });
});
