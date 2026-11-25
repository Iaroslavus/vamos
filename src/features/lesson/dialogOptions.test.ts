import { blankAudio, type Item } from '@/features/content/schema';
import { fillLocales } from '@/features/content/text';

import { distractorFits, repairDialogLines } from './dialogOptions';

function item(id: string, es: string, ru: string): Item {
  return {
    id,
    type: 'phrase',
    es,
    tr: fillLocales(ru),
    literal: null,
    parts: [],
    say: fillLocales('sa'),
    note: null,
    why: null,
    level: 'A1',
    variant: 'both',
    audio: blankAudio(),
    tags: [],
    confusables: [],
    draft: false,
    draft_i18n: false,
  };
}

const me = item('hola.me_llamo', 'Me llamo {name}', 'меня зовут');
const soy = item('hola.soy', 'Soy Ana', 'я Ана');
const gusto = item('hola.mucho_gusto', 'mucho gusto', 'очень приятно');
const cafe = item('cafe.cafe', 'un café', 'кофе');

describe('dialog distractors', () => {
  it('treats another introduction as a fitting reply', () => {
    expect(distractorFits(soy, [me])).toBe(true);
    expect(distractorFits(cafe, [me])).toBe(false);
  });

  it('replaces a used or fitting distractor and keeps every accept', () => {
    const lines = repairDialogLines(
      [
        {
          who: 'user',
          accept: ['hola.me_llamo'],
          options: ['hola.me_llamo', 'hola.soy', 'cafe.cafe'],
        },
        {
          who: 'user',
          accept: ['hola.mucho_gusto'],
          options: ['hola.mucho_gusto', 'hola.me_llamo', 'hola.soy'],
        },
      ],
      [me, soy, gusto, cafe],
    );
    const first = lines[0];
    const second = lines[1];
    if (first?.who !== 'user' || second?.who !== 'user') throw new Error('expected user lines');
    expect(first.options).toContain('hola.me_llamo');
    expect(first.options).not.toContain('hola.soy');
    expect(first.options).toContain('cafe.cafe');
    expect(second.options).toEqual(expect.arrayContaining(['hola.mucho_gusto']));
    expect(second.options).not.toContain('hola.me_llamo');
    expect(new Set(second.options).size).toBe(second.options.length);
    expect(second.accept).toEqual(['hola.mucho_gusto']);
  });
});
