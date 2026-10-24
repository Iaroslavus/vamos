import {
  DEFAULT_MAX_HEARTS,
  XP_ALMOST,
  XP_CORRECT,
  useLessonStore,
  type LessonExerciseItem,
} from './store';

const EXERCISES: LessonExerciseItem[] = [
  {
    id: 'e1',
    type: 'select_translation',
    prompt_ru: 'Выберите перевод',
    prompt: 'hola',
    options: ['привет', 'пока'],
    answer: 'hola',
    accepted: ['Hola'],
  },
  {
    id: 'e2',
    type: 'select_translation',
    prompt_ru: 'Выберите перевод',
    prompt: 'gracias',
    options: ['спасибо', 'пожалуйста'],
    answer: 'gracias',
  },
  {
    id: 'e3',
    type: 'build_sentence',
    prompt_ru: 'Составьте',
    tiles: ['café', 'el'],
    answer: 'café',
  },
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

  it('selecting an answer does not change score, hearts, or status', () => {
    startWithClock();
    useLessonStore.getState().setAnswer('привет');

    const state = useLessonStore.getState();
    expect(state.status).toBe('active');
    expect(state.xpEarned).toBe(0);
    expect(state.correctCount).toBe(0);
    expect(state.wrongCount).toBe(0);
    expect(state.hearts).toBe(DEFAULT_MAX_HEARTS);
    expect(state.lastGrade).toBeNull();
  });

  it('allows reselection without grading until checkAnswer', () => {
    startWithClock();
    useLessonStore.getState().setAnswer('пока');
    useLessonStore.getState().setAnswer('привет');
    useLessonStore.getState().setAnswer('');
    useLessonStore.getState().setAnswer('привет');

    const before = useLessonStore.getState();
    expect(before.userAnswer).toBe('привет');
    expect(before.status).toBe('active');
    expect(before.xpEarned).toBe(0);
    expect(before.wrongCount).toBe(0);
    expect(before.lastGrade).toBeNull();

    // Store test fixtures use Spanish answer keys; grade via matching answer.
    useLessonStore.getState().setAnswer('hola');
    const grade = useLessonStore.getState().checkAnswer();
    expect(grade?.status).toBe('correct');
    expect(useLessonStore.getState().xpEarned).toBe(XP_CORRECT);
    expect(useLessonStore.getState().status).toBe('feedback');
  });

  it('grades only when checkAnswer is pressed, not on setAnswer', () => {
    startWithClock();
    useLessonStore.getState().setAnswer('adios');
    expect(useLessonStore.getState().wrongCount).toBe(0);
    expect(useLessonStore.getState().hearts).toBe(DEFAULT_MAX_HEARTS);

    const grade = useLessonStore.getState().checkAnswer();
    expect(grade?.status).toBe('wrong');
    expect(useLessonStore.getState().wrongCount).toBe(1);
    expect(useLessonStore.getState().hearts).toBe(DEFAULT_MAX_HEARTS - 1);
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

    // e3 correct → mistakes intro before retry
    useLessonStore.getState().setAnswer('café');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();
    expect(useLessonStore.getState().status).toBe('mistakes_intro');
    expect(useLessonStore.getState().queue).toEqual(['e1']);

    useLessonStore.getState().continueMistakesIntro();

    // retry e1
    expect(useLessonStore.getState().status).toBe('active');
    expect(useLessonStore.getState().getCurrentExercise()?.id).toBe('e1');
    useLessonStore.getState().setAnswer('hola');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();

    expect(useLessonStore.getState().status).toBe('completed');
    expect(useLessonStore.getState().getProgress().ratio).toBe(1);
  });

  it('shows mistakes intro exactly once when the main pass ends with retries', () => {
    startWithClock();

    useLessonStore.getState().setAnswer('nope');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();

    useLessonStore.getState().setAnswer('gracias');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();

    useLessonStore.getState().setAnswer('café');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();

    expect(useLessonStore.getState().status).toBe('mistakes_intro');
    expect(useLessonStore.getState().mistakesIntroShown).toBe(true);
    expect(useLessonStore.getState().queue).toHaveLength(1);

    useLessonStore.getState().continueMistakesIntro();
    expect(useLessonStore.getState().status).toBe('active');

    // Wrong again during retries must not re-open the intro.
    useLessonStore.getState().setAnswer('nope');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();
    expect(useLessonStore.getState().status).toBe('active');
    expect(useLessonStore.getState().mistakesIntroShown).toBe(true);
  });

  it('skips mistakes intro when there are no wrongs to retry', () => {
    startWithClock();
    for (const answer of ['hola', 'gracias', 'café']) {
      useLessonStore.getState().setAnswer(answer);
      useLessonStore.getState().checkAnswer();
      useLessonStore.getState().continueAfterFeedback();
    }

    expect(useLessonStore.getState().status).toBe('completed');
    expect(useLessonStore.getState().mistakesIntroShown).toBe(false);
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
    expect(state.summary).toBeNull();
    expect(state.completionSaved).toBe(false);
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

  it('getSummary reports accuracy, xp, and new words after completion', () => {
    useLessonStore.getState().startLesson({
      lessonId: 'a1-u01-l01',
      exercises: EXERCISES,
      newItems: [{ id: 'hola', es: 'hola', ru: 'привет', pos: 'interjection', variant: 'both' }],
      now: () => 1000,
    });

    for (const answer of ['hola', 'gracias', 'café']) {
      useLessonStore.getState().setAnswer(answer);
      useLessonStore.getState().checkAnswer();
      useLessonStore.getState().continueAfterFeedback();
    }

    const summary = useLessonStore.getState().getSummary();
    expect(summary.status).toBe('completed');
    expect(summary.xpEarned).toBe(XP_CORRECT * 3);
    expect(summary.accuracy).toBe(1);
    expect(summary.newItems).toHaveLength(1);
    expect(summary.newItems[0]?.es).toBe('hola');
  });

  it('finishLesson freezes one summary and claims a single save', () => {
    useLessonStore.getState().startLesson({
      lessonId: 'a1-u01-l01',
      exercises: EXERCISES,
      now: () => 1000,
    });

    expect(useLessonStore.getState().finishLesson()).toBeNull();
    expect(useLessonStore.getState().claimCompletionSave()).toBe(false);

    for (const answer of ['hola', 'gracias', 'café']) {
      useLessonStore.getState().setAnswer(answer);
      useLessonStore.getState().checkAnswer();
      useLessonStore.getState().continueAfterFeedback();
    }

    const first = useLessonStore.getState().finishLesson();
    const second = useLessonStore.getState().finishLesson();
    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(useLessonStore.getState().getSummary()).toBe(first);
    expect(useLessonStore.getState().claimCompletionSave()).toBe(true);
    expect(useLessonStore.getState().claimCompletionSave()).toBe(false);
  });

  it('awards XP for a dialog line chosen on the first try', () => {
    startWithClock();
    const result = useLessonStore.getState().recordDialogLine({
      stepId: 's9',
      lineIndex: 1,
      itemId: 'hola.buenos_dias',
      answer: 'buenos días',
      options: ['buenos días', 'gracias'],
      prompt: 'доброе утро',
      promptRu: 'Выберите реплику',
      missed: false,
    });

    expect(result).toEqual({ applied: true, failed: false, hearts: DEFAULT_MAX_HEARTS });
    const state = useLessonStore.getState();
    expect(state.correctCount).toBe(1);
    expect(state.xpEarned).toBe(XP_CORRECT);
    expect(state.wrongCount).toBe(0);
    expect(state.queue).toEqual(['e1', 'e2', 'e3']);
  });

  it('queues a missed dialog line into the mistakes round', () => {
    startWithClock();
    const missed = useLessonStore.getState().recordDialogLine({
      stepId: 's9',
      lineIndex: 1,
      itemId: 'hola.buenos_dias',
      answer: 'buenos días',
      options: ['buenos días', 'gracias'],
      prompt: 'доброе утро',
      promptRu: 'Выберите реплику',
      missed: true,
    });

    expect(missed.applied).toBe(true);
    expect(missed.hearts).toBe(DEFAULT_MAX_HEARTS - 1);
    expect(
      useLessonStore.getState().recordDialogLine({
        stepId: 's9',
        lineIndex: 1,
        itemId: 'hola.buenos_dias',
        answer: 'buenos días',
        options: ['buenos días', 'gracias'],
        prompt: 'доброе утро',
        promptRu: 'Выберите реплику',
        missed: true,
      }).applied,
    ).toBe(false);

    const retryId = 'dialog-retry:s9:1';
    expect(useLessonStore.getState().queue).toEqual(['e1', 'e2', 'e3', retryId]);
    expect(useLessonStore.getState().exerciseById[retryId]).toMatchObject({
      type: 'select_translation',
      prompt: 'доброе утро',
      answer: 'buenos días',
    });

    useLessonStore.getState().setAnswer('hola');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();
    useLessonStore.getState().setAnswer('gracias');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();
    useLessonStore.getState().setAnswer('café');
    useLessonStore.getState().checkAnswer();
    useLessonStore.getState().continueAfterFeedback();

    expect(useLessonStore.getState().status).toBe('mistakes_intro');
    expect(useLessonStore.getState().queue).toEqual([retryId]);
    useLessonStore.getState().continueMistakesIntro();
    expect(useLessonStore.getState().getCurrentExercise()).toMatchObject({
      id: retryId,
      answer: 'buenos días',
    });
  });

  it('fails the lesson when a dialog miss spends the last heart', () => {
    useLessonStore.getState().startLesson({
      lessonId: 'hard',
      exercises: [EXERCISES[0]!],
      hearts: 1,
      maxHearts: 1,
      now: () => 5_000,
    });

    const result = useLessonStore.getState().recordDialogLine({
      stepId: 's9',
      lineIndex: 0,
      itemId: 'hola.gracias',
      answer: 'gracias',
      options: ['gracias', 'hola'],
      prompt: 'спасибо',
      promptRu: 'Выберите реплику',
      missed: true,
    });

    expect(result.failed).toBe(true);
    const state = useLessonStore.getState();
    expect(state.status).toBe('failed');
    expect(state.hearts).toBe(0);
    expect(state.finishedAt).toBe(5_000);
    expect(state.queue).toEqual(['e1', 'dialog-retry:s9:0']);
  });

  it('ignores a dialog report when the lesson is not active', () => {
    const result = useLessonStore.getState().recordDialogLine({
      stepId: 's9',
      lineIndex: 0,
      itemId: 'hola.gracias',
      answer: 'gracias',
      options: ['gracias'],
      prompt: 'спасибо',
      promptRu: 'Выберите реплику',
      missed: true,
    });

    expect(result).toEqual({ applied: false, failed: false, hearts: DEFAULT_MAX_HEARTS });
    expect(useLessonStore.getState().queue).toEqual([]);
  });
});
