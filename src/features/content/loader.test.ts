import {
  getItem,
  getLesson,
  getTopic,
  listItems,
  listLessons,
  listTopics,
  topicsByCategory,
  topicsByLevel,
} from './loader';

describe('content index', () => {
  it('loads topics, lessons, and items by id', () => {
    expect(getTopic('a1.hola')).toMatchObject({
      title: {
        ru: '¡Hola! Знакомство',
        uk: '¡Hola! Знайомство',
        en: '¡Hola! Introductions',
      },
      starter_day: 1,
      draft: true,
    });
    expect(getLesson('a1.hola.l1').title.ru).toBe('Приветствия');
    expect(getLesson('a1.hola.l2').items).toHaveLength(7);
    expect(getLesson('a1.numbers.l1').items).toHaveLength(7);
    expect(getItem('hola.hola')).toMatchObject({
      es: 'hola',
      tr: { ru: 'привет', uk: 'привіт', en: 'hello' },
      draft: true,
      draft_i18n: true,
    });
    expect(getItem('numbers.uno').type).toBe('word');
  });

  it('groups topics by level and category', () => {
    expect(topicsByLevel('A1').map((topic) => topic.id)).toEqual([
      'a1.hola',
      'a1.cafe',
      'a1.numbers',
      'a1.tienda',
      'a1.camino',
      'a1.restaurante',
      'a1.primera',
      'a1.mercado',
      'a1.metro',
      'a1.ropa',
      'a1.supermercado',
      'a1.tiempo',
    ]);
    expect(topicsByLevel('A2')).toEqual([]);
    expect(topicsByCategory('first_steps').map((topic) => topic.id)).toEqual([
      'a1.hola',
      'a1.numbers',
      'a1.tiempo',
    ]);
    expect(topicsByCategory('food').map((topic) => topic.id)).toEqual([
      'a1.cafe',
      'a1.restaurante',
      'a1.mercado',
      'a1.supermercado',
    ]);
  });

  it('keeps the starter week in draft', () => {
    expect(listTopics().every((topic) => topic.draft)).toBe(true);
    expect(
      listTopics()
        .flatMap((topic) => (topic.starter_day === undefined ? [] : [topic.starter_day]))
        .sort((left, right) => left - right),
    ).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(listLessons().map((lesson) => lesson.id)).toEqual([
      'a1.cafe.l1',
      'a1.cafe.l2',
      'a1.camino.l1',
      'a1.camino.l2',
      'a1.hola.l1',
      'a1.hola.l2',
      'a1.mercado.l1',
      'a1.mercado.l2',
      'a1.mercado.l3',
      'a1.mercado.l4',
      'a1.metro.l1',
      'a1.metro.l2',
      'a1.metro.l3',
      'a1.metro.l4',
      'a1.numbers.l1',
      'a1.numbers.l2',
      'a1.primera.l1',
      'a1.primera.l2',
      'a1.restaurante.l1',
      'a1.restaurante.l2',
      'a1.ropa.l1',
      'a1.ropa.l2',
      'a1.ropa.l3',
      'a1.ropa.l4',
      'a1.supermercado.l1',
      'a1.supermercado.l2',
      'a1.supermercado.l3',
      'a1.supermercado.l4',
      'a1.tiempo.l1',
      'a1.tiempo.l2',
      'a1.tiempo.l3',
      'a1.tiempo.l4',
      'a1.tienda.l1',
      'a1.tienda.l2',
    ]);
    expect(listItems().every((item) => item.draft)).toBe(true);
    expect(listLessons()).toHaveLength(34);
  });

  it('throws for an unknown id', () => {
    expect(() => getTopic('a1.missing')).toThrow('Unknown topic id: a1.missing');
    expect(() => getLesson('a1.hola.l9')).toThrow('Unknown lesson id: a1.hola.l9');
    expect(() => getItem('hola.missing')).toThrow('Unknown item id: hola.missing');
  });
});
