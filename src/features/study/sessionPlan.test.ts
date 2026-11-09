import {
  ACCENT_PASS_SCORE,
  estimateStudyMinutes,
  isPlayableStudyMode,
  orderedStudyModes,
} from './modes';
import { planLearnStep, sessionPlan } from './sessionPlan';
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
    const steps = sessionPlan('review', [stranger, ...POOL], settings({ count: 20 }));
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
    expect(sessionPlan('spell', [blank], settings())).toEqual([]);
  });

  it('filters due, hard, and unlearned units', () => {
    const units = [
      word('a', 'a', 'а', { due: true, state: 2 }),
      word('b', 'b', 'б', { hard: true, state: 1 }),
      word('c', 'c', 'в', { state: 0 }),
      word('d', 'd', 'г', { state: 2 }),
    ];
    expect(sessionPlan('spell', units, settings({ filter: 'due' })).map(itemId)).toEqual(['a']);
    expect(sessionPlan('spell', units, settings({ filter: 'hard' })).map(itemId)).toEqual(['b']);
    expect(sessionPlan('spell', units, settings({ filter: 'unlearned' })).map(itemId)).toEqual([
      'b',
      'c',
    ]);
  });

  it('caps the session at the chosen count, and quick 5 at five', () => {
    expect(sessionPlan('review', POOL, settings({ count: 5 }))).toHaveLength(4);
    const many = Array.from({ length: 8 }, (_, index) =>
      word(`w${index}`, `es${index}`, `tr${index}`),
    );
    expect(sessionPlan('spell', many, settings({ count: 5 }))).toHaveLength(5);
    expect(sessionPlan('quick5', many, settings({ count: 20 }))).toHaveLength(5);
    expect(sessionPlan('quick5', many, settings({ count: 5 }))[0]?.id).toBe('quick5-0');
  });

  it('cycles review through select, listen, and type', () => {
    const steps = sessionPlan('review', POOL.slice(0, 3), settings());
    expect(steps.map((step) => step.type)).toEqual([
      'select_translation',
      'listen_select',
      'type_translation',
    ]);
    const listen = steps[1];
    expect(listen?.type).toBe('listen_select');
    if (listen?.type === 'listen_select') {
      expect(listen.answer).toBe('спасибо');
      expect(listen.options).toContain('спасибо');
      expect(listen.options).toHaveLength(3);
      expect(listen.direction).toBe('es_to_ru');
    }
  });

  it('starts a test with typing, distinct from review', () => {
    const steps = sessionPlan('test', POOL.slice(0, 3), settings());
    expect(steps.map((step) => step.type)).toEqual([
      'type_translation',
      'select_translation',
      'listen_select',
    ]);
    expect(isPlayableStudyMode('test')).toBe(false);
  });

  it('lists one opening learn prompt per phrase', () => {
    const steps = sessionPlan('learn', POOL, settings({ count: 5 }));
    expect(steps.map((step) => step.id)).toEqual(['learn-0', 'learn-1', 'learn-2', 'learn-3']);
    expect(steps.every((step) => step.type === 'select_translation')).toBe(true);
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
    const steps = sessionPlan('review', [POOL[0]!], settings());
    expect(steps).toHaveLength(1);
    expect(steps[0]?.type).toBe('type_translation');
    const learn = sessionPlan('learn', [POOL[0]!], settings());
    expect(learn).toHaveLength(1);
    expect(learn[0]?.type).toBe('type_translation');
  });

  it('asks for Spanish when the direction is translation to Spanish', () => {
    const steps = sessionPlan('spell', POOL.slice(0, 1), settings({ direction: 'ru_to_es' }));
    const step = steps[0];
    expect(step?.type).toBe('type_translation');
    if (step?.type === 'type_translation') {
      expect(step.prompt).toBe('пока');
      expect(step.answer).toBe('adiós');
      expect(step.direction).toBe('ru_to_es');
      expect(step.playEs).toBe(true);
    }
  });

  it('turns listening into typing when the direction is recall', () => {
    const steps = sessionPlan('review', POOL.slice(0, 2), settings({ direction: 'ru_to_es' }));
    expect(steps.map((step) => step.type)).toEqual(['select_translation', 'type_translation']);
    const recall = steps[1];
    if (recall?.type === 'type_translation') expect(recall.direction).toBe('ru_to_es');
  });

  it('alternates directions when the setting is mixed', () => {
    const steps = sessionPlan('spell', POOL.slice(0, 3), settings({ direction: 'mixed' }));
    expect(steps.map((step) => (step.type === 'type_translation' ? step.direction : null))).toEqual(
      ['es_to_ru', 'ru_to_es', 'es_to_ru'],
    );
  });

  it('builds match boards and drops a leftover single', () => {
    const six = Array.from({ length: 6 }, (_, index) =>
      word(`m${index}`, `es${index}`, `tr${index}`),
    );
    const boards = sessionPlan('match', six, settings({ count: 20 }));
    expect(boards.map((step) => (step.type === 'match_pairs' ? step.pairs.length : 0))).toEqual([
      4, 2,
    ]);
    const five = six.slice(0, 5);
    const oneBoard = sessionPlan('match', five, settings({ count: 20 }));
    expect(oneBoard).toHaveLength(1);
    expect(oneBoard[0]?.type).toBe('match_pairs');
    if (oneBoard[0]?.type === 'match_pairs') {
      expect(oneBoard[0].pairs).toHaveLength(4);
      expect(oneBoard[0].pairs[0]?.left).toBe('es0');
      expect(oneBoard[0].pairs[0]?.right).toBe('tr0');
    }
    expect(sessionPlan('match', six.slice(0, 1), settings())).toEqual([]);
  });

  it('puts the translation on the left when matching recall', () => {
    const boards = sessionPlan('match', POOL.slice(0, 2), settings({ direction: 'ru_to_es' }));
    const board = boards[0];
    if (board?.type === 'match_pairs') {
      expect(board.pairs[0]).toMatchObject({ left: 'пока', right: 'adiós' });
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
    expect(isPlayableStudyMode('test')).toBe(false);
  });
});

describe('study mode order', () => {
  it('puts the last mode first and estimates a minute at minimum', () => {
    expect(orderedStudyModes(null)[0]).toBe('review');
    expect(orderedStudyModes('speak')[0]).toBe('speak');
    expect(orderedStudyModes('speak')).toHaveLength(8);
    expect(estimateStudyMinutes('learn', 10)).toBe(8);
    expect(estimateStudyMinutes('quick5', 20)).toBe(2);
    expect(estimateStudyMinutes('review', 0)).toBe(1);
  });
});

function itemId(step: StudyStep): string | undefined {
  return 'itemId' in step ? step.itemId : undefined;
}
