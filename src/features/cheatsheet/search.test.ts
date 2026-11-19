import { buildCheatsheetIndex } from './catalog';
import { searchTopics, type SearchTopic } from './search';

const titled: SearchTopic = {
  id: 'title',
  title: { ru: 'В ресторане', uk: 'У ресторані', en: 'At a restaurant' },
  canDo: [],
  tags: { ru: ['еда'] },
  phrases: [{ id: 't1', es: 'La cuenta', tr: { ru: 'Счёт', uk: 'Рахунок', en: 'The bill' } }],
};

const tagged: SearchTopic = {
  id: 'tag',
  title: { ru: 'Ужин', uk: 'Вечеря', en: 'Dinner' },
  canDo: [],
  tags: {
    ru: ['официант'],
    uk: ['офіціант'],
    en: ['waiter'],
  },
  phrases: [],
};

const phrased: SearchTopic = {
  id: 'phrase',
  title: { ru: 'Еда', uk: 'Їжа', en: 'Food' },
  canDo: [{ ru: 'Заказать', uk: 'Замовити', en: 'Order' }],
  phrases: [
    {
      id: 'p1',
      es: 'Me duele la cabeza',
      tr: { ru: 'У меня болит голова', uk: 'У мене болить голова', en: 'My head hurts' },
    },
  ],
};

describe('searchTopics', () => {
  const topics = [phrased, tagged, titled];

  it('matches a title, a tag, Spanish, and each translation', () => {
    expect(searchTopics(topics, 'ресторан').map((hit) => hit.id)).toEqual(['title']);
    expect(searchTopics(topics, 'restaurant')[0]).toMatchObject({ id: 'title', rank: 0 });
    expect(searchTopics(topics, 'официант')[0]).toMatchObject({ id: 'tag', rank: 1 });
    expect(searchTopics(topics, 'офіціант')[0]?.id).toBe('tag');
    expect(searchTopics(topics, 'waiter')[0]?.id).toBe('tag');
    expect(searchTopics(topics, 'duele')[0]).toMatchObject({ id: 'phrase', rank: 2 });
    expect(searchTopics(topics, 'болит')[0]?.id).toBe('phrase');
    expect(searchTopics(topics, 'болить')[0]?.id).toBe('phrase');
    expect(searchTopics(topics, 'hurts')[0]?.id).toBe('phrase');
  });

  it('ranks a title above a tag and a tag above a phrase', () => {
    const hits = searchTopics(
      [
        {
          ...phrased,
          phrases: [{ id: 'x', es: 'x', tr: { ru: 'ресторан', uk: 'ресторан', en: 'restaurant' } }],
        },
        { ...tagged, tags: { ru: ['ресторан'], uk: ['ресторан'], en: ['restaurant'] } },
        titled,
      ],
      'Ресторан',
    );
    expect(hits.map((hit) => hit.id)).toEqual(['title', 'tag', 'phrase']);
    expect(hits.map((hit) => hit.rank)).toEqual([0, 1, 2]);
  });

  it('ignores case, accents, and empty queries', () => {
    expect(
      searchTopics([{ ...titled, title: { ru: 'Кафе', uk: 'Кафе', en: 'Café' } }], 'CAFÉ'),
    ).toEqual([{ id: 'title', rank: 0 }]);
    expect(
      searchTopics(
        [
          {
            ...phrased,
            phrases: [
              { id: 'n', es: '¿El niño?', tr: { ru: 'Мальчик', uk: 'Хлопчик', en: 'The boy' } },
            ],
          },
        ],
        'nino',
      )[0]?.id,
    ).toBe('phrase');
    expect(searchTopics(topics, '   ')).toEqual([]);
    expect(searchTopics(topics, 'qqqq-нет')).toEqual([]);
  });

  it('finds the published restaurant topic by a synonym', () => {
    const hits = searchTopics(buildCheatsheetIndex(), 'официант');
    expect(hits[0]).toMatchObject({ id: 'a1.restaurante', rank: 1 });
    expect(searchTopics(buildCheatsheetIndex(), 'дни недели')[0]?.id).toBe('a1.tiempo');
  });
});
