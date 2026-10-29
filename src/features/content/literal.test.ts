import { listItems } from './loader';
import { literalPartWarnings, sameGloss } from './literal';
import { ItemSchema } from './schema';
import { fillLocales } from './text';

const buenos = {
  id: 'hola.buenos_dias',
  type: 'phrase' as const,
  es: 'buenos días',
  tr: { ru: 'доброе утро', uk: 'добрий ранок', en: 'good morning' },
  say: fillLocales('буэнос диас'),
  level: 'A1' as const,
};

describe('literalPartWarnings', () => {
  it('warns when part glosses rebuild the natural translation', () => {
    const item = ItemSchema.parse({
      ...buenos,
      literal: { ru: 'добрые дни', uk: 'добрі дні', en: 'good days' },
      parts: [
        { es: 'buenos', tr: { ru: 'доброе', uk: 'добрий', en: 'good' } },
        { es: 'días', tr: { ru: 'утро', uk: 'ранок', en: 'morning' } },
      ],
    });

    expect(literalPartWarnings(item)).toEqual([
      'item hola.buenos_dias ru: склейка parts[].tr совпадает с tr, хотя дословный перевод отличается',
      'item hola.buenos_dias uk: склейка parts[].tr совпадает с tr, хотя дословный перевод отличается',
      'item hola.buenos_dias en: склейка parts[].tr совпадает с tr, хотя дословный перевод отличается',
    ]);
  });

  it('stays quiet when the parts are a literal split', () => {
    const item = ItemSchema.parse({
      ...buenos,
      literal: { ru: 'добрые дни', uk: 'добрі дні', en: 'good days' },
      parts: [
        { es: 'buenos', tr: { ru: 'добрые', uk: 'добрі', en: 'good' } },
        { es: 'días', tr: { ru: 'дни', uk: 'дні', en: 'days' } },
      ],
    });

    expect(literalPartWarnings(item)).toEqual([]);
    expect(sameGloss('Добрые дни!', 'добрые дни')).toBe(true);
  });

  it('does not warn when the word-for-word reading is the natural one', () => {
    const item = ItemSchema.parse({
      ...buenos,
      es: 'cuatro y cinco',
      tr: { ru: 'четыре и пять', uk: "чотири і п'ять", en: 'four and five' },
      parts: [
        { es: 'cuatro', tr: { ru: 'четыре', uk: 'чотири', en: 'four' } },
        { es: 'y', tr: fillLocales('и') },
        { es: 'cinco', tr: { ru: 'пять', uk: "п'ять", en: 'five' } },
      ],
    });

    expect(item.literal).toBeNull();
    expect(literalPartWarnings(item)).toEqual([]);
  });

  it('finds no sense glosses in the course library', () => {
    expect(listItems().flatMap((item) => literalPartWarnings(item))).toEqual([]);
  });
});
