import { glossForWord, isSpeechPass, matchSpokenOption, scoreSpeech, speechWords } from './score';

describe('scoreSpeech', () => {
  it('marks an exact phrase as ok with a perfect score', () => {
    const result = scoreSpeech('buenos días', 'buenos días');

    expect(result.words.map((word) => word.mark)).toEqual(['ok', 'ok']);
    expect(result.score).toBe(100);
    expect(result.problem).toBeNull();
    expect(isSpeechPass(result)).toBe(true);
  });

  it('ignores case and repeated whitespace', () => {
    const result = scoreSpeech('  Hola   amigos\n', 'hola amigos');

    expect(result.words.map((word) => word.mark)).toEqual(['ok', 'ok']);
    expect(result.score).toBe(100);
  });

  it('ignores Spanish punctuation around words', () => {
    const result = scoreSpeech('¿Cómo te llamas?', 'cómo te llamas');

    expect(result.words.map((word) => word.expected)).toEqual(['Cómo', 'te', 'llamas']);
    expect(result.score).toBe(100);
    expect(result.problem).toBeNull();
  });

  it('treats a missing accent as close, not a miss', () => {
    const result = scoreSpeech('sí', 'si');

    expect(result.words[0]).toMatchObject({ mark: 'close', reason: 'accent', heard: 'si' });
    expect(result.score).toBe(85);
    expect(isSpeechPass(result)).toBe(true);
  });

  it('scores one accent slip inside a phrase at 93 and names that word', () => {
    const result = scoreSpeech('buenos días', 'buenos dias');

    expect(result.words.map((word) => word.mark)).toEqual(['ok', 'close']);
    expect(result.words[1]?.reason).toBe('accent');
    expect(result.score).toBe(93);
    expect(result.problem?.expected).toBe('días');
    expect(isSpeechPass(result)).toBe(true);
  });

  it('accepts one edit on a word longer than 4 letters as close', () => {
    const result = scoreSpeech('gracias', 'gracies');

    expect(result.words[0]).toMatchObject({ mark: 'close', reason: 'near' });
    expect(result.score).toBe(50);
  });

  it('rejects two edits on a long word', () => {
    const result = scoreSpeech('gracias', 'gracio');

    expect(result.words[0]).toMatchObject({ expected: 'gracias', mark: 'miss', reason: null });
    expect(result.score).toBe(0);
    expect(isSpeechPass(result)).toBe(false);
  });

  it('rejects one edit on a word of 4 letters or fewer', () => {
    expect(scoreSpeech('hola', 'hol').words[0]?.mark).toBe('miss');
    expect(scoreSpeech('gato', 'gatos').words[0]?.mark).toBe('miss');
  });

  it('keeps a short exact word ok', () => {
    const result = scoreSpeech('hola', 'Hola');

    expect(result.words[0]?.mark).toBe('ok');
    expect(result.score).toBe(100);
  });

  it('marks every word missed when nothing was heard', () => {
    const result = scoreSpeech('buenos días', '   ');

    expect(result.words.map((word) => word.mark)).toEqual(['miss', 'miss']);
    expect(result.words.every((word) => word.heard === null)).toBe(true);
    expect(result.score).toBe(0);
    expect(result.problem?.expected).toBe('buenos');
  });

  it('returns an empty score for an empty reference', () => {
    const result = scoreSpeech('  ¿?  ', 'hola');

    expect(result.words).toEqual([]);
    expect(result.score).toBe(0);
    expect(result.problem).toBeNull();
    expect(isSpeechPass(result)).toBe(false);
  });

  it('ignores extra words around a correct phrase', () => {
    const result = scoreSpeech('hola amigos', 'eh hola amigos');

    expect(result.words.map((word) => word.mark)).toEqual(['ok', 'ok']);
    expect(result.score).toBe(100);
  });

  it('marks a dropped word as miss and scores the rest', () => {
    const result = scoreSpeech('hola amigos', 'hola');

    expect(result.words).toEqual([
      { expected: 'hola', heard: 'hola', mark: 'ok', reason: null },
      { expected: 'amigos', heard: null, mark: 'miss', reason: null },
    ]);
    expect(result.score).toBe(50);
    expect(isSpeechPass(result)).toBe(false);
  });

  it('points the hint at the first imperfect word', () => {
    const result = scoreSpeech('hola amigos', 'hola amigas');

    expect(result.problem?.expected).toBe('amigos');
    expect(result.problem?.reason).toBe('near');
    expect(result.score).toBe(75);
    expect(isSpeechPass(result)).toBe(true);
  });

  it('has no problem word when every word is ok', () => {
    expect(scoreSpeech('me llamo Ana', 'me llamo Ana extra').problem).toBeNull();
  });

  it('does not pass a phrase that still has a miss', () => {
    const result = scoreSpeech('hola amigos', 'buenos días');

    expect(result.words.some((word) => word.mark === 'miss')).toBe(true);
    expect(isSpeechPass(result)).toBe(false);
  });

  it('passes when every word is understood and the score is at least 70', () => {
    const accent = scoreSpeech('¿Cómo te llamas?', 'como te llamas');

    expect(accent.score).toBe(95);
    expect(accent.problem?.expected).toBe('Cómo');
    expect(isSpeechPass(accent)).toBe(true);
  });

  it('does not pass a merely near long word at 50', () => {
    expect(isSpeechPass(scoreSpeech('amigos', 'amigo'))).toBe(false);
  });

  it('aligns a later word when an earlier extra word is skipped', () => {
    const result = scoreSpeech('amigos', 'eh amigos');

    expect(result.words).toEqual([
      { expected: 'amigos', heard: 'amigos', mark: 'ok', reason: null },
    ]);
  });

  it('keeps word order, so a swap does not make both words ok', () => {
    const result = scoreSpeech('buenos días', 'días buenos');

    expect(result.words.map((word) => word.mark)).not.toEqual(['ok', 'ok']);
    expect(result.score).toBeLessThan(100);
  });

  it('strips edge punctuation from the displayed token', () => {
    expect(speechWords('¡Hola!')).toEqual(['Hola']);
    expect(speechWords('buenos, días.')).toEqual(['buenos', 'días']);
    expect(scoreSpeech('buenos, días.', 'buenos días').score).toBe(100);
  });

  it('folds ñ into an accent-level close match', () => {
    const result = scoreSpeech('España', 'espana');

    expect(result.words[0]).toMatchObject({ mark: 'close', reason: 'accent' });
    expect(result.score).toBe(85);
  });

  it('matches the spoken dialog line and ignores a worse option', () => {
    const options = [
      { id: 'hola.buenos_dias', es: 'buenos días' },
      { id: 'hola.gracias', es: 'gracias' },
    ];

    expect(matchSpokenOption('buenos días', options)?.id).toBe('hola.buenos_dias');
    expect(matchSpokenOption('gracias', options)?.id).toBe('hola.gracias');
  });

  it('refuses a dialog match below the pass bar', () => {
    const options = [
      { id: 'hola.buenos_dias', es: 'buenos días' },
      { id: 'hola.gracias', es: 'gracias' },
    ];

    expect(matchSpokenOption('zzzz', options)).toBeNull();
    expect(matchSpokenOption('', options)).toBeNull();
  });

  it('finds the Russian gloss of a reference word', () => {
    const parts = [
      { es: 'buenos', ru: 'добрые' },
      { es: 'días', ru: 'утро' },
    ];

    expect(glossForWord('días', parts)).toBe('утро');
    expect(glossForWord('hola', parts)).toBeNull();
  });
});
