import { loadLesson } from './loader';
import { FIRST_A1_LESSON_ID, toPlayableExercises } from './playable';

describe('toPlayableExercises', () => {
  it('keeps only select_translation and build_sentence from A1 lesson 1', () => {
    const lesson = loadLesson(FIRST_A1_LESSON_ID);
    const playable = toPlayableExercises(lesson);

    expect(playable.length).toBeGreaterThan(0);
    expect(
      playable.every(
        (item) => item.type === 'select_translation' || item.type === 'build_sentence',
      ),
    ).toBe(true);
    expect(playable.some((item) => item.type === 'select_translation')).toBe(true);
    expect(playable.some((item) => item.type === 'build_sentence')).toBe(true);
  });
});
