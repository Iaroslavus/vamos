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
      title_ru: '¡Hola! Знакомство',
      starter_day: 1,
      draft: true,
    });
    expect(getLesson('a1.hola.l1').title_ru).toBe('Приветствия');
    expect(getLesson('a1.hola.l2').items).toHaveLength(7);
    expect(getLesson('a1.numbers.l1').items).toHaveLength(7);
    expect(getItem('hola.hola')).toMatchObject({ es: 'hola', ru: 'привет', draft: true });
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
    ]);
    expect(topicsByLevel('A2')).toEqual([]);
    expect(topicsByCategory('first_steps').map((topic) => topic.id)).toEqual([
      'a1.hola',
      'a1.numbers',
    ]);
    expect(topicsByCategory('food').map((topic) => topic.id)).toEqual([
      'a1.cafe',
      'a1.restaurante',
    ]);
  });

  it('keeps the starter week in draft', () => {
    expect(listTopics().every((topic) => topic.draft)).toBe(true);
    expect(
      listTopics()
        .map((topic) => topic.starter_day)
        .slice()
        .sort((left, right) => (left ?? 0) - (right ?? 0)),
    ).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(listLessons().map((lesson) => lesson.id)).toEqual([
      'a1.cafe.l1',
      'a1.cafe.l2',
      'a1.camino.l1',
      'a1.camino.l2',
      'a1.hola.l1',
      'a1.hola.l2',
      'a1.numbers.l1',
      'a1.numbers.l2',
      'a1.primera.l1',
      'a1.primera.l2',
      'a1.restaurante.l1',
      'a1.restaurante.l2',
      'a1.tienda.l1',
      'a1.tienda.l2',
    ]);
    expect(listItems().every((item) => item.draft)).toBe(true);
    expect(listLessons()).toHaveLength(14);
  });

  it('throws for an unknown id', () => {
    expect(() => getTopic('a1.missing')).toThrow('Unknown topic id: a1.missing');
    expect(() => getLesson('a1.hola.l9')).toThrow('Unknown lesson id: a1.hola.l9');
    expect(() => getItem('hola.missing')).toThrow('Unknown item id: hola.missing');
  });
});
