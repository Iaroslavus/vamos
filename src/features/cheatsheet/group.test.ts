import { getTopic } from '@/features/content/loader';
import { textOf } from '@/features/content/text';

import { topicPhraseGroups } from './catalog';
import { groupByLesson } from './group';

describe('groupByLesson', () => {
  it('keeps lesson order and leaves a repeated phrase in the first lesson', () => {
    const items = new Map([
      ['a', { id: 'a', es: 'Hola' }],
      ['b', { id: 'b', es: 'Adiós' }],
      ['c', { id: 'c', es: 'Gracias' }],
    ]);
    const groups = groupByLesson(
      [
        { id: 'l1', title: { ru: 'Первый', uk: 'Перший', en: 'First' }, itemIds: ['a', 'b'] },
        {
          id: 'l2',
          title: { ru: 'Второй', uk: 'Другий', en: 'Second' },
          itemIds: ['b', 'missing', 'c'],
        },
      ],
      items,
    );

    expect(groups.map((group) => group.lessonId)).toEqual(['l1', 'l2']);
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['a', 'b']);
    expect(groups[1]?.items.map((item) => item.id)).toEqual(['c']);
    expect(groups[0]?.title.ru).toBe('Первый');
    expect(groups[1]?.title.en).toBe('Second');
  });

  it('groups the restaurant topic under its lesson titles', () => {
    const groups = topicPhraseGroups(getTopic('a1.restaurante'));
    expect(groups.map((group) => textOf(group.title, 'ru'))).toEqual([
      'Столик',
      'Заказ и аллергия',
    ]);
    expect(groups[0]?.items[0]?.id).toBe('restaurante.mesa');
    expect(groups[0]?.items.length).toBeGreaterThan(0);
    expect(groups[1]?.items.length).toBeGreaterThan(0);
  });
});
