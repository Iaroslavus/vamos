import { colors } from '@/theme/tokens';

import { scoreSpeech } from './score';
import { decoratePhrase } from './phrase';
import { speechTips, tipSpelling } from './tips';
import { speechVerdict, wordMarkColor } from './verdict';

describe('speech verdict and word colors', () => {
  it('paints a clear word green, a close word yellow, and a miss red', () => {
    expect(wordMarkColor('ok')).toBe(colors.teal);
    expect(wordMarkColor('close')).toBe(colors.saffronDeep);
    expect(wordMarkColor('miss')).toBe(colors.coralDeep);
  });

  it('turns the score into a verdict and keeps the percent secondary', () => {
    expect(speechVerdict(100)).toBe('great');
    expect(speechVerdict(85)).toBe('great');
    expect(speechVerdict(84)).toBe('almost');
    expect(speechVerdict(60)).toBe('almost');
    expect(speechVerdict(59)).toBe('again');
  });

  it('keeps ¿?¡! and colors each word of the phrase', () => {
    const scored = scoreSpeech('¿Cómo te llamas?', 'cómo te');
    const pieces = decoratePhrase('¿Cómo te llamas?', scored.words);

    expect(pieces.map((piece) => piece.text).join(' ')).toBe('¿Cómo te llamas?');
    expect(pieces.map((piece) => piece.mark)).toEqual(['ok', 'ok', 'miss']);
  });

  it('builds one or two concrete sound hints', () => {
    expect(tipSpelling('llamas', 'yeismo', 'uk')).toBe('ЙА-мас');
    const tips = speechTips(
      [{ expected: 'llamas' }, { expected: 'hola' }, { expected: 'perro' }],
      'uk',
    );
    expect(tips).toHaveLength(2);
    expect(tips[0]).toMatchObject({ word: 'llamas', ruleId: 'yeismo', say: 'ЙА-мас' });
    expect(tips[1]).toMatchObject({ word: 'hola', ruleId: 'silent-h' });
  });
});
