import { pronunciationHints } from './rules';

describe('pronunciationHints', () => {
  it('shows a hint only when the reference has that sound', () => {
    expect(pronunciationHints('Hola').map((rule) => rule.id)).toEqual(['silent-h']);
    expect(pronunciationHints('ahora').map((rule) => rule.id)).toEqual([]);
    expect(pronunciationHints('chico').map((rule) => rule.id)).toEqual([]);
    expect(pronunciationHints('yo llamo').map((rule) => rule.id)).toEqual(['yeismo']);
    expect(pronunciationHints('jugo').map((rule) => rule.id)).toEqual(['jota']);
    expect(pronunciationHints('gente').map((rule) => rule.id)).toEqual(['jota']);
    expect(pronunciationHints('gato').map((rule) => rule.id)).toEqual([]);
    expect(pronunciationHints('días').map((rule) => rule.id)).toEqual(['stress']);
  });

  it('can match more than one rule in registry order', () => {
    expect(pronunciationHints('hola, yo').map((rule) => rule.id)).toEqual(['silent-h', 'yeismo']);
  });
});
