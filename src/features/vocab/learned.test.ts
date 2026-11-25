import { filterLearnedIds, groupLearned, learnedFromLessons, matchesLearnedQuery } from './learned';

const LESSONS = [
  { id: 'a1.hola.l1', topicId: 'a1.hola', itemIds: ['hola.hola', 'hola.adios'] },
  { id: 'a1.hola.l2', topicId: 'a1.hola', itemIds: ['hola.adios', 'hola.gracias'] },
  { id: 'a1.cafe.l1', topicId: 'a1.cafe', itemIds: ['cafe.cafe'] },
];

describe('learnedFromLessons', () => {
  it('keeps items from finished lessons only, once, at the earliest completion', () => {
    expect(
      learnedFromLessons(
        LESSONS,
        [
          { lessonId: 'a1.hola.l2', completedAt: '2026-05-02T00:00:00.000Z' },
          { lessonId: 'a1.hola.l1', completedAt: '2026-05-01T00:00:00.000Z' },
        ],
        '2026-06-01T00:00:00.000Z',
      ),
    ).toEqual([
      { itemId: 'hola.adios', addedAt: '2026-05-01T00:00:00.000Z', topicId: 'a1.hola' },
      { itemId: 'hola.hola', addedAt: '2026-05-01T00:00:00.000Z', topicId: 'a1.hola' },
      { itemId: 'hola.gracias', addedAt: '2026-05-02T00:00:00.000Z', topicId: 'a1.hola' },
    ]);
  });

  it('uses the fallback time when a finished lesson has no timestamp', () => {
    expect(
      learnedFromLessons(
        LESSONS,
        [{ lessonId: 'a1.cafe.l1', completedAt: null }],
        '2026-06-01T00:00:00.000Z',
      ),
    ).toEqual([{ itemId: 'cafe.cafe', addedAt: '2026-06-01T00:00:00.000Z', topicId: 'a1.cafe' }]);
  });
});

describe('learned filters and groups', () => {
  const members = [
    { itemId: 'hola.hola', addedAt: '2026-05-01T10:00:00.000Z', topicId: 'a1.hola', own: false },
    { itemId: 'hola.gracias', addedAt: '2026-05-02T10:00:00.000Z', topicId: 'a1.hola', own: false },
    { itemId: 'cafe.cafe', addedAt: '2026-05-03T10:00:00.000Z', topicId: 'a1.cafe', own: false },
    { itemId: 'word-1', addedAt: '2026-05-04T10:00:00.000Z', topicId: null, own: true },
  ];

  it('keeps every id, only due ids, or only difficult ids', () => {
    const ids = members.map((member) => member.itemId);
    const due = new Set(['hola.hola']);
    const difficult = new Set(['hola.gracias', 'missing']);

    expect(filterLearnedIds(ids, 'all', due, difficult)).toEqual(ids);
    expect(filterLearnedIds(ids, 'due', due, difficult)).toEqual(['hola.hola']);
    expect(filterLearnedIds(ids, 'difficult', due, difficult)).toEqual(['hola.gracias']);
  });

  it('groups course phrases by topic and own words last', () => {
    expect(groupLearned(members, 'topic').map((group) => group.key)).toEqual([
      'topic:a1.hola',
      'topic:a1.cafe',
      'own',
    ]);
    expect(groupLearned(members, 'topic').find((group) => group.own)?.itemIds).toEqual(['word-1']);
  });

  it('groups by day with the newest day first', () => {
    const groups = groupLearned(members, 'date');
    expect(groups.map((group) => group.day)).toEqual([
      '2026-05-04',
      '2026-05-03',
      '2026-05-02',
      '2026-05-01',
    ]);
  });

  it('matches Spanish or the translation and keeps a blank query', () => {
    expect(matchesLearnedQuery('Hola', 'Привет', '')).toBe(true);
    expect(matchesLearnedQuery('Hola', 'Привет', 'прив')).toBe(true);
    expect(matchesLearnedQuery('Café', 'кофе', 'cafe')).toBe(true);
    expect(matchesLearnedQuery('Hola', 'Привет', 'gato')).toBe(false);
  });
});
