import { ItemSchema, LessonSchema, TopicSchema } from './schema';

const cafeItem = {
  id: 'cafe.cafe_con_leche',
  type: 'phrase',
  es: 'Un café con leche, por favor',
  ru: 'Кофе с молоком, пожалуйста',
  parts: [
    { es: 'un café', ru: 'кофе' },
    { es: 'con leche', ru: 'с молоком' },
    { es: 'por favor', ru: 'пожалуйста' },
  ],
  say_ru: 'ун кафЕ кон лЕче, пор фавОр',
  note_ru: 'В Испании так заказывают кофе у стойки.',
  why_ru: null,
  level: 'A1',
  variant: 'both',
  audio: { es: 'items/a1/cafe/cafe_con_leche.es.mp3', latam: null },
  tags: ['cafe', 'pedir'],
};

describe('content v2 schema', () => {
  it('parses the documented item, topic, and lesson', () => {
    expect(ItemSchema.parse(cafeItem).id).toBe('cafe.cafe_con_leche');

    const topic = TopicSchema.parse({
      id: 'a1.cafe',
      level: 'A1',
      category: 'food',
      title_ru: 'В кафе',
      icon: 'cup',
      can_do_ru: ['Заказать напиток', 'Спросить цену', 'Попросить счёт'],
      lessons: ['a1.cafe.l1', 'a1.cafe.l2', 'a1.cafe.l3'],
      scene: 'a1.cafe.scene',
      starter_day: 2,
    });
    expect(topic.draft).toBe(false);
    expect(topic.starter_day).toBe(2);

    const lesson = LessonSchema.parse({
      id: 'a1.cafe.l1',
      topic: 'a1.cafe',
      title_ru: 'Заказываем кофе',
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
          { who: 'npc', es: '¡Hola! ¿Qué le pongo?', ru: 'Здравствуйте! Что вам?' },
          {
            who: 'user',
            target: 'cafe.cafe_con_leche',
            options: ['cafe.cafe_con_leche', 'cafe.un_te', 'cafe.cuanto_es'],
          },
          {
            who: 'npc',
            es: '¿Para tomar aquí o para llevar?',
            ru: 'Здесь или с собой?',
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

  it('requires a pronunciation hint on A1', () => {
    const result = ItemSchema.safeParse({ ...cafeItem, say_ru: null });
    expect(result.success).toBe(false);
  });

  it('rejects a lesson outside 6–8 items', () => {
    const result = LessonSchema.safeParse({
      id: 'a1.cafe.l1',
      topic: 'a1.cafe',
      title_ru: 'Короткий',
      items: ['cafe.hola', 'cafe.adios'],
      dialog: {
        lines: [{ who: 'npc', es: 'Hola', ru: 'Привет' }],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown topic category', () => {
    const result = TopicSchema.safeParse({
      id: 'a1.cafe',
      level: 'A1',
      category: 'cafe',
      title_ru: 'В кафе',
      icon: 'cup',
      can_do_ru: ['Заказать'],
      lessons: ['a1.cafe.l1'],
      scene: 'a1.cafe.scene',
    });
    expect(result.success).toBe(false);
  });
});
