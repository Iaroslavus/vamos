import { searchPhrases, type PhraseCandidate } from './phraseSearch';

const PHRASES: readonly PhraseCandidate[] = [
  { id: 'hola.hola', es: 'hola', translation: 'привет' },
  { id: 'hola.adios', es: 'adiós', translation: 'до свидания' },
  { id: 'hola.buenos_dias', es: 'buenos días', translation: 'доброе утро' },
  { id: 'cafe.cafe', es: 'un café', translation: 'кава' },
];

describe('searchPhrases', () => {
  it('finds a phrase by Spanish, with or without accents', () => {
    expect(searchPhrases(PHRASES, 'hol').map((item) => item.id)).toEqual(['hola.hola']);
    expect(searchPhrases(PHRASES, '  ADIOS ').map((item) => item.id)).toEqual(['hola.adios']);
    expect(searchPhrases(PHRASES, 'cafe').map((item) => item.id)).toEqual(['cafe.cafe']);
  });

  it('finds a phrase by the interface translation', () => {
    expect(searchPhrases(PHRASES, 'ПРИВЕТ').map((item) => item.id)).toEqual(['hola.hola']);
    expect(searchPhrases(PHRASES, 'доброе').map((item) => item.id)).toEqual(['hola.buenos_dias']);
    expect(searchPhrases(PHRASES, 'кава').map((item) => item.id)).toEqual(['cafe.cafe']);
  });

  it('returns nothing for a blank query and lists each phrase once', () => {
    expect(searchPhrases(PHRASES, '   ')).toEqual([]);
    const doubled = [...PHRASES, { id: 'hola.hola', es: 'hola', translation: 'привет' }];
    expect(searchPhrases(doubled, 'hola').filter((item) => item.id === 'hola.hola')).toHaveLength(
      1,
    );
  });
});
