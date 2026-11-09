import { ratingForStudyGrade } from './fsrs';
import {
  LEARN_PORTION,
  answerLearn,
  continueLearn,
  createLearnSession,
  learnProgress,
  learnReturnGap,
  learnStudyGrade,
  learnTask,
  sessionTally,
  type LearnState,
} from './learn';

function card(state: LearnState, id: string) {
  const found = state.cards[id];
  if (!found) throw new Error(`missing ${id}`);
  return found;
}

function ids(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `u${index}`);
}

function learnAll(state: LearnState): LearnState {
  let guard = 0;
  while (state.phase === 'quiz') {
    state = answerLearn(state, true, () => 0).state;
    guard += 1;
    if (guard > 400) throw new Error('learn queue did not finish');
  }
  return state;
}

describe('learn levels', () => {
  it('asks for a choice, then typing, then speech or the reverse direction', () => {
    let state = createLearnSession(['a']);
    expect(learnTask(card(state, 'a').level, true)).toBe('select');

    state = answerLearn(state, true).state;
    expect(card(state, 'a')).toMatchObject({ level: 1, firm: 0, learned: false });
    expect(learnTask(card(state, 'a').level, true)).toBe('type');

    state = answerLearn(state, true).state;
    expect(card(state, 'a')).toMatchObject({ level: 2, firm: 0, learned: false });
    expect(learnTask(card(state, 'a').level, true)).toBe('speak');
    expect(learnTask(card(state, 'a').level, false)).toBe('type_reverse');
  });

  it('learns a unit after two correct answers at level 2 or higher', () => {
    let state = createLearnSession(['a']);
    state = answerLearn(state, true).state;
    state = answerLearn(state, true).state;
    const firstFirm = answerLearn(state, true);
    state = firstFirm.state;
    expect(firstFirm.learned).toBeNull();
    expect(card(state, 'a')).toMatchObject({ level: 3, firm: 1, learned: false });
    expect(learnTask(card(state, 'a').level, true)).toBe('speak');

    const learned = answerLearn(state, true);
    expect(learned.learned).toEqual({ id: 'a', misses: 0 });
    expect(card(learned.state, 'a')).toMatchObject({ level: 4, firm: 2, learned: true });
    expect(learned.state.phase).toBe('done');
    expect(learnStudyGrade(learned.learned?.misses ?? 0)).toBe('correct_first');
    expect(ratingForStudyGrade(learnStudyGrade(0))).toBe('good');
  });

  it('keeps firm points after a miss and rates that unit Hard', () => {
    let state = createLearnSession(['a']);
    state = answerLearn(state, true).state;
    state = answerLearn(state, true).state;
    state = answerLearn(state, true).state;
    state = answerLearn(state, false).state;
    expect(card(state, 'a')).toMatchObject({ level: 2, firm: 1, misses: 1, learned: false });

    const learned = answerLearn(state, true);
    expect(learned.learned).toEqual({ id: 'a', misses: 1 });
    expect(learnStudyGrade(1)).toBe('correct_after_error');
    expect(ratingForStudyGrade(learnStudyGrade(2))).toBe('hard');
  });

  it('drops one level on a miss and never goes below zero', () => {
    let state = createLearnSession(['a']);
    state = answerLearn(state, true).state;
    state = answerLearn(state, false).state;
    expect(card(state, 'a')).toMatchObject({ level: 0, misses: 1, firm: 0 });
    expect(learnTask(card(state, 'a').level, true)).toBe('select');

    state = answerLearn(state, false).state;
    expect(card(state, 'a').level).toBe(0);
    expect(card(state, 'a').misses).toBe(2);
  });

  it('sends a correct unit to the end and a miss back after two or three steps', () => {
    const start = createLearnSession(['a', 'b', 'c', 'd', 'e']);
    expect(answerLearn(start, true).state.queue).toEqual(['b', 'c', 'd', 'e', 'a']);
    expect(answerLearn(start, false, () => 0).state.queue).toEqual(['b', 'c', 'a', 'd', 'e']);
    expect(answerLearn(start, false, () => 0.9).state.queue).toEqual(['b', 'c', 'd', 'a', 'e']);
    expect(learnReturnGap(() => 0)).toBe(2);
    expect(learnReturnGap(() => 0.49)).toBe(2);
    expect(learnReturnGap(() => 0.5)).toBe(3);
  });

  it('clamps the gap when the rest of the portion is shorter', () => {
    const alone = answerLearn(createLearnSession(['a']), false, () => 0.9).state;
    expect(alone.queue).toEqual(['a']);

    const three = answerLearn(createLearnSession(['a', 'b', 'c']), false, () => 0.9).state;
    expect(three.queue).toEqual(['b', 'c', 'a']);
  });

  it('studies a portion of seven, then the remainder, then the session', () => {
    let state = createLearnSession(['  a ', 'a', '', ...ids(9)]);
    expect(state.portion).toHaveLength(LEARN_PORTION);
    expect(state.portion[0]).toBe('a');
    expect(state.waiting).toHaveLength(3);
    expect(learnProgress(state)).toEqual({ learned: 0, total: LEARN_PORTION });
    expect(continueLearn(state)).toBe(state);

    state = learnAll(state);
    expect(state.phase).toBe('break');
    expect(learnProgress(state)).toEqual({ learned: 7, total: 7 });

    state = continueLearn(state);
    expect(state.phase).toBe('quiz');
    expect(state.portion).toEqual(['u6', 'u7', 'u8']);

    state = learnAll(state);
    expect(state.phase).toBe('done');
    expect(sessionTally(state)).toEqual({ learned: 10, total: 10, misses: 0 });
    expect(answerLearn(state, true).state).toBe(state);
  });

  it('counts a unit toward the portion bar as soon as it is learned', () => {
    let state = createLearnSession(['a', 'b']);
    let learned = false;
    let guard = 0;
    while (!learned && guard < 20) {
      const next = answerLearn(state, true, () => 0);
      state = next.state;
      learned = next.learned?.id === 'a';
      guard += 1;
    }
    expect(learnProgress(state)).toEqual({ learned: 1, total: 2 });
    expect(state.phase).toBe('quiz');
    expect(state.queue).toEqual(['b']);
  });

  it('ends immediately when there is nothing to learn', () => {
    const state = createLearnSession([' ', '']);
    expect(state.phase).toBe('done');
    expect(sessionTally(state)).toEqual({ learned: 0, total: 0, misses: 0 });
  });
});
