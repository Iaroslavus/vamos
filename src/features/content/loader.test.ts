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
    expect(topicsByLevel('A1').map((topic) => topic.id)).toEqual(['a1.hola', 'a1.numbers']);
    expect(topicsByLevel('A2')).toEqual([]);
    expect(topicsByCategory('first_steps').map((topic) => topic.id)).toEqual([
      'a1.hola',
      'a1.numbers',
    ]);
    expect(topicsByCategory('food')).toEqual([]);
  });

  it('keeps the migrated A1 bundle in draft', () => {
    expect(listTopics().every((topic) => topic.draft)).toBe(true);
    expect(listLessons().map((lesson) => lesson.id)).toEqual([
      'a1.hola.l1',
      'a1.hola.l2',
      'a1.numbers.l1',
    ]);
    expect(listItems().every((item) => item.draft)).toBe(true);
    expect(listLessons()).toHaveLength(3);
  });

  it('throws for an unknown id', () => {
    expect(() => getTopic('a1.missing')).toThrow('Unknown topic id: a1.missing');
    expect(() => getLesson('a1.hola.l9')).toThrow('Unknown lesson id: a1.hola.l9');
    expect(() => getItem('hola.missing')).toThrow('Unknown item id: hola.missing');
  });
});
