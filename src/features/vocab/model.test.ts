import {
  countMatchingCards,
  difficultItemIds,
  folderHoldsAll,
  parseFolderName,
  parseLegacyFavoriteIds,
  topicSeeds,
} from './model';

const NOW = new Date('2026-10-25T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

describe('difficultItemIds', () => {
  it('keeps items with two Again ratings inside 14 days', () => {
    const ids = difficultItemIds(
      [
        { itemId: 'hola.hola', rating: 'again', reviewedAt: daysAgo(1) },
        { itemId: 'hola.hola', rating: 'again', reviewedAt: daysAgo(3) },
        { itemId: 'hola.adios', rating: 'again', reviewedAt: daysAgo(1) },
        { itemId: 'hola.gracias', rating: 'hard', reviewedAt: daysAgo(1) },
        { itemId: 'hola.gracias', rating: 'again', reviewedAt: daysAgo(2) },
        { itemId: 'hola.por_favor', rating: 'again', reviewedAt: daysAgo(20) },
        { itemId: 'hola.por_favor', rating: 'again', reviewedAt: daysAgo(1) },
      ],
      NOW,
    );

    expect(ids).toEqual(['hola.hola']);
  });

  it('counts an Again that lands exactly on the window edge and ignores the future', () => {
    const edge = new Date(NOW.getTime() - 14 * DAY).toISOString();
    const justOutside = new Date(NOW.getTime() - 14 * DAY - 1).toISOString();
    const future = new Date(NOW.getTime() + 1000).toISOString();

    expect(
      difficultItemIds(
        [
          { itemId: 'edge', rating: 'again', reviewedAt: edge },
          { itemId: 'edge', rating: 'again', reviewedAt: daysAgo(1) },
          { itemId: 'old', rating: 'again', reviewedAt: justOutside },
          { itemId: 'old', rating: 'again', reviewedAt: daysAgo(1) },
          { itemId: 'later', rating: 'again', reviewedAt: future },
          { itemId: 'later', rating: 'again', reviewedAt: daysAgo(1) },
        ],
        NOW,
      ),
    ).toEqual(['edge']);
  });

  it('sums Again ratings from both card directions', () => {
    expect(
      difficultItemIds(
        [
          { itemId: 'hola.hola', rating: 'again', reviewedAt: daysAgo(1) },
          { itemId: 'hola.hola', rating: 'again', reviewedAt: daysAgo(2) },
        ],
        NOW,
      ),
    ).toEqual(['hola.hola']);
  });
});

describe('topicSeeds', () => {
  const topics = [
    { id: 'a1.hola', title: '¡Hola! Знакомство', lessonIds: ['l1', 'l2'] },
    { id: 'a1.numbers', title: 'Числа', lessonIds: ['n1'] },
  ];
  const lessons = [
    { id: 'l1', topicId: 'a1.hola', itemIds: ['hola.hola', 'hola.adios'] },
    { id: 'l2', topicId: 'a1.hola', itemIds: ['hola.adios', 'hola.gracias'] },
    { id: 'n1', topicId: 'a1.numbers', itemIds: ['num.uno'] },
  ];

  it('builds a folder only after every lesson in the topic is completed', () => {
    expect(topicSeeds(topics, lessons, ['l1'])).toEqual([]);
    expect(topicSeeds(topics, lessons, ['l1', 'l2'])).toEqual([
      {
        topicId: 'a1.hola',
        name: '¡Hola! Знакомство',
        itemIds: ['hola.hola', 'hola.adios', 'hola.gracias'],
      },
    ]);
  });

  it('clamps a long topic title to the folder name limit', () => {
    const [seed] = topicSeeds(
      [{ id: 'a1.long', title: 'Я'.repeat(50), lessonIds: ['l1'] }],
      [{ id: 'l1', topicId: 'a1.long', itemIds: ['hola.hola'] }],
      ['l1'],
    );
    expect(seed?.name).toHaveLength(40);
  });
});

describe('folder helpers', () => {
  it('rejects blank and over-long names', () => {
    expect(parseFolderName('  Для переезда  ')).toBe('Для переезда');
    expect(parseFolderName('   ')).toBeNull();
    expect(parseFolderName('я'.repeat(41))).toBeNull();
  });

  it('counts due cards that belong to the folder', () => {
    expect(countMatchingCards([{ itemId: 'a' }, { itemId: 'b' }, { itemId: 'a' }], ['a'])).toBe(2);
    expect(countMatchingCards([{ itemId: 'b' }], [])).toBe(0);
  });

  it('knows when every requested item is already in the folder', () => {
    const items = [
      { folderId: 'fav', itemId: 'hola.hola' },
      { folderId: 'fav', itemId: 'hola.adios' },
    ];
    expect(folderHoldsAll(items, 'fav', ['hola.hola', 'hola.adios'])).toBe(true);
    expect(folderHoldsAll(items, 'fav', ['hola.hola', 'hola.gracias'])).toBe(false);
    expect(folderHoldsAll(items, 'fav', [])).toBe(false);
  });

  it('reads the old favorites list once', () => {
    expect(
      parseLegacyFavoriteIds(
        JSON.stringify({ state: { itemIds: ['hola.hola', 'hola.hola', ''] }, version: 0 }),
      ),
    ).toEqual(['hola.hola']);
    expect(parseLegacyFavoriteIds('not-json')).toEqual([]);
    expect(parseLegacyFavoriteIds(null)).toEqual([]);
  });
});

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY).toISOString();
}
