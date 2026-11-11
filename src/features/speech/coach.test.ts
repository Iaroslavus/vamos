import { pronunciationCoach } from './coach';

describe('pronunciationCoach', () => {
  it('picks the rule for the missed word', () => {
    expect(pronunciationCoach('me llamo', 'llamo')?.id).toBe('yeismo');
    expect(pronunciationCoach('hola', 'hola')?.id).toBe('silent-h');
  });

  it('falls back to the phrase rule when the missed word has none', () => {
    expect(pronunciationCoach('me llamo', 'me')?.id).toBe('yeismo');
  });

  it('returns one rule when several could apply', () => {
    expect(pronunciationCoach('hola, yo', 'yo')?.id).toBe('yeismo');
    expect(pronunciationCoach('hola, yo', 'hola')?.id).toBe('silent-h');
  });

  it('returns nothing when the phrase has no pronunciation rule', () => {
    expect(pronunciationCoach('una mesa', 'mesa')).toBeNull();
  });
});
