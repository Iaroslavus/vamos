import {
  DEFAULT_MAX_HEARTS,
  XP_ALMOST,
  XP_CORRECT,
  useLessonStore,
  type LessonExerciseItem,
} from './store';

const EXERCISES: LessonExerciseItem[] = [
  { id: 'e1', answer: 'hola', accepted: ['Hola'] },
  { id: 'e2', answer: 'gracias' },
  { id: 'e3', answer: 'café' },
];

function resetStore() {
  useLessonStore.getState().reset();
}

function startWithClock(nowMs = 1_000) {
  useLessonStore.getState().startLesson({
    lessonId: 'a1-u01-l01',
    exercises: EXERCISES,
    now: () => nowMs,
  });
}

describe('lesson store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('starts idle with default hearts', () => {
    const state = useLessonStore.getState();
    expect(state.status).toBe('idle');
    expect(state.hearts).toBe(DEFAULT_MAX_HEARTS);
    expect(state.getCurrentExercise()).toBeNull();
    expect(state.getElapsedMs()).toBe(0);
  });

  it('startLesson activates the first exercise', () => {
    startWithClock();
    const state = useLessonStore.getState();
    expect(state.status).toBe('active');
    expect(state.lessonId).toBe('a1-u01-l01');
    expect(state.getCurrentExercise()?.id).toBe('e1');
    expect(state.getProgress()).toEqual({ solved: 0, total: 3, ratio: 0 });
  });

  it('rejects an empty exercise list', () => {
    expect(() => useLessonStore.getState().startLesson({ lessonId: 'x', exercises: [] })).toThrow(
      /no exercises/,
    );
  });

  it('setAnswer only works while active', () => {
    startWithClock();
    useLessonStore.getState().setAnswer('hola');
    expect(useLessonStore.getState().userAnswer).toBe('hola');

    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().setAnswer('mutated');
    expect(useLessonStore.getState().userAnswer).toBe('hola');
  });

  it('checkAnswer marks correct and awards XP', () => {
    startWithClock();
    useLessonStore.getState().setAnswer('Hola!');
    const grade = useLessonStore.getState().checkAnswer();

    expect(grade?.status).toBe('correct');
    const state = useLessonStore.getState();
    expect(state.status).toBe('feedback');
    expect(state.xpEarned).toBe(XP_CORRECT);
    expect(state.correctCount).toBe(1);
    expect(state.hearts).toBe(DEFAULT_MAX_HEARTS);
  });

  it('almost awards reduced XP and does not consume a heart', () => {
    startWithClock();
    // skip to café exercise
    useLessonStore.setState({ queue: ['e3', 'e1', 'e2'] });
    useLessonStore.getState().setAnswer('cafe');
    const grade = useLessonStore.getState().checkAnswer();

    expect(grade?.status).toBe('almost');
    expect(useLessonStore.getState().xpEarned).toBe(XP_ALMOST);
    expect(useLessonStore.getState().almostCount).toBe(1);
    expect(useLessonStore.getState().hearts).toBe(DEFAULT_MAX_HEARTS);
  });

  it('wrong answer loses a heart and enqueues a retry at the end', () => {
    startWithClock();
    useLessonStore.getState().setAnswer('adios');
    const grade = useLessonStore.getState().checkAnswer();

    expect(grade?.status).toBe('wrong');
    const state = useLessonStore.getState();
    expect(state.hearts).toBe(DEFAULT_MAX_HEARTS - 1);
    expect(state.wrongCount).toBe(1);
    expect(state.xpEarned).toBe(0);
    expect(state.queue).toEqual(['e1', 'e2', 'e3', 'e1']);
  });

  it('continueAfterFeedback advances after a correct answer', () => {
    startWithClock();
    useLessonStore.getState().setAnswer('hola');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();

    const state = useLessonStore.getState();
    expect(state.status).toBe('active');
    expect(state.getCurrentExercise()?.id).toBe('e2');
    expect(state.userAnswer).toBe('');
    expect(state.lastGrade).toBeNull();
    expect(state.getProgress().solved).toBe(1);
  });

  it('replays wrong exercises after the main queue', () => {
    startWithClock();

    // e1 wrong → retry queued
    useLessonStore.getState().setAnswer('nope');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();
    expect(useLessonStore.getState().getCurrentExercise()?.id).toBe('e2');

    // e2 correct
    useLessonStore.getState().setAnswer('gracias');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();

    // e3 correct
    useLessonStore.getState().setAnswer('café');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();

    // retry e1
    expect(useLessonStore.getState().getCurrentExercise()?.id).toBe('e1');
    useLessonStore.getState().setAnswer('hola');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();

    expect(useLessonStore.getState().status).toBe('completed');
    expect(useLessonStore.getState().getProgress().ratio).toBe(1);
  });

  it('completes when every exercise is solved without retries', () => {
    startWithClock();
    for (const answer of ['hola', 'gracias', 'café']) {
      useLessonStore.getState().setAnswer(answer);
      useLessonStore.getState().checkAnswer();
      useLessonStore.getState().continueAfterFeedback();
    }
    expect(useLessonStore.getState().status).toBe('completed');
    expect(useLessonStore.getState().xpEarned).toBe(XP_CORRECT * 3);
  });

  it('fails when hearts reach zero', () => {
    useLessonStore.getState().startLesson({
      lessonId: 'hard',
      exercises: EXERCISES,
      hearts: 1,
      maxHearts: 1,
      now: () => 5_000,
    });

    useLessonStore.getState().setAnswer('wrong');
    useLessonStore.getState().checkAnswer();

    const state = useLessonStore.getState();
    expect(state.status).toBe('failed');
    expect(state.hearts).toBe(0);
    expect(state.finishedAt).toBe(5_000);
  });

  it('tracks elapsed time with the injectable clock', () => {
    let now = 1000;
    useLessonStore.getState().startLesson({
      lessonId: 'timed',
      exercises: [EXERCISES[0]!],
      now: () => now,
    });

    now = 4500;
    expect(useLessonStore.getState().getElapsedMs()).toBe(3500);

    useLessonStore.getState().setAnswer('hola');
    useLessonStore.getState().checkAnswer();
    now = 5000;
    useLessonStore.getState().continueAfterFeedback();

    // completed freezes finishedAt at continue time... actually continue sets finishedAt via getNow at that moment
    expect(useLessonStore.getState().status).toBe('completed');
    expect(useLessonStore.getState().getElapsedMs()).toBe(4000);
  });

  it('checkAnswer is a no-op outside active status', () => {
    expect(useLessonStore.getState().checkAnswer()).toBeNull();
    startWithClock();
    useLessonStore.getState().setAnswer('hola');
    useLessonStore.getState().checkAnswer();
    expect(useLessonStore.getState().checkAnswer()).toBeNull();
  });

  it('continueAfterFeedback is ignored until feedback', () => {
    startWithClock();
    useLessonStore.getState().continueAfterFeedback();
    expect(useLessonStore.getState().getCurrentExercise()?.id).toBe('e1');
  });

  it('reset returns to idle and clears progress', () => {
    startWithClock();
    useLessonStore.getState().setAnswer('hola');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().reset();

    const state = useLessonStore.getState();
    expect(state.status).toBe('idle');
    expect(state.lessonId).toBeNull();
    expect(state.xpEarned).toBe(0);
    expect(state.queue).toEqual([]);
  });

  it('progress ratio caps at 1 even with many almost+correct', () => {
    startWithClock();
    useLessonStore.getState().setAnswer('hola');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();
    useLessonStore.getState().setAnswer('gracias');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();
    useLessonStore.getState().setAnswer('cafe');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();

    expect(useLessonStore.getState().getProgress()).toEqual({
      solved: 3,
      total: 3,
      ratio: 1,
    });
  });

  it('honors accepted variants via grading', () => {
    startWithClock();
    useLessonStore.getState().setAnswer('Hola');
    expect(useLessonStore.getState().checkAnswer()?.status).toBe('correct');
  });
});
