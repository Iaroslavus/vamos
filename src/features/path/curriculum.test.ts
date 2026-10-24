import {
  buildPathNodes,
  currentLevel,
  getCurriculumLessons,
  levelProgress,
  levelRatio,
  pathUnit,
} from './curriculum';

describe('curriculum path', () => {
  it('lists A1 unit 1 in lesson order', () => {
    expect(getCurriculumLessons().map((lesson) => lesson.id)).toEqual([
      'a1.hola.l1',
      'a1.hola.l2',
      'a1.numbers.l1',
    ]);
  });

  it('opens the first lesson and locks the rest', () => {
    const nodes = buildPathNodes(getCurriculumLessons(), []);

    expect(nodes.map((node) => node.status)).toEqual(['current', 'locked', 'locked']);
    expect(nodes.map((node) => node.side)).toEqual(['left', 'right', 'left']);
    expect(pathUnit(getCurriculumLessons(), [])?.id).toBe('a1.hola.l1');
  });

  it('advances the current node after a lesson is completed', () => {
    const lessons = getCurriculumLessons();
    const nodes = buildPathNodes(lessons, ['a1.hola.l1']);

    expect(nodes.map((node) => node.status)).toEqual(['completed', 'current', 'locked']);
    expect(pathUnit(lessons, ['a1.hola.l1'])?.id).toBe('a1.hola.l2');
  });

  it('keeps the last unit when every lesson is completed', () => {
    const lessons = getCurriculumLessons();
    const done = lessons.map((lesson) => lesson.id);

    expect(buildPathNodes(lessons, done).every((node) => node.status === 'completed')).toBe(true);
    expect(pathUnit(lessons, done)?.id).toBe('a1.numbers.l1');
  });

  it('returns no unit for an empty path', () => {
    expect(pathUnit([], [])).toBeNull();
  });
});

describe('level progress', () => {
  it('counts only A1 lessons and leaves the other levels empty', () => {
    const rows = levelProgress([]);

    expect(rows.find((row) => row.level === 'A1')).toEqual({
      level: 'A1',
      completed: 0,
      total: 3,
    });
    expect(rows.filter((row) => row.level !== 'A1').every((row) => row.total === 0)).toBe(true);
    expect(currentLevel(rows)).toBe('A1');
    expect(levelRatio(rows[0])).toBe(0);
  });

  it('moves the current level forward once A1 is finished', () => {
    const lessons = [
      { id: 'a1', level: 'A1' as const, unit: 1, titleKey: 'a1' },
      { id: 'a2', level: 'A2' as const, unit: 1, titleKey: 'a2' },
    ];
    const rows = levelProgress(['a1'], lessons);

    expect(rows.find((row) => row.level === 'A1')?.completed).toBe(1);
    expect(levelRatio(rows[0])).toBe(1);
    expect(currentLevel(rows)).toBe('A2');
  });

  it('ignores a completed id that is not on the path', () => {
    const rows = levelProgress(['not-a-lesson']);

    expect(rows.find((row) => row.level === 'A1')?.completed).toBe(0);
  });
});
