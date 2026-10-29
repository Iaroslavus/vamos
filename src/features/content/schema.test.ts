import { ItemSchema, LessonSchema, TopicSchema } from './schema';
import { fillLocales } from './text';

const cafeItem = {
  id: 'cafe.cafe_con_leche',
  type: 'phrase',
  es: 'Un café con leche, por favor',
  tr: fillLocales('Кофе с молоком, пожалуйста'),
  parts: [
    { es: 'un café', tr: fillLocales('кофе') },
    { es: 'con leche', tr: fillLocales('с молоком') },
    { es: 'por favor', tr: fillLocales('пожалуйста') },
  ],
  say: fillLocales('ун кафЕ кон лЕче, пор фавОр'),
  note: fillLocales('В Испании так заказывают кофе у стойки.'),
  why: null,
  level: 'A1',
  variant: 'both',
  audio: { es: 'items/a1/cafe/cafe_con_leche.es.mp3', latam: null },
  tags: ['cafe', 'pedir'],
};

describe('content v2 schema', () => {
  it('parses the documented item, topic, and lesson', () => {
    const parsed = ItemSchema.parse(cafeItem);
    expect(parsed.id).toBe('cafe.cafe_con_leche');
    expect(parsed.audio).toMatchObject({
      source: 'tts',
      es: 'items/a1/cafe/cafe_con_leche.es.mp3',
      latam: null,
      slow: { es: null, latam: null },
      parts: [],
    });
    expect(
      ItemSchema.parse({
        ...cafeItem,
        audio: {
          source: 'human',
          es: 'items/a1/cafe/cafe_con_leche.es.normal.m4a',
          latam: null,
          slow: { es: 'items/a1/cafe/cafe_con_leche.es.slow.m4a', latam: null },
          parts: [],
        },
      }).audio.source,
    ).toBe('human');

    const topic = TopicSchema.parse({
      id: 'a1.cafe',
      level: 'A1',
      category: 'food',
      title: fillLocales('В кафе'),
      icon: 'cup',
      can_do: ['Заказать напиток', 'Спросить цену', 'Попросить счёт'].map(fillLocales),
      lessons: ['a1.cafe.l1', 'a1.cafe.l2', 'a1.cafe.l3'],
      scene: 'a1.cafe.scene',
      starter_day: 2,
    });
    expect(topic.draft).toBe(false);
    expect(topic.starter_day).toBe(2);

    const lesson = LessonSchema.parse({
      id: 'a1.cafe.l1',
      topic: 'a1.cafe',
      title: fillLocales('Заказываем кофе'),
      items: [
        'cafe.hola_buenos_dias',
        'cafe.cafe_con_leche',
        'cafe.un_te',
        'cafe.cuanto_es',
        'cafe.para_llevar',
        'cafe.aqui',
      ],
      speak: ['cafe.cafe_con_leche', 'cafe.cuanto_es'],
      dialog: {
        lines: [
          { who: 'npc', es: '¡Hola! ¿Qué le pongo?', tr: fillLocales('Здравствуйте! Что вам?') },
          {
            who: 'user',
            target: 'cafe.cafe_con_leche',
            options: ['cafe.cafe_con_leche', 'cafe.un_te', 'cafe.cuanto_es'],
          },
          {
            who: 'npc',
            es: '¿Para tomar aquí o para llevar?',
            tr: fillLocales('Здесь или с собой?'),
          },
          {
            who: 'user',
            target: 'cafe.para_llevar',
            options: ['cafe.para_llevar', 'cafe.aqui'],
          },
        ],
      },
      overrides: [],
    });

    expect(lesson.items).toHaveLength(6);
    expect(lesson.overrides).toEqual([]);
    expect(lesson.dialog.lines[1]).toMatchObject({ target: 'cafe.cafe_con_leche' });
  });

  it('defaults literal to null and keeps a word-for-word gloss', () => {
    expect(ItemSchema.parse(cafeItem).literal).toBeNull();
    const parsed = ItemSchema.parse({
      ...cafeItem,
      es: 'buenos días',
      tr: { ru: 'доброе утро', uk: 'добрий ранок', en: 'good morning' },
      literal: { ru: 'добрые дни', uk: 'добрі дні', en: 'good days' },
      parts: [
        { es: 'buenos', tr: { ru: 'добрые', uk: 'добрі', en: 'good' } },
        { es: 'días', tr: { ru: 'дни', uk: 'дні', en: 'days' } },
      ],
    });
    expect(parsed.literal).toEqual({ ru: 'добрые дни', uk: 'добрі дні', en: 'good days' });
  });

  it('requires a pronunciation hint on A1', () => {
    const result = ItemSchema.safeParse({ ...cafeItem, say: null });
    expect(result.success).toBe(false);
  });

  it('rejects a lesson outside 6–8 items', () => {
    const result = LessonSchema.safeParse({
      id: 'a1.cafe.l1',
      topic: 'a1.cafe',
      title: fillLocales('Короткий'),
      items: ['cafe.hola', 'cafe.adios'],
      dialog: {
        lines: [{ who: 'npc', es: 'Hola', tr: fillLocales('Привет') }],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown topic category', () => {
    const result = TopicSchema.safeParse({
      id: 'a1.cafe',
      level: 'A1',
      category: 'cafe',
      title: fillLocales('В кафе'),
      icon: 'cup',
      can_do: [fillLocales('Заказать')],
      lessons: ['a1.cafe.l1'],
      scene: 'a1.cafe.scene',
    });
    expect(result.success).toBe(false);
  });
});
