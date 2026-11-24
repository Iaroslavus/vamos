import { ItemSchema, type Item, type Lesson } from './schema';
import { hasNumberList, isNumberCard, punctuationIssue, qualityIssues } from './quality';

function item(es: string, extra: Record<string, unknown> = {}): Item {
  const tokens = es.trim().split(/\s+/).length;
  return ItemSchema.parse({
    id: 't.sample',
    type: tokens > 1 ? 'phrase' : 'word',
    es,
    tr: { ru: 'да', uk: 'так', en: 'yes' },
    say: { ru: 'да', uk: 'так', en: 'yes' },
    level: 'A1',
    ...extra,
  });
}

describe('content quality rules', () => {
  it('requires the infinitive in the note of a one-word verb', () => {
    const bare = qualityIssues({ items: [item('quiero')], lessons: [] });
    expect(bare.some((issue) => issue.includes('querer'))).toBe(true);
    const noted = qualityIssues({
      items: [item('quiero', { note: { ru: '(querer)', uk: '(querer)', en: '(querer)' } })],
      lessons: [],
    });
    expect(noted).toEqual([]);
  });

  it('rejects a slash or parentheses in Spanish and in translations', () => {
    const slash = qualityIssues({ items: [item('encantado / encantada')], lessons: [] });
    expect(slash.some((issue) => issue.includes('/'))).toBe(true);
    const paren = qualityIssues({
      items: [item('hola', { tr: { ru: 'рад(а)', uk: 'радий', en: 'glad' } })],
      lessons: [],
    });
    expect(paren.some((issue) => issue.includes('рад(а)'))).toBe(true);
  });

  it('rejects a list of numbers and keeps compounds, prices, and one card each', () => {
    expect(hasNumberList('ocho y nueve')).toBe(true);
    expect(hasNumberList('uno, dos')).toBe(true);
    expect(hasNumberList('treinta y dos')).toBe(false);
    expect(hasNumberList('Tengo treinta y dos años')).toBe(false);
    expect(hasNumberList('Dos con cincuenta')).toBe(false);
    expect(hasNumberList('Diez euros')).toBe(false);
    expect(qualityIssues({ items: [item('ocho y nueve')], lessons: [] }).join('\n')).toMatch(
      /several numbers/,
    );
    expect(isNumberCard(item('ocho'))).toBe(true);
    expect(qualityIssues({ items: [item('ocho')], lessons: [] }).join('\n')).toMatch(/display/);
    expect(qualityIssues({ items: [item('ocho', { display: '8' })], lessons: [] })).toEqual([]);
  });

  it('requires paired Spanish punctuation on items and npc lines', () => {
    expect(punctuationIssue('¿Cómo te llamas?')).toBeNull();
    expect(punctuationIssue('Cómo te llamas?')).toMatch(/¿/);
    const lesson = {
      id: 'a1.t.l1',
      dialog: { lines: [{ who: 'npc', es: 'Cómo te llamas?', tr: { ru: 'Как тебя зовут?' } }] },
    } as Lesson;
    expect(qualityIssues({ items: [], lessons: [lesson] }).join('\n')).toMatch(/¿/);
  });
});
