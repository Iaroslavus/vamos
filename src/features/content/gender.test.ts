import { migrateGenderItem, speakableText, spokenLines } from './gender';
import { ItemSchema, type Item } from './schema';

function item(extra: Record<string, unknown>): Item {
  return ItemSchema.parse({
    id: 't.sample',
    type: 'phrase',
    es: 'hola',
    tr: { ru: 'привет', uk: 'привіт', en: 'hi' },
    say: { ru: 'ола', uk: 'ола', en: 'ola' },
    level: 'A1',
    ...extra,
  });
}

describe('gender migration', () => {
  it('splits a slash pair and a gender parenthesis into two forms', () => {
    const { item: next, change } = migrateGenderItem(
      item({
        id: 'hola.encantado',
        es: 'encantado / encantada',
        tr: {
          ru: 'рад(а) познакомиться',
          uk: 'радий(а) познайомитися',
          en: 'pleased to meet you',
        },
        say: {
          ru: 'энкантАдо / энкантАда',
          uk: 'енкантАдо / енкантАда',
          en: 'enkantAdo / enkantAda',
        },
      }),
    );

    expect(change?.before.es).toBe('encantado / encantada');
    expect(next.es).toBe('encantado');
    expect(next.tr.ru).toBe('рад познакомиться');
    expect(next.tr.uk).toBe('радий познайомитися');
    expect(next.forms?.f.es).toBe('encantada');
    expect(next.forms?.f.tr.ru).toBe('рада познакомиться');
    expect(next.forms?.f.tr.uk).toBe('рада познайомитися');
    expect(next.audio.es).toBeNull();
    expect(next.say?.ru).toBe('энкантАдо');
  });

  it('builds the feminine of хотел(а) and хотів(ла)', () => {
    const ru = migrateGenderItem(
      item({ es: 'quisiera', tr: { ru: 'хотел(а) бы', uk: 'хотів(ла) би', en: 'I would like' } }),
    );
    expect(ru.item.forms?.m.tr.ru).toBe('хотел бы');
    expect(ru.item.forms?.f.tr.ru).toBe('хотела бы');
    expect(ru.item.forms?.m.tr.uk).toBe('хотів би');
    expect(ru.item.forms?.f.tr.uk).toBe('хотіла би');
  });

  it('strips an article gloss without inventing a second form', () => {
    const { item: next } = migrateGenderItem(
      item({
        es: 'Las manzanas',
        tr: { ru: 'яблоки', uk: 'яблука', en: 'apples' },
        parts: [{ es: 'Las', tr: { ru: 'мн. ж.', uk: 'мн. ж.', en: 'the (f. pl.)' } }],
      }),
    );
    expect(next.forms).toBeUndefined();
    expect(next.parts[0]?.tr.en).toBe('the');
  });

  it('refuses to send a slash or parentheses to speech', () => {
    expect(() => speakableText('encantado / encantada')).toThrow(/TTS/);
    expect(() => speakableText('рад(а)')).toThrow(/TTS/);
    expect(speakableText('Me llamo {name}')).toBe('Me llamo Ana');
    expect(speakableText('Me llamo {name}', 'Pablo')).toBe('Me llamo Pablo');
  });

  it('shows both forms as separate lines and either one when a gender is chosen', () => {
    const migrated = migrateGenderItem(
      item({
        id: 'hola.encantado',
        es: 'encantado / encantada',
        tr: { ru: 'рад(а)', uk: 'радий(а)', en: 'pleased' },
      }),
    ).item;
    expect(spokenLines(migrated, 'both', null).map((line) => line.es)).toEqual([
      'encantado',
      'encantada',
    ]);
    expect(spokenLines(migrated, 'f', null).map((line) => line.es)).toEqual(['encantada']);
    expect(spokenLines(migrated, 'm', 'Luis').map((line) => line.es)).toEqual(['encantado']);
  });
});
