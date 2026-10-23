import { completedLessonIds } from './completedLessons';

describe('completedLessonIds', () => {
  it('keeps only completed lessons', () => {
    expect(
      completedLessonIds([
        { lessonId: 'a1-u01-l01', status: 'completed', bestAccuracy: 90, completedAt: null },
        { lessonId: 'a1-u01-l02', status: 'in_progress', bestAccuracy: null, completedAt: null },
      ]),
    ).toEqual(['a1-u01-l01']);
  });
});
