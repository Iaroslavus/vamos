import type { Lesson } from '@/features/lesson/schema';

import { buildPathNodes } from './curriculum';

function lesson(id: string, unit = 1): Lesson {
  return {
    id,
    level: 'A1',
    unit,
    title_ru: id,
    draft: true,
    new_items: [],
    exercises: [
      {
        type: 'select_translation',
        prompt_ru: 'x',
        prompt: 'hola',
        options: ['a', 'b'],
        answer: 'a',
      },
    ],
  };
}

describe('buildPathNodes', () => {
  const lessons = [lesson('a1-u01-l01'), lesson('a1-u01-l02'), lesson('a1-u01-l03')];

  it('marks the first lesson as current when nothing is completed', () => {
    const nodes = buildPathNodes(lessons, []);
    expect(nodes.map((n) => n.status)).toEqual(['current', 'locked', 'locked']);
    expect(nodes[0]?.side).toBe('left');
    expect(nodes[1]?.side).toBe('right');
  });

  it('advances current after completions', () => {
    const nodes = buildPathNodes(lessons, ['a1-u01-l01']);
    expect(nodes.map((n) => n.status)).toEqual(['completed', 'current', 'locked']);
  });

  it('locks nothing current when all lessons are done', () => {
    const nodes = buildPathNodes(lessons, ['a1-u01-l01', 'a1-u01-l02', 'a1-u01-l03']);
    expect(nodes.every((n) => n.status === 'completed')).toBe(true);
  });
});
