import { loadLesson } from './loader';
import { serializePairs } from './pairs';
import { FIRST_A1_LESSON_ID, isTypingExercise, toPlayableExercises } from './playable';

describe('toPlayableExercises', () => {
  it('includes typing, listen, and match exercise kinds from A1 lesson 1', () => {
    const lesson = loadLesson(FIRST_A1_LESSON_ID);
    const playable = toPlayableExercises(lesson);

    expect(playable.length).toBeGreaterThan(0);
    expect(playable.some((item) => item.type === 'type_translation')).toBe(true);
    expect(playable.some((item) => item.type === 'fill_gap')).toBe(true);
    expect(playable.some((item) => item.type === 'listen_select')).toBe(true);
    expect(playable.some((item) => item.type === 'match_pairs')).toBe(true);

    const pairs = playable.find((item) => item.type === 'match_pairs');
    if (pairs?.type === 'match_pairs') {
      expect(pairs.answer).toBe(serializePairs(pairs.pairs));
    }

    const typing = playable.filter(isTypingExercise);
    expect(typing.length).toBeGreaterThan(0);
  });
});
