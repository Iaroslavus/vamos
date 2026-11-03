import { confusableReportLines, confusablesForUnit, suggestConfusables } from './confusables';

describe('suggestConfusables', () => {
  const lexicon = ['hola', 'hora', 'casa', 'amor', 'Hola'];

  it('lists other short words one edit away', () => {
    expect(suggestConfusables('hola', lexicon)).toEqual(['hora']);
  });

  it('skips the same spelling, accents-only twins, and longer words', () => {
    expect(suggestConfusables('hola', ['hola', 'Hola'])).toEqual([]);
    expect(suggestConfusables('sí', ['si', 'sí'])).toEqual([]);
    expect(suggestConfusables('buenos', lexicon)).toEqual([]);
  });
});

describe('confusablesForUnit', () => {
  it('keeps the authored list and adds a lexicon neighbor once', () => {
    expect(confusablesForUnit('hola', ['ola', 'olla', 'hora', 'jola'], ['hola', 'hora'])).toEqual([
      'ola',
      'olla',
      'hora',
      'jola',
    ]);
  });

  it('generates the list when the unit has none', () => {
    expect(confusablesForUnit('hola', [], ['hola', 'hora'])).toEqual(['hora']);
  });
});

describe('confusableReportLines', () => {
  it('prints the authored field and the generated neighbor', () => {
    expect(
      confusableReportLines([
        { id: 'hola.hola', es: 'hola', confusables: ['ola', 'olla', 'hora', 'jola'] },
        { id: 'tiempo.hora', es: 'hora', confusables: [] },
      ]),
    ).toEqual(['hola.hola: поле ola, olla, hora, jola; словарь hora', 'tiempo.hora: словарь hola']);
  });
});
