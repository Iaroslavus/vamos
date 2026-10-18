import { loadLesson } from './loader';
import { serializePairs } from './pairs';
import { FIRST_A1_LESSON_ID, toPlayableExercises } from './playable';

describe('toPlayableExercises', () => {
  it('includes listen_select and match_pairs from A1 lesson 1', () => {
    const lesson = loadLesson(FIRST_A1_LESSON_ID);
    const playable = toPlayableExercises(lesson);

    expect(playable.length).toBeGreaterThan(0);
    expect(
      playable.every(
        (item) =>
          item.type === 'select_translation' ||
          item.type === 'build_sentence' ||
          item.type === 'listen_select' ||
          item.type === 'match_pairs',
      ),
    ).toBe(true);
    expect(playable.some((item) => item.type === 'listen_select')).toBe(true);
    expect(playable.some((item) => item.type === 'match_pairs')).toBe(true);

    const pairs = playable.find((item) => item.type === 'match_pairs');
    expect(pairs?.type).toBe('match_pairs');
    if (pairs?.type === 'match_pairs') {
      expect(pairs.answer).toBe(serializePairs(pairs.pairs));
    }
  });
});
