import type { GradeStatus } from '@/features/lesson/grading';

import {
  buildQuickReviewExercises,
  exerciseResult,
  pendingExerciseRatings,
  QUICK_REVIEW_LIMIT,
  ratingForExerciseResult,
  type ReviewDistractor,
  type ReviewExercisePrompts,
  type ReviewExerciseSource,
} from './exercises';

const PROMPTS: ReviewExercisePrompts = {
  select: 'Выберите',
  listen: 'Слушайте',
  type: 'Введите',
};

function word(id: string, es: string, ru: string): ReviewDistractor {
  return { id, es, ru };
}

const POOL: ReviewDistractor[] = [
  word('adios', 'adiós', 'до свидания'),
  word('gracias', 'gracias', 'спасибо'),
  word('hola', 'hola', 'привет'),
  word('por-favor', 'por favor', 'пожалуйста'),
  word('uno', 'uno', 'один'),
];

function source(
  id: string,
  direction: ReviewExerciseSource['direction'] = 'es_to_ru',
): ReviewExerciseSource {
  const entry = POOL.find((item) => item.id === id) ?? word(id, `${id}-es`, `${id}-ru`);
  return {
    itemId: id,
    direction,
    es: entry.es,
    ru: entry.ru,
    audio: `${id}.mp3`,
  };
}

describe('ratingForExerciseResult', () => {
  it('maps a first-try success to Good', () => {
    expect(ratingForExerciseResult('correct_first')).toBe('good');
  });

  it('maps a success after a miss to Hard', () => {
    expect(ratingForExerciseResult('correct_after_error')).toBe('hard');
  });

  it('maps a miss to Again', () => {
    expect(ratingForExerciseResult('incorrect')).toBe('again');
  });
});

describe('exerciseResult', () => {
  it('treats a first pass as correct on the first try', () => {
    expect(exerciseResult(['correct'], false)).toBe('correct_first');
    expect(exerciseResult(['almost'], false)).toBe('correct_first');
  });

  it('treats a later pass as correct after an error', () => {
    expect(exerciseResult(['wrong', 'correct'], false)).toBe('correct_after_error');
    expect(exerciseResult(['wrong', 'wrong', 'almost'], false)).toBe('correct_after_error');
  });

  it('keeps a miss open until the session fails', () => {
    expect(exerciseResult(['wrong'], false)).toBeNull();
    expect(exerciseResult(['wrong', 'wrong'], true)).toBe('incorrect');
  });

  it('has no result before the first grade', () => {
    expect(exerciseResult([], true)).toBeNull();
  });
});

describe('pendingExerciseRatings', () => {
  function rate(
    attempts: [string, GradeStatus[]][],
    options: { focusId: string; sessionFailed: boolean; rated?: string[]; queued?: string[] },
  ) {
    return pendingExerciseRatings({
      attempts: new Map(attempts),
      rated: new Set(options.rated ?? []),
      queued: new Set(options.queued ?? []),
      focusId: options.focusId,
      sessionFailed: options.sessionFailed,
    });
  }

  it('queues Good for a first-try pass and Hard after a miss', () => {
    expect(rate([['q0', ['correct']]], { focusId: 'q0', sessionFailed: false })).toEqual([
      { exerciseId: 'q0', rating: 'good' },
    ]);
    expect(rate([['q1', ['wrong', 'correct']]], { focusId: 'q1', sessionFailed: false })).toEqual([
      { exerciseId: 'q1', rating: 'hard' },
    ]);
  });

  it('does not rate a miss that the lesson engine will retry', () => {
    expect(rate([['q0', ['wrong']]], { focusId: 'q0', sessionFailed: false })).toEqual([]);
  });

  it('rates every unresolved miss Again when the session fails', () => {
    expect(
      rate(
        [
          ['q0', ['correct']],
          ['q1', ['wrong']],
          ['q2', ['wrong', 'wrong']],
        ],
        { focusId: 'q2', sessionFailed: true, rated: ['q0'] },
      ),
    ).toEqual([
      { exerciseId: 'q1', rating: 'again' },
      { exerciseId: 'q2', rating: 'again' },
    ]);
  });

  it('skips an exercise that is already queued', () => {
    expect(
      rate([['q0', ['correct']]], { focusId: 'q0', sessionFailed: false, queued: ['q0'] }),
    ).toEqual([]);
  });
});

describe('buildQuickReviewExercises', () => {
  it('builds at most 10 exercises in queue order', () => {
    const cards = Array.from({ length: 12 }, (_, index) => source(`word-${index}`));
    const built = buildQuickReviewExercises({ cards, pool: POOL, prompts: PROMPTS });
    expect(built).toHaveLength(QUICK_REVIEW_LIMIT);
    expect(built[0]?.itemId).toBe('word-0');
    expect(built[9]?.itemId).toBe('word-9');
  });

  it('cycles recognition cards through select, listen, and type', () => {
    const built = buildQuickReviewExercises({
      cards: [source('hola'), source('gracias'), source('adios'), source('uno')],
      pool: POOL,
      prompts: PROMPTS,
    });

    expect(built.map((item) => item.exercise.type)).toEqual([
      'select_translation',
      'listen_select',
      'type_translation',
      'select_translation',
    ]);

    const select = built[0]?.exercise;
    if (select?.type !== 'select_translation') throw new Error('expected select');
    expect(select.prompt).toBe('hola');
    expect(select.answer).toBe('привет');
    expect(select.prompt_ru).toBe('Выберите');
    expect(select.options).toContain('привет');
    expect(new Set(select.options).size).toBe(select.options.length);
    expect(select.options).toHaveLength(4);

    const listen = built[1]?.exercise;
    if (listen?.type !== 'listen_select') throw new Error('expected listen');
    expect(listen.speakText).toBe('gracias');
    expect(listen.answer).toBe('спасибо');
    expect(listen.audio).toBe('gracias.mp3');
    expect(listen.prompt_ru).toBe('Слушайте');
    expect(listen.options).toContain('спасибо');

    const typed = built[2]?.exercise;
    if (typed?.type !== 'type_translation') throw new Error('expected type');
    expect(typed).toMatchObject({
      prompt: 'adiós',
      answer: 'до свидания',
      direction: 'es_to_ru',
      prompt_ru: 'Введите',
    });
  });

  it('asks for the Spanish form on a recall card and skips listening', () => {
    const built = buildQuickReviewExercises({
      cards: [source('hola', 'ru_to_es'), source('gracias', 'ru_to_es')],
      pool: POOL,
      prompts: PROMPTS,
    });

    const select = built[0]?.exercise;
    if (select?.type !== 'select_translation') throw new Error('expected select');
    expect(select.prompt).toBe('привет');
    expect(select.answer).toBe('hola');
    expect(select.options).toContain('hola');
    expect(select.options.every((option) => option !== 'привет')).toBe(true);

    expect(built[1]?.exercise.type).toBe('type_translation');
    if (built[1]?.exercise.type !== 'type_translation') return;
    expect(built[1].exercise).toMatchObject({
      prompt: 'спасибо',
      answer: 'gracias',
      direction: 'ru_to_es',
    });
  });

  it('falls back to typing when there is no other choice', () => {
    const built = buildQuickReviewExercises({
      cards: [source('hola')],
      pool: [word('hola', 'hola', 'привет')],
      prompts: PROMPTS,
    });
    expect(built[0]?.exercise.type).toBe('type_translation');
  });
});
