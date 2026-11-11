import {
  ACCENT_PASS_SCORE,
  estimateStudyMinutes,
  isPlayableStudyMode,
  orderedStudyModes,
} from './modes';
import { dueStudyCount, planLearnStep, selectStudyUnits, sessionPlan } from './sessionPlan';
import {
  DEFAULT_STUDY_SETTINGS,
  type StudySettings,
  type StudyStep,
  type StudyUnit,
} from './types';

function settings(extra: Partial<StudySettings> = {}): StudySettings {
  return { ...DEFAULT_STUDY_SETTINGS, ...extra };
}

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

const POOL = [
  word('adios', 'adiós', 'пока'),
  word('gracias', 'gracias', 'спасибо'),
  word('hola', 'hola', 'привет'),
  word('porfavor', 'por favor', 'пожалуйста'),
];

describe('sessionPlan', () => {
  it('keeps only units the learner has already met', () => {
    const stranger = word('nuevo', 'nuevo', 'новый', { introduced: false, due: true, hard: true });
    const steps = sessionPlan('blitz', [stranger, ...POOL], settings({ count: 20 }));
    const ids = steps.map((step) => ('itemId' in step ? step.itemId : step.itemIds.join(',')));
    expect(ids).not.toContain('nuevo');
    expect(steps).toHaveLength(4);
    for (const step of steps) {
      if (step.type !== 'select_translation') continue;
      expect(step.options.join(' ')).not.toContain('новый');
    }
  });

  it('drops a blank gloss even when the unit was introduced', () => {
    const blank = word('vacio', ' ', 'пусто');
    expect(sessionPlan('blitz', [blank], settings())).toEqual([]);
  });

  it('filters due, hard, and unlearned units', () => {
    const units = [
      word('a', 'a', 'а', { due: true, state: 2 }),
      word('b', 'b', 'б', { hard: true, state: 1 }),
      word('c', 'c', 'в', { state: 0 }),
      word('d', 'd', 'г', { state: 2 }),
    ];
    expect(sessionPlan('flashcards', units, settings({ filter: 'due' })).map(itemId)).toEqual([
      'a',
    ]);
    expect(sessionPlan('flashcards', units, settings({ filter: 'hard' })).map(itemId)).toEqual([
      'b',
    ]);
    expect(sessionPlan('flashcards', units, settings({ filter: 'unlearned' })).map(itemId)).toEqual(
      ['b', 'c'],
    );
  });

  it('caps the session at the chosen count', () => {
    expect(sessionPlan('flashcards', POOL, settings({ count: 5 }))).toHaveLength(4);
    const many = Array.from({ length: 8 }, (_, index) =>
      word(`w${index}`, `es${index}`, `tr${index}`),
    );
    expect(sessionPlan('flashcards', many, settings({ count: 5 }))).toHaveLength(5);
    expect(sessionPlan('blitz', many, settings({ count: 20 }))).toHaveLength(8);
    expect(sessionPlan('blitz', many, settings({ count: 5 }))[0]?.id).toBe('blitz-0');
    expect(selectStudyUnits(many, settings({ count: 5 }), 'test')).toHaveLength(8);
  });

  it('plans blitz as a Spanish phrase and four translations', () => {
    const many = Array.from({ length: 6 }, (_, index) =>
      word(`w${index}`, `es${index}`, `tr${index}`),
    );
    const steps = sessionPlan('blitz', many, settings({ count: 20, direction: 'ru_to_es' }));
    expect(steps.every((step) => step.type === 'select_translation')).toBe(true);
    const first = steps[0];
    expect(first).toMatchObject({
      type: 'select_translation',
      direction: 'es_to_ru',
      prompt: 'es0',
      answer: 'tr0',
    });
    if (first?.type === 'select_translation') expect(first.options).toHaveLength(4);
  });

  it('leaves test questions to the test planner and keeps the mode playable', () => {
    expect(sessionPlan('test', POOL, settings())).toEqual([]);
    expect(isPlayableStudyMode('test')).toBe(true);
  });

  it('studies due phrases before new ones and cycles choice, pairs, typing, and dictation', () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      word(`w${index}`, `es${index}`, `tr${index}`, {
        state: index === 2 ? 0 : 2,
        due: index === 7,
      }),
    );
    const steps = sessionPlan('learn', many, settings({ count: 20 }));
    expect(phraseIds(steps)).toEqual(['w7', 'w2', 'w0', 'w1', 'w3', 'w4', 'w5', 'w6']);
    expect(steps.map((step) => step.type)).toEqual([
      'select_translation',
      'match_pairs',
      'type_translation',
      'type_translation',
      'select_translation',
    ]);
    const choice = steps[0];
    if (choice?.type === 'select_translation') expect(choice.options).toHaveLength(4);
    const pairs = steps[1];
    expect(pairs?.type).toBe('match_pairs');
    if (pairs?.type === 'match_pairs') {
      expect(pairs.itemIds).toEqual(['w2', 'w0', 'w1', 'w3']);
      expect(pairs.pairs[0]).toMatchObject({ left: 'es2', right: 'tr2' });
    }
    expect(steps[2]).toMatchObject({
      type: 'type_translation',
      playEs: false,
      itemId: 'w4',
      direction: 'es_to_ru',
      answer: 'tr4',
    });
    expect(steps[3]).toMatchObject({
      type: 'type_translation',
      playEs: true,
      itemId: 'w5',
      direction: 'ru_to_es',
      answer: 'es5',
    });
  });

  it('keeps a short learn list as choices when a pairs board would not fit', () => {
    const steps = sessionPlan('learn', POOL.slice(0, 2), settings({ count: 10 }));
    expect(steps.map((step) => step.type)).toEqual(['select_translation', 'select_translation']);
    expect(phraseIds(steps)).toEqual(['adios', 'gracias']);
  });

  it('types in the session direction and always dictates the Spanish', () => {
    const many = Array.from({ length: 7 }, (_, index) =>
      word(`w${index}`, `es${index}`, `tr${index}`),
    );
    const forward = sessionPlan('learn', many, settings({ count: 20, direction: 'es_to_ru' }));
    expect(forward[2]).toMatchObject({
      type: 'type_translation',
      direction: 'es_to_ru',
      playEs: false,
      answer: 'tr5',
    });
    const recall = sessionPlan('learn', many, settings({ count: 20, direction: 'ru_to_es' }));
    expect(recall[2]).toMatchObject({ direction: 'ru_to_es', playEs: false, answer: 'es5' });
    const mixed = sessionPlan('learn', many, settings({ count: 20, direction: 'mixed' }));
    expect(mixed[2]).toMatchObject({ direction: 'ru_to_es', playEs: false });
    expect(mixed[3]).toMatchObject({
      type: 'type_translation',
      playEs: true,
      direction: 'ru_to_es',
      answer: 'es6',
    });
  });

  it('counts due phrases for the learn badge and ignores blanks', () => {
    expect(
      dueStudyCount([
        word('a', 'hola', 'привет', { due: true }),
        word('b', 'adios', 'пока', { due: true, introduced: false }),
        word('c', 'gracias', 'спасибо', { due: false }),
        word('d', ' ', 'пусто', { due: true }),
      ]),
    ).toBe(1);
  });

  it('builds each learn task, including the reverse of the session direction', () => {
    const unit = POOL[0]!;
    const select = planLearnStep(unit, POOL, settings(), 'select', 's', 0);
    expect(select.type).toBe('select_translation');
    if (select.type === 'select_translation') expect(select.options).toHaveLength(4);

    const typed = planLearnStep(unit, POOL, settings({ direction: 'ru_to_es' }), 'type', 't', 0);
    expect(typed).toMatchObject({
      type: 'type_translation',
      direction: 'ru_to_es',
      answer: 'adiós',
    });

    const reverse = planLearnStep(unit, POOL, settings(), 'type_reverse', 'r', 0);
    expect(reverse).toMatchObject({
      type: 'type_translation',
      direction: 'ru_to_es',
      prompt: 'пока',
      answer: 'adiós',
    });

    const spoken = planLearnStep(
      unit,
      POOL,
      settings({ accentStrictness: 'strict' }),
      'speak',
      'v',
      1,
    );
    expect(spoken).toMatchObject({ type: 'speak_repeat', id: 'v', promptEs: 'adiós' });
  });

  it('falls back to typing when the folder has no other choice', () => {
    const steps = sessionPlan('blitz', [POOL[0]!], settings());
    expect(steps).toHaveLength(1);
    expect(steps[0]?.type).toBe('type_translation');
    const learn = sessionPlan('learn', [POOL[0]!], settings());
    expect(learn).toHaveLength(1);
    expect(learn[0]?.type).toBe('type_translation');
  });

  it('puts the translation on the left when a learn board is recall', () => {
    const six = Array.from({ length: 6 }, (_, index) =>
      word(`m${index}`, `es${index} phrase`, `tr${index} phrase`),
    );
    const steps = sessionPlan('learn', six, settings({ count: 20, direction: 'ru_to_es' }));
    const board = steps.find((step) => step.type === 'match_pairs');
    expect(board?.type).toBe('match_pairs');
    if (board?.type === 'match_pairs') {
      expect(board.pairs).toHaveLength(4);
      expect(board.pairs[0]).toMatchObject({ left: 'tr1 phrase', right: 'es1 phrase' });
    }
  });

  it('plans a speak step with the accent pass line', () => {
    const steps = sessionPlan(
      'speak',
      [word('hola', 'hola', 'привет', { recall: true, audio: 'items/hola.mp3' })],
      settings({ accentStrictness: 'strict', autoplay: false }),
    );
    expect(steps[0]).toMatchObject({
      type: 'speak_repeat',
      promptEs: 'hola',
      direction: 'ru_to_es',
      passScore: ACCENT_PASS_SCORE.strict,
      autoplay: false,
      audio: 'items/hola.mp3',
    });
  });

  it('plans a playable flashcard in the chosen direction', () => {
    const steps = sessionPlan('flashcards', POOL.slice(0, 1), settings({ direction: 'ru_to_es' }));
    expect(steps[0]).toMatchObject({
      type: 'flashcard',
      front: 'пока',
      back: 'adiós',
    });
    expect(isPlayableStudyMode('flashcards')).toBe(true);
    expect(isPlayableStudyMode('test')).toBe(true);
  });
});

describe('study mode order', () => {
  it('keeps Вчити first and treats blitz as two minutes', () => {
    expect(orderedStudyModes()).toEqual(['learn', 'flashcards', 'blitz', 'speak', 'test']);
    expect(estimateStudyMinutes('blitz', 20)).toBe(2);
    expect(estimateStudyMinutes('learn', 0)).toBe(1);
    expect(estimateStudyMinutes('test', 40)).toBe(5);
    expect(estimateStudyMinutes('test', 3)).toBe(2);
    expect(isPlayableStudyMode('learn')).toBe(true);
  });
});

function itemId(step: StudyStep): string | undefined {
  return 'itemId' in step ? step.itemId : undefined;
}

function phraseIds(steps: readonly StudyStep[]): string[] {
  return steps.flatMap((step) =>
    step.type === 'match_pairs' ? [...step.itemIds] : 'itemId' in step ? [step.itemId] : [],
  );
}
