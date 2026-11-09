import { ratingForStudyGrade } from './fsrs';
import {
  gradeTest,
  planTest,
  testUnitsForMistakes,
  withTestKind,
  type TestPairsQuestion,
  type TestQuestion,
} from './testMode';
import { DEFAULT_TEST_SETTINGS, type StudyUnit, type TestSettings } from './types';

function word(id: string, es: string, tr: string, extra: Partial<StudyUnit> = {}): StudyUnit {
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
    ...extra,
  };
}

function many(count: number): StudyUnit[] {
  return Array.from({ length: count }, (_, index) =>
    word(`id${index}`, `es${index}`, `tr${index}`),
  );
}

function settings(extra: Partial<TestSettings> = {}): TestSettings {
  return {
    ...DEFAULT_TEST_SETTINGS,
    kinds: extra.kinds ?? DEFAULT_TEST_SETTINGS.kinds,
    ...extra,
  };
}

describe('planTest', () => {
  it('fills the chosen length from a short folder and rotates the selected types', () => {
    const questions = planTest(many(4), settings({ count: 10, kinds: ['choice', 'input'] }));
    expect(questions).toHaveLength(10);
    expect(questions.map((question) => question.kind)).toEqual([
      'choice',
      'input',
      'choice',
      'input',
      'choice',
      'input',
      'choice',
      'input',
      'choice',
      'input',
    ]);
    expect(questions.map((question) => ('itemId' in question ? question.itemId : ''))).toEqual([
      'id0',
      'id1',
      'id2',
      'id3',
      'id0',
      'id1',
      'id2',
      'id3',
      'id0',
      'id1',
    ]);
  });

  it('follows the direction, including a mixed paper', () => {
    const forward = planTest(
      many(2),
      settings({ count: 10, kinds: ['input'], direction: 'es_to_ru' }),
    );
    const back = planTest(
      many(2),
      settings({ count: 10, kinds: ['input'], direction: 'ru_to_es' }),
    );
    const mixed = planTest(many(2), settings({ count: 10, kinds: ['choice'], direction: 'mixed' }));
    expect(forward[0]).toMatchObject({ prompt: 'es0', answer: 'tr0', direction: 'es_to_ru' });
    expect(back[0]).toMatchObject({ prompt: 'tr0', answer: 'es0', direction: 'ru_to_es' });
    expect(mixed[0]).toMatchObject({ prompt: 'es0', direction: 'es_to_ru' });
    expect(mixed[1]).toMatchObject({ prompt: 'tr1', direction: 'ru_to_es' });
  });

  it('makes odd true/false statements false when another phrase can stand in', () => {
    const questions = planTest(many(4), settings({ count: 10, kinds: ['true_false'] }));
    const even = questions[0];
    const odd = questions[1];
    expect(even?.kind).toBe('true_false');
    expect(odd?.kind).toBe('true_false');
    if (even?.kind === 'true_false' && odd?.kind === 'true_false') {
      expect(even.answer).toBe(true);
      expect(even.claim).toBe(even.truth);
      expect(odd.answer).toBe(false);
      expect(odd.claim).not.toBe(odd.truth);
    }
  });

  it('keeps a lone phrase as a true statement and types instead of a one-option choice', () => {
    const only = [word('hola', 'hola', 'привет')];
    const bools = planTest(only, settings({ count: 10, kinds: ['true_false'] }));
    expect(bools.every((question) => question.kind === 'true_false' && question.answer)).toBe(true);
    const choices = planTest(only, settings({ count: 10, kinds: ['choice'] }));
    expect(choices.every((question) => question.kind === 'input')).toBe(true);
    expect(planTest(only, settings({ kinds: ['pairs'] }))).toEqual([]);
  });

  it('builds pair boards of two to four and does not reuse a phrase on a second board', () => {
    const spanish = planTest(many(6), settings({ count: 30, kinds: ['pairs'] }));
    expect(spanish).toHaveLength(2);
    const first = spanish[0] as TestPairsQuestion;
    const second = spanish[1] as TestPairsQuestion;
    expect(first.links).toHaveLength(4);
    expect(second.links).toHaveLength(2);
    expect(first.links.map((link) => link.left)).toEqual(['es0', 'es1', 'es2', 'es3']);
    expect(new Set([...first.links, ...second.links].map((link) => link.itemId)).size).toBe(6);

    const recall = planTest(
      many(2),
      settings({ count: 10, kinds: ['pairs'], direction: 'ru_to_es' }),
    )[0] as TestPairsQuestion;
    expect(recall.direction).toBe('ru_to_es');
    expect(recall.links[0]).toMatchObject({ left: 'tr0', right: 'es0' });
  });

  it('skips phrases the learner has not met and blank glosses', () => {
    const questions = planTest(
      [
        word('nuevo', 'nuevo', 'новый', { introduced: false }),
        word('vacio', ' ', 'пусто'),
        word('hola', 'hola', 'привет'),
      ],
      settings({ kinds: ['input'] }),
    );
    expect(
      questions.every((question) => question.kind === 'input' && question.phraseEs === 'hola'),
    ).toBe(true);
  });

  it('refuses to turn off the last question type', () => {
    const choice = settings({ kinds: ['choice'] });
    expect(withTestKind(choice, 'choice')).toEqual(choice);
    expect(withTestKind(choice, 'pairs').kinds).toEqual(['choice', 'pairs']);
  });
});

describe('gradeTest', () => {
  const choice = (id: string, answer: string, prompt = 'hola'): TestQuestion => ({
    id,
    kind: 'choice',
    itemId: 'hola',
    direction: 'es_to_ru',
    prompt,
    options: [answer, 'пока'],
    answer,
    phraseEs: 'hola',
    phraseTr: answer,
    audio: 'items/hola.mp3',
  });

  it('counts an exact answer, keeps a near miss off the score, and writes the weaker FSRS grade', () => {
    const questions = [choice('a', 'café'), choice('b', 'gracias')];
    const result = gradeTest(
      questions,
      {
        a: { kind: 'text', value: 'café' },
        b: { kind: 'text', value: 'graciass' },
      },
      2,
    );
    expect(result).toMatchObject({ correct: 1, total: 2, percent: 50 });
    expect(result.misses).toEqual([
      expect.objectContaining({
        kind: 'text',
        yours: 'graciass',
        correct: 'gracias',
        caption: 'hola',
        audio: 'items/hola.mp3',
      }),
    ]);
    expect(result.grades).toEqual([
      {
        itemId: 'hola',
        direction: 'es_to_ru',
        grade: 'correct_after_error',
        clientId: '2:hola:es_to_ru',
      },
    ]);
    expect(ratingForStudyGrade(result.grades[0]!.grade)).toBe('hard');
  });

  it('treats a blank as a miss and keeps Again when a later ask fails', () => {
    const result = gradeTest(
      [
        { ...choice('a', 'привет'), itemId: 'hola' },
        {
          ...choice('b', 'hola'),
          itemId: 'hola',
          direction: 'ru_to_es',
          answer: 'hola',
        },
      ],
      { a: { kind: 'text', value: 'привет' } },
      1,
    );
    expect(result.percent).toBe(50);
    expect(result.misses[0]).toMatchObject({ yours: '', correct: 'hola' });
    expect(result.grades).toEqual([
      expect.objectContaining({ direction: 'es_to_ru', grade: 'correct_first' }),
      expect.objectContaining({ direction: 'ru_to_es', grade: 'incorrect' }),
    ]);
    expect(ratingForStudyGrade('incorrect')).toBe('again');
    expect(ratingForStudyGrade('correct_first')).toBe('good');
  });

  it('grades a true/false judgment and a partial pairs board per phrase', () => {
    const bool = planTest(
      [word('hola', 'hola', 'привет'), word('adios', 'adiós', 'пока', { audio: 'a.mp3' })],
      settings({ count: 10, kinds: ['true_false'] }),
    )[1];
    expect(bool?.kind).toBe('true_false');
    if (bool?.kind !== 'true_false') return;
    const judged = gradeTest([bool], { [bool.id]: { kind: 'bool', value: true } });
    expect(judged.percent).toBe(0);
    expect(judged.misses[0]).toMatchObject({
      kind: 'bool',
      yours: 'true',
      correct: 'false',
      truth: bool.truth,
    });

    const board = planTest(many(2), settings({ count: 10, kinds: ['pairs'] }))[0];
    if (board?.kind !== 'pairs') return;
    const pairs = gradeTest([board], {
      [board.id]: { kind: 'pairs', matched: { id0: 'tr0', id1: 'tr0' } },
    });
    expect(pairs.percent).toBe(0);
    expect(pairs.misses.map((miss) => miss.itemId)).toEqual(['id1']);
    expect(pairs.misses[0]).toMatchObject({
      kind: 'pair',
      yours: 'tr0',
      correct: 'tr1',
      caption: 'es1',
    });
    expect(pairs.grades).toEqual([
      expect.objectContaining({ itemId: 'id0', grade: 'correct_first' }),
      expect.objectContaining({ itemId: 'id1', grade: 'incorrect' }),
    ]);
  });

  it('builds the retake from the missed phrases only, in folder order', () => {
    const units = many(4);
    const missed = testUnitsForMistakes(units, ['id2', 'missing', 'id0', 'id2']);
    expect(missed.map((unit) => unit.id)).toEqual(['id0', 'id2']);
    const retake = planTest(missed, settings({ count: 10, kinds: ['input'] }));
    expect(
      new Set(retake.map((question) => ('itemId' in question ? question.itemId : ''))),
    ).toEqual(new Set(['id0', 'id2']));
  });
});
