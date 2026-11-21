import { normalizeSearch } from './normalize';

describe('normalizeSearch', () => {
  it('folds case and Spanish diacritics', () => {
    expect(normalizeSearch('Café')).toBe('cafe');
    expect(normalizeSearch('NIÑO')).toBe('nino');
    expect(normalizeSearch('días')).toBe('dias');
  });

  it('drops opening marks, punctuation, and extra spaces', () => {
    expect(normalizeSearch('¿Qué tal?')).toBe('que tal');
    expect(normalizeSearch('¡Buenos!')).toBe('buenos');
    expect(normalizeSearch('  Hola,   mundo! ')).toBe('hola mundo');
    expect(normalizeSearch('cuenta…')).toBe('cuenta');
  });

  it('treats a blank query as empty', () => {
    expect(normalizeSearch('   ')).toBe('');
    expect(normalizeSearch('¿?')).toBe('');
  });
});
