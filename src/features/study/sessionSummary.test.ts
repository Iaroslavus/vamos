import { sessionPlan } from './sessionPlan';
import {
  attemptsForStep,
  attemptsFromUnits,
  isPerfect,
  percentOf,
  studyStepsForRepeat,
  summarizeCards,
  summarizeScores,
  summarizeSpeak,
} from './sessionSummary';
import { planMistakeTest, testUnitsForMistakes } from './testMode';
import {
  DEFAULT_STUDY_SETTINGS,
  DEFAULT_TEST_SETTINGS,
  type StudyFlashcardStep,
  type StudySettings,
  type StudyStep,
  type StudyUnit,
} from './types';
import { applyMark, startRound } from './flashcards';

function word(id: string, es: string, tr: string): StudyUnit {
  return {
    id,
    es,
    tr,
    audio: null,
    introduced: true,
    state: 2,
    due: false,
    hard: false,
    recall: false,
  };
}

function settings(extra: Partial<StudySettings> = {}): StudySettings {
  return { ...DEFAULT_STUDY_SETTINGS, ...extra };
}

function card(id: string, front: string, back: string): StudyFlashcardStep {
  return {
    id,
    type: 'flashcard',
    autoplay: false,
    itemId: id,
    direction: 'es_to_ru',
    front,
    back,
    phraseEs: front,
    phraseTr: back,
    audio: `${id}.mp3`,
  };
}

describe('session summary counts', () => {
  it('rounds the percent and keeps a later correction in the mistake list', () => {
    const summary = summarizeScores([
      {
        key: 'a',
        itemId: 'hola',
        phrase: 'hola',
        phraseEs: 'hola',
        audio: null,
        correct: 'привет',
        yours: 'привет',
        passed: true,
      },
      {
        key: 'b',
        itemId: 'adios',
        phrase: 'adiós',
        phraseEs: 'adiós',
        audio: null,
        correct: 'пока',
        yours: 'пака',
        passed: false,
      },
      {
        key: 'c',
        itemId: 'gracias',
        phrase: 'gracias',
        phraseEs: 'gracias',
        audio: null,
        correct: 'спасибо',
        yours: 'спасиба',
        passed: false,
      },
    ]);

    expect(percentOf(2, 3)).toBe(67);
    expect(summary).toMatchObject({
      variant: 'score',
      correct: 1,
      wrong: 2,
      percent: 33,
    });
    expect(summary.rows.map((row) => row.itemId)).toEqual(['adios', 'gracias']);
    expect(summary.rows[0]).toMatchObject({ yours: 'пака', correct: 'пока' });
    expect(summary.repeatIds).toEqual(['adios', 'gracias']);
    expect(isPerfect(summary)).toBe(false);
  });

  it('celebrates a clean round and ignores an empty one', () => {
    const clean = summarizeScores([
      {
        key: 'a',
        itemId: 'hola',
        phrase: 'hola',
        phraseEs: 'hola',
        audio: null,
        correct: 'привет',
        yours: 'привет',
        passed: true,
      },
    ]);
    expect(clean.percent).toBe(100);
    expect(isPerfect(clean)).toBe(true);
    expect(isPerfect(summarizeScores([]))).toBe(false);
    expect(percentOf(0, 0)).toBe(0);
  });

  it('counts cards as know and still learning', () => {
    let round = startRound([card('hola', 'hola', 'привет'), card('adios', 'adiós', 'пока')]);
    round = applyMark(round, 'know');
    round = applyMark(round, 'again');
    const summary = summarizeCards(round);
    expect(summary).toMatchObject({
      variant: 'cards',
      correct: 1,
      wrong: 1,
      percent: 50,
      repeatIds: ['adios'],
    });
    expect(summary.rows).toEqual([
      expect.objectContaining({
        itemId: 'adios',
        phrase: 'adiós',
        correct: 'пока',
        yours: null,
      }),
    ]);
    expect(
      isPerfect(summarizeCards(applyMark(startRound([card('hola', 'hola', 'привет')]), 'know'))),
    ).toBe(true);
  });

  it('averages pronunciation and lists the lowest misses first', () => {
    const summary = summarizeSpeak([
      {
        key: 'a',
        itemId: 'hola',
        phraseEs: 'hola',
        phraseTr: 'привет',
        audio: null,
        score: 90,
        passed: true,
      },
      {
        key: 'b',
        itemId: 'adios',
        phraseEs: 'adiós',
        phraseTr: 'пока',
        audio: null,
        score: 40,
        passed: false,
      },
      {
        key: 'c',
        itemId: 'gracias',
        phraseEs: 'gracias',
        phraseTr: 'спасибо',
        audio: null,
        score: 20,
        passed: false,
      },
    ]);
    expect(summary).toMatchObject({ variant: 'speak', correct: 1, wrong: 2, percent: 50 });
    expect(summary.rows.map((row) => row.itemId)).toEqual(['gracias', 'adios']);
    expect(summary.rows.map((row) => row.score)).toEqual([20, 40]);
    expect(summary.repeatIds).toEqual(['gracias', 'adios']);
  });

  it('keeps a passing speak score off the mistake list', () => {
    const summary = summarizeSpeak([
      {
        key: 'a',
        itemId: 'hola',
        phraseEs: 'hola',
        phraseTr: 'привет',
        audio: null,
        score: 80,
        passed: true,
      },
      {
        key: 'b',
        itemId: 'adios',
        phraseEs: 'adiós',
        phraseTr: 'пока',
        audio: null,
        score: 100,
        passed: true,
      },
    ]);
    expect(summary.percent).toBe(90);
    expect(summary.rows).toEqual([]);
    expect(isPerfect(summary)).toBe(true);
  });
});

describe('repeat mistakes session', () => {
  const pool = [
    word('adios', 'adiós', 'пока'),
    word('gracias', 'gracias', 'спасибо'),
    word('hola', 'hola', 'привет'),
    word('porfavor', 'por favor', 'пожалуйста'),
  ];

  it('replays only the missed phrases and keeps the mode', () => {
    const blitz = sessionPlan('blitz', pool, settings({ count: 20 }));
    const missed = studyStepsForRepeat(blitz, ['hola', 'gracias']);
    expect(missed.map(itemId)).toEqual(['gracias', 'hola']);
    expect(missed.every((step) => step.type === 'select_translation')).toBe(true);

    const learn = sessionPlan('learn', pool, settings({ count: 20 }));
    const again = studyStepsForRepeat(learn, ['hola']);
    expect(again.length).toBeGreaterThan(0);
    expect(again.length).toBeLessThan(learn.length);
    expect(again.flatMap(stepIds)).toEqual(['hola']);
  });

  it('builds a short test from the missed phrases without refilling the paper', () => {
    const units = Array.from({ length: 8 }, (_, index) =>
      word(`id${index}`, `es${index}`, `tr${index}`),
    );
    const missed = testUnitsForMistakes(units, ['id4', 'id1']);
    const questions = planMistakeTest(missed, {
      ...DEFAULT_TEST_SETTINGS,
      count: 10,
      kinds: ['choice'],
    });
    expect(questions).toHaveLength(2);
    expect(
      questions.map((question) => (question.kind === 'choice' ? question.itemId : '')),
    ).toEqual(['id1', 'id4']);
  });

  it('marks a typed miss and a clean pair for the repeat list', () => {
    const step = sessionPlan('blitz', pool, settings({ count: 20 }))[0];
    expect(step?.type).toBe('select_translation');
    if (!step || step.type !== 'select_translation') return;
    const [attempt] = attemptsForStep(step, { kind: 'record', grade: 'incorrect' }, 'нет', [], 0);
    expect(attempt).toMatchObject({ itemId: 'adios', yours: 'нет', passed: false });

    const board = attemptsFromUnits(pool.slice(0, 2), ['adios'], 'pairs');
    expect(board.map((row) => row.passed)).toEqual([false, true]);
    const summary = summarizeScores(board);
    expect(
      studyStepsForRepeat(
        sessionPlan('blitz', pool, settings({ count: 20 })),
        summary.repeatIds,
      ).map(itemId),
    ).toEqual(['adios']);
  });
});

function itemId(step: StudyStep): string {
  return 'itemId' in step ? step.itemId : '';
}

function stepIds(step: StudyStep): string[] {
  return step.type === 'match_pairs' ? [...step.itemIds] : 'itemId' in step ? [step.itemId] : [];
}
