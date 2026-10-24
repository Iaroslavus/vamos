import { getLesson } from '@/features/content/loader';

import { saveLessonCompletion } from './completion';
import type { DialogStep } from './generator';
import { loadLessonSession } from './session';
import { DEFAULT_MAX_HEARTS, useLessonStore } from './store';

describe('lesson player session', () => {
  beforeEach(() => {
    useLessonStore.getState().reset();
  });

  it('plays a1.hola.l1 from the intro through to the summary', async () => {
    const session = loadLessonSession('a1.hola.l1');
    expect(session.steps[0]?.type).toBe('intro');
    expect(session.steps.some((step) => step.type === 'speak_repeat')).toBe(true);
    expect(session.steps.some((step) => step.type === 'dialog')).toBe(true);
    expect(session.steps.some((step) => step.type === 'select_translation')).toBe(true);

    useLessonStore.getState().startScript({
      lessonId: session.lessonId,
      script: session.script,
      exercises: session.exercises,
      newItems: session.newItems,
      now: () => 1_000,
    });

    let guard = 0;
    while (useLessonStore.getState().status !== 'completed') {
      guard += 1;
      if (guard > 80) throw new Error('lesson did not finish');
      const state = useLessonStore.getState();
      if (state.status === 'failed') throw new Error('lesson failed');
      if (state.status === 'mistakes_intro') {
        state.continueMistakesIntro();
        continue;
      }
      if (state.status === 'feedback') {
        state.continueAfterFeedback();
        continue;
      }

      if (state.flow === 'script') {
        const entry = state.script[state.scriptIndex];
        const step = session.steps[state.scriptIndex];
        if (!entry || !step) throw new Error('missing step');

        if (entry.kind === 'exercise') {
          const exercise = state.getCurrentExercise();
          if (!exercise) throw new Error(`missing exercise ${entry.id}`);
          state.setAnswer(exercise.answer);
          expect(state.checkAnswer()?.status).toBe('correct');
          continue;
        }

        if (entry.kind === 'dialog' && step.type === 'dialog') {
          answerDialog(step, session.items);
          const hearts = useLessonStore.getState().hearts;
          useLessonStore.getState().advanceStep();
          expect(useLessonStore.getState().hearts).toBe(hearts);
          continue;
        }

        const hearts = state.hearts;
        const wrong = state.wrongCount;
        const xp = state.xpEarned;
        state.advanceStep();
        const next = useLessonStore.getState();
        expect(next.hearts).toBe(hearts);
        expect(next.wrongCount).toBe(wrong);
        expect(next.xpEarned).toBe(xp);
        continue;
      }

      const exercise = state.getCurrentExercise();
      if (!exercise) throw new Error('missing retry');
      state.setAnswer(exercise.answer);
      state.checkAnswer();
    }

    const done = useLessonStore.getState();
    expect(done.hearts).toBe(DEFAULT_MAX_HEARTS);
    expect(done.wrongCount).toBe(0);
    expect(done.stepsCompleted).toBe(done.stepTotal);
    expect(done.stepTotal).toBeGreaterThan(0);

    const summary = done.finishLesson();
    if (!summary) throw new Error('missing summary');
    expect(summary.status).toBe('completed');
    expect(summary.lessonId).toBe('a1.hola.l1');
    expect(summary.xpEarned).toBeGreaterThan(0);
    expect(summary.newItems.map((item) => item.id)).toEqual(getLesson('a1.hola.l1').items);

    const recordCompletion = jest.fn(async () => ({ lessons: [], totalXp: 1, pending: 0 }));
    await saveLessonCompletion({ recordCompletion }, 'user-1', summary);
    expect(recordCompletion).toHaveBeenCalledWith('user-1', {
      lessonId: 'a1.hola.l1',
      accuracy: 100,
      xp: summary.xpEarned,
    });
  });
});

function answerDialog(
  step: DialogStep,
  items: readonly { id: string; es: string; ru: string }[],
): void {
  step.lines.forEach((line, lineIndex) => {
    if (line.who !== 'user') return;
    const target = items.find((item) => item.id === line.target);
    if (!target) throw new Error(`Unknown item id: ${line.target}`);
    useLessonStore.getState().recordDialogLine({
      stepId: step.id,
      lineIndex,
      itemId: target.id,
      answer: target.es,
      options: line.options.map((id) => {
        const option = items.find((item) => item.id === id);
        if (!option) throw new Error(`Unknown item id: ${id}`);
        return option.es;
      }),
      prompt: target.ru,
      promptRu: 'Выберите реплику',
      missed: false,
    });
  });
}
