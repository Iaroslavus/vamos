import {
  gradeAnswer,
  isWithinTypoTolerance,
  levenshtein,
  normalizeForCompare,
  normalizeWithoutDiacritics,
  stripDiacritics,
} from './grading';

describe('normalizeForCompare', () => {
  it('trims and lowercases', () => {
    expect(normalizeForCompare('  Hola  ')).toBe('hola');
  });

  it('collapses inner whitespace', () => {
    expect(normalizeForCompare('me   llamo   Ana')).toBe('me llamo ana');
  });

  it('strips inverted question and exclamation marks', () => {
    expect(normalizeForCompare('¿Cómo te llamas?')).toBe('cómo te llamas');
    expect(normalizeForCompare('¡Hola!')).toBe('hola');
  });

  it('strips common punctuation but keeps letters', () => {
    expect(normalizeForCompare('Buenos días.')).toBe('buenos días');
    expect(normalizeForCompare('por favor,')).toBe('por favor');
  });

  it('keeps Spanish ñ and accented vowels at this stage', () => {
    expect(normalizeForCompare('España')).toBe('españa');
    expect(normalizeForCompare('café')).toBe('café');
  });
});

describe('stripDiacritics / normalizeWithoutDiacritics', () => {
  it('removes acute accents', () => {
    expect(stripDiacritics('café')).toBe('cafe');
    expect(stripDiacritics('días')).toBe('dias');
  });

  it('keeps ñ as a distinct letter (not n + tilde fold to n only via NFD of ñ)', () => {
    // ñ decomposes to n + combining tilde in NFD — strip turns it into n
    expect(stripDiacritics('España')).toBe('Espana');
  });

  it('normalizeWithoutDiacritics combines normalize + strip', () => {
    expect(normalizeWithoutDiacritics('¿Café?!')).toBe('cafe');
  });
});

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('gracias', 'gracias')).toBe(0);
  });

  it('counts a single substitution', () => {
    expect(levenshtein('gracias', 'gracies')).toBe(1);
  });

  it('counts insertion and deletion', () => {
    expect(levenshtein('hola', 'holaa')).toBe(1);
    expect(levenshtein('hola', 'hla')).toBe(1);
  });

  it('returns length when comparing to empty', () => {
    expect(levenshtein('abc', '')).toBe(3);
    expect(levenshtein('', 'ab')).toBe(2);
  });
});

describe('isWithinTypoTolerance', () => {
  it('allows one typo in a word longer than 4 letters', () => {
    expect(isWithinTypoTolerance('gracias', 'gracies')).toBe(true);
  });

  it('rejects typos in words of length 4 or less', () => {
    expect(isWithinTypoTolerance('hols', 'hola')).toBe(false);
    expect(isWithinTypoTolerance('casa', 'caso')).toBe(false);
  });

  it('requires the same number of words', () => {
    expect(isWithinTypoTolerance('mucho gusto', 'mucho')).toBe(false);
  });

  it('allows one typo per long word in a phrase', () => {
    expect(isWithinTypoTolerance('mucha gusto', 'mucho gusto')).toBe(true);
  });
});

describe('gradeAnswer', () => {
  it('marks exact match as correct', () => {
    expect(gradeAnswer({ userAnswer: 'hola', answer: 'hola' })).toEqual({
      status: 'correct',
      correctAnswer: 'hola',
    });
  });

  it('ignores case and surrounding spaces', () => {
    expect(gradeAnswer({ userAnswer: '  HOLA ', answer: 'hola' }).status).toBe('correct');
  });

  it('ignores ¿¡ and punctuation', () => {
    const result = gradeAnswer({
      userAnswer: '¿Cómo te llamas?',
      answer: 'Cómo te llamas',
    });
    expect(result.status).toBe('correct');
  });

  it('accepts variants from the accepted list', () => {
    const result = gradeAnswer({
      userAnswer: 'Buenos dias',
      answer: 'Buenos días',
      accepted: ['Buenos dias', 'buenos días'],
    });
    // "Buenos dias" without accent vs answer with accent:
    // if accepted includes exact normalized form without needing accent path
    expect(result.status).toBe('correct');
    expect(result.correctAnswer).toBe('Buenos días');
  });

  it('returns almost with accent note when only diacritics differ', () => {
    const result = gradeAnswer({
      userAnswer: 'cafe',
      answer: 'café',
    });
    expect(result).toEqual({
      status: 'almost',
      correctAnswer: 'café',
      note: 'Почти верно: забыт акцент',
    });
  });

  it('returns almost for missing accents in a phrase', () => {
    const result = gradeAnswer({
      userAnswer: 'buenos dias',
      answer: 'Buenos días',
    });
    expect(result.status).toBe('almost');
    expect(result.note).toBe('Почти верно: забыт акцент');
  });

  it('returns almost with typo note for one edit in a long word', () => {
    const result = gradeAnswer({
      userAnswer: 'gracies',
      answer: 'gracias',
    });
    expect(result).toEqual({
      status: 'almost',
      correctAnswer: 'gracias',
      note: 'Почти верно: небольшая опечатка',
    });
  });

  it('does not forgive typos in short words', () => {
    const result = gradeAnswer({
      userAnswer: 'hols',
      answer: 'hola',
    });
    expect(result).toEqual({ status: 'wrong', correctAnswer: 'hola' });
  });

  it('marks clearly wrong answers as wrong', () => {
    expect(gradeAnswer({ userAnswer: 'adiós', answer: 'hola' })).toEqual({
      status: 'wrong',
      correctAnswer: 'hola',
    });
  });

  it('treats empty / whitespace-only input as wrong', () => {
    expect(gradeAnswer({ userAnswer: '   ', answer: 'hola' }).status).toBe('wrong');
    expect(gradeAnswer({ userAnswer: '', answer: 'hola' }).status).toBe('wrong');
  });

  it('prefers correct over almost when an accepted variant matches exactly', () => {
    const result = gradeAnswer({
      userAnswer: 'de nada',
      answer: 'De nada',
      accepted: ['De nada', 'Denada'],
    });
    expect(result.status).toBe('correct');
    expect(result.note).toBeUndefined();
  });

  it('matches accepted list after punctuation normalization', () => {
    const result = gradeAnswer({
      userAnswer: '¡Gracias!',
      answer: 'Muchas gracias',
      accepted: ['gracias'],
    });
    expect(result.status).toBe('correct');
    expect(result.correctAnswer).toBe('Muchas gracias');
  });

  it('can almost-match via accepted candidate accents', () => {
    const result = gradeAnswer({
      userAnswer: 'que tal',
      answer: 'Hola',
      accepted: ['qué tal'],
    });
    expect(result.status).toBe('almost');
    expect(result.note).toBe('Почти верно: забыт акцент');
    expect(result.correctAnswer).toBe('Hola');
  });

  it('rejects two typos in one long word', () => {
    const result = gradeAnswer({
      userAnswer: 'graciesx',
      answer: 'gracias',
    });
    // graciesx vs gracias: more than 1 edit
    expect(result.status).toBe('wrong');
  });
});
