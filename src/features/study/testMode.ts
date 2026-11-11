import { gradeAnswer, normalizeForCompare } from '@/features/lesson/grading';
import type { ReviewDirection } from '@/features/review/types';

import { studyDirectionAt, translationChoices } from './sessionPlan';
import {
  MATCH_BOARD_SIZE,
  TEST_KINDS,
  type StudyGrade,
  type StudyUnit,
  type TestKind,
  type TestSettings,
} from './types';

type Side = 'es' | 'tr';

type QuestionBase = {
  id: string;
  phraseEs: string;
  phraseTr: string;
  audio: string | null;
};

export type TestChoiceQuestion = QuestionBase & {
  kind: 'choice';
  itemId: string;
  direction: ReviewDirection;
  prompt: string;
  options: readonly string[];
  answer: string;
};

export type TestInputQuestion = QuestionBase & {
  kind: 'input';
  itemId: string;
  direction: ReviewDirection;
  prompt: string;
  answer: string;
};

export type TestBoolQuestion = QuestionBase & {
  kind: 'true_false';
  itemId: string;
  direction: ReviewDirection;
  /** Phrase the learner judges. */
  prompt: string;
  /** Proposed equivalent. It may be a distractor. */
  claim: string;
  answer: boolean;
  /** Real equivalent, shown after the test when the judgment was wrong. */
  truth: string;
};

export type TestPairLink = {
  itemId: string;
  left: string;
  right: string;
  es: string;
  tr: string;
  audio: string | null;
};

export type TestPairsQuestion = QuestionBase & {
  kind: 'pairs';
  direction: ReviewDirection;
  links: readonly TestPairLink[];
};

export type TestQuestion =
  TestChoiceQuestion | TestInputQuestion | TestBoolQuestion | TestPairsQuestion;

export type TestAnswerValue =
  | { kind: 'text'; value: string }
  | { kind: 'bool'; value: boolean | null }
  | { kind: 'pairs'; matched: Readonly<Record<string, string>> };

export type TestAnswers = Readonly<Record<string, TestAnswerValue>>;

export type TestMiss = {
  key: string;
  kind: 'text' | 'bool' | 'pair';
  itemId: string;
  audio: string | null;
  phraseEs: string;
  caption: string;
  /** Raw text, or `true` / `false` / empty for a true/false row. */
  yours: string;
  correct: string;
  truth: string | null;
};

export type TestItemGrade = {
  itemId: string;
  direction: ReviewDirection;
  grade: StudyGrade;
  clientId: string;
};

export type TestResult = {
  correct: number;
  total: number;
  percent: number;
  misses: readonly TestMiss[];
  grades: readonly TestItemGrade[];
  missedItemIds: readonly string[];
};

const GRADE_RANK: Record<StudyGrade, number> = {
  correct_first: 0,
  correct_after_error: 1,
  incorrect: 2,
};

/** Canonical kind order. Drops duplicates and unknown values. */
export function selectedTestKinds(kinds: readonly TestKind[]): TestKind[] {
  const wanted = new Set(kinds);
  return TEST_KINDS.filter((kind) => wanted.has(kind));
}

/** Turns a kind on or off. The last remaining kind stays on. */
export function withTestKind(settings: TestSettings, kind: TestKind): TestSettings {
  const selected = new Set(settings.kinds);
  if (selected.has(kind)) {
    if (selected.size <= 1) return settings;
    selected.delete(kind);
  } else {
    selected.add(kind);
  }
  return { ...settings, kinds: selectedTestKinds([...selected]) };
}

/**
 * Up to `settings.count` questions from introduced phrases.
 * Kinds rotate. A pairs board takes the next two to four phrases and each
 * phrase joins at most one board. Single questions cycle the pool so a short
 * folder can still fill 10, 20, or 30. A choice with no distractor becomes typing.
 * Odd true/false questions are false when another phrase can stand in.
 */
export function planTest(units: readonly StudyUnit[], settings: TestSettings): TestQuestion[] {
  const pool = studyPool(units);
  const kinds = selectedTestKinds(settings.kinds);
  if (pool.length === 0 || kinds.length === 0) return [];

  const singles = kinds.filter((kind) => kind !== 'pairs');
  const questions: TestQuestion[] = [];
  let unitCursor = 0;
  let pairCursor = 0;

  while (questions.length < settings.count) {
    const kind = kinds[questions.length % kinds.length] ?? 'choice';
    if (kind === 'pairs') {
      const board = nextBoard(pool, pairCursor);
      if (!board) {
        const fallback = singles[0];
        if (!fallback) break;
        questions.push(
          makeSingle(fallback, pool[unitCursor % pool.length]!, pool, questions.length, settings),
        );
        unitCursor += 1;
        continue;
      }
      pairCursor += board.length;
      questions.push(makePairs(board, questions.length, settings));
      continue;
    }
    questions.push(
      makeSingle(kind, pool[unitCursor % pool.length]!, pool, questions.length, settings),
    );
    unitCursor += 1;
  }

  return questions;
}

/**
 * One pass over the missed phrases, in the same kinds.
 * The paper is not refilled up to 10, 20, or 30.
 */
export function planMistakeTest(
  units: readonly StudyUnit[],
  settings: TestSettings,
): TestQuestion[] {
  const pool = studyPool(units);
  const kinds = selectedTestKinds(settings.kinds);
  if (pool.length === 0 || kinds.length === 0) return [];

  const singles = kinds.filter((kind) => kind !== 'pairs');
  const questions: TestQuestion[] = [];
  let cursor = 0;
  let turn = 0;

  while (cursor < pool.length) {
    const kind = kinds[turn % kinds.length] ?? 'choice';
    turn += 1;
    if (kind === 'pairs') {
      const board = nextBoard(pool, cursor);
      if (!board) {
        const fallback = singles[0];
        if (!fallback) break;
        questions.push(makeSingle(fallback, pool[cursor]!, pool, questions.length, settings));
        cursor += 1;
        continue;
      }
      questions.push(makePairs(board, questions.length, settings));
      cursor += board.length;
      continue;
    }
    questions.push(makeSingle(kind, pool[cursor]!, pool, questions.length, settings));
    cursor += 1;
  }

  return questions;
}

/** Phrases from `missedItemIds`, in the original folder order. */
export function testUnitsForMistakes(
  units: readonly StudyUnit[],
  missedItemIds: readonly string[],
): StudyUnit[] {
  const wanted = new Set(missedItemIds);
  const seen = new Set<string>();
  const picked: StudyUnit[] = [];
  for (const unit of units) {
    if (!wanted.has(unit.id) || seen.has(unit.id)) continue;
    seen.add(unit.id);
    picked.push(unit);
  }
  return picked;
}

/**
 * Scores the whole paper at once.
 * An exact answer is one point and Good. A near miss is not a point, stays in
 * the mistake list, and is Hard. A blank or a wrong answer is Again.
 * The same phrase keeps the weaker grade when it is asked more than once.
 */
export function gradeTest(
  questions: readonly TestQuestion[],
  answers: TestAnswers,
  round = 1,
): TestResult {
  const misses: TestMiss[] = [];
  const byItem = new Map<string, Omit<TestItemGrade, 'clientId'>>();
  let correct = 0;

  for (const question of questions) {
    const scored = scoreQuestion(question, answers[question.id]);
    if (scored.passed) correct += 1;
    misses.push(...scored.misses);
    for (const item of scored.items) {
      const key = `${item.itemId}:${item.direction}`;
      const previous = byItem.get(key);
      if (!previous || GRADE_RANK[item.grade] > GRADE_RANK[previous.grade]) byItem.set(key, item);
    }
  }

  const total = questions.length;
  const grades = [...byItem.values()].map((item) => ({
    ...item,
    clientId: `${round}:${item.itemId}:${item.direction}`,
  }));
  return {
    correct,
    total,
    percent: total === 0 ? 0 : Math.round((correct / total) * 100),
    misses,
    grades,
    missedItemIds: uniqueIds(misses.map((miss) => miss.itemId)),
  };
}

/** Stable shuffle so a pairs board does not jump on re-render. */
export function orderBySeed<T>(items: readonly T[], seed: string): T[] {
  return items
    .map((item, index) => ({ item, index, rank: mix(`${seed}:${index}`) }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map((entry) => entry.item);
}

type Scored = {
  passed: boolean;
  misses: TestMiss[];
  items: Omit<TestItemGrade, 'clientId'>[];
};

function scoreQuestion(question: TestQuestion, answer: TestAnswerValue | undefined): Scored {
  if (question.kind === 'pairs') return scorePairs(question, answer);
  if (question.kind === 'true_false') return scoreBool(question, answer);
  return scoreText(question, answer);
}

function scoreText(
  question: TestChoiceQuestion | TestInputQuestion,
  answer: TestAnswerValue | undefined,
): Scored {
  const value = answer?.kind === 'text' ? answer.value : '';
  const graded = gradeAnswer({ userAnswer: value, answer: question.answer });
  const grade: StudyGrade =
    graded.status === 'correct'
      ? 'correct_first'
      : graded.status === 'almost'
        ? 'correct_after_error'
        : 'incorrect';
  const passed = graded.status === 'correct';
  return {
    passed,
    misses: passed
      ? []
      : [
          {
            key: question.id,
            kind: 'text',
            itemId: question.itemId,
            audio: question.audio,
            phraseEs: question.phraseEs,
            caption: question.prompt,
            yours: value.trim(),
            correct: question.answer,
            truth: null,
          },
        ],
    items: [{ itemId: question.itemId, direction: question.direction, grade }],
  };
}

function scoreBool(question: TestBoolQuestion, answer: TestAnswerValue | undefined): Scored {
  const picked = answer?.kind === 'bool' ? answer.value : null;
  const passed = picked === question.answer;
  return {
    passed,
    misses: passed
      ? []
      : [
          {
            key: question.id,
            kind: 'bool',
            itemId: question.itemId,
            audio: question.audio,
            phraseEs: question.phraseEs,
            caption: `${question.prompt} — ${question.claim}`,
            yours: picked == null ? '' : picked ? 'true' : 'false',
            correct: question.answer ? 'true' : 'false',
            truth: question.truth,
          },
        ],
    items: [
      {
        itemId: question.itemId,
        direction: question.direction,
        grade: passed ? 'correct_first' : 'incorrect',
      },
    ],
  };
}

function scorePairs(question: TestPairsQuestion, answer: TestAnswerValue | undefined): Scored {
  const matched = answer?.kind === 'pairs' ? answer.matched : {};
  const misses: TestMiss[] = [];
  const items: Scored['items'] = [];
  for (const link of question.links) {
    const yours = matched[link.itemId] ?? '';
    const ok =
      yours.trim().length > 0 && normalizeForCompare(yours) === normalizeForCompare(link.right);
    if (!ok) {
      misses.push({
        key: `${question.id}:${link.itemId}`,
        kind: 'pair',
        itemId: link.itemId,
        audio: link.audio,
        phraseEs: link.es,
        caption: link.left,
        yours: yours.trim(),
        correct: link.right,
        truth: null,
      });
    }
    items.push({
      itemId: link.itemId,
      direction: question.direction,
      grade: ok ? 'correct_first' : 'incorrect',
    });
  }
  return { passed: misses.length === 0 && question.links.length > 0, misses, items };
}

function makeSingle(
  kind: Exclude<TestKind, 'pairs'>,
  unit: StudyUnit,
  pool: readonly StudyUnit[],
  index: number,
  settings: TestSettings,
): TestQuestion {
  if (kind === 'true_false') return makeBool(unit, pool, index, settings);
  if (kind === 'input') return makeInput(unit, index, settings);
  return makeChoice(unit, pool, index, settings);
}

function makeChoice(
  unit: StudyUnit,
  pool: readonly StudyUnit[],
  index: number,
  settings: TestSettings,
): TestQuestion {
  const direction = studyDirectionAt(settings.direction, index);
  const side: Side = direction === 'es_to_ru' ? 'tr' : 'es';
  const answer = unit[side];
  const options = translationChoices(pool, answer, side, index, `${unit.id}:test:${index}`);
  if (options.length < 2) return makeInput(unit, index, settings);
  return {
    ...phrase(unit, index),
    kind: 'choice',
    itemId: unit.id,
    direction,
    prompt: direction === 'es_to_ru' ? unit.es : unit.tr,
    options,
    answer,
  };
}

function makeInput(unit: StudyUnit, index: number, settings: TestSettings): TestInputQuestion {
  const direction = studyDirectionAt(settings.direction, index);
  return {
    ...phrase(unit, index),
    kind: 'input',
    itemId: unit.id,
    direction,
    prompt: direction === 'es_to_ru' ? unit.es : unit.tr,
    answer: direction === 'es_to_ru' ? unit.tr : unit.es,
  };
}

function makeBool(
  unit: StudyUnit,
  pool: readonly StudyUnit[],
  index: number,
  settings: TestSettings,
): TestBoolQuestion {
  const direction = studyDirectionAt(settings.direction, index);
  const side: Side = direction === 'es_to_ru' ? 'tr' : 'es';
  const prompt = direction === 'es_to_ru' ? unit.es : unit.tr;
  const truth = unit[side];
  const claim = index % 2 === 1 ? falseClaim(pool, truth, side, index) : null;
  return {
    ...phrase(unit, index),
    kind: 'true_false',
    itemId: unit.id,
    direction,
    prompt,
    claim: claim ?? truth,
    answer: claim == null,
    truth,
  };
}

function makePairs(
  board: readonly StudyUnit[],
  index: number,
  settings: TestSettings,
): TestPairsQuestion {
  const spanishOnLeft = settings.direction !== 'ru_to_es';
  return {
    id: `test-${index}`,
    kind: 'pairs',
    direction: spanishOnLeft ? 'es_to_ru' : 'ru_to_es',
    phraseEs: board.map((unit) => unit.es).join('. '),
    phraseTr: board.map((unit) => unit.tr).join('. '),
    audio: board.find((unit) => unit.audio)?.audio ?? null,
    links: board.map((unit) => ({
      itemId: unit.id,
      es: unit.es,
      tr: unit.tr,
      audio: unit.audio,
      left: spanishOnLeft ? unit.es : unit.tr,
      right: spanishOnLeft ? unit.tr : unit.es,
    })),
  };
}

function falseClaim(
  pool: readonly StudyUnit[],
  truth: string,
  side: Side,
  index: number,
): string | null {
  const options = translationChoices(pool, truth, side, index, `test-bool:${index}`);
  const truthKey = normalizeForCompare(truth);
  return options.find((option) => normalizeForCompare(option) !== truthKey) ?? null;
}

function nextBoard(pool: readonly StudyUnit[], cursor: number): StudyUnit[] | null {
  const remaining = pool.length - cursor;
  if (remaining < 2) return null;
  return pool.slice(cursor, cursor + Math.min(MATCH_BOARD_SIZE, remaining));
}

function phrase(unit: StudyUnit, index: number): QuestionBase {
  return {
    id: `test-${index}`,
    phraseEs: unit.es,
    phraseTr: unit.tr,
    audio: unit.audio,
  };
}

function studyPool(units: readonly StudyUnit[]): StudyUnit[] {
  const seen = new Set<string>();
  const pool: StudyUnit[] = [];
  for (const unit of units) {
    const id = unit.id.trim();
    if (!id || seen.has(id) || !unit.introduced) continue;
    if (!unit.es.trim() || !unit.tr.trim()) continue;
    seen.add(id);
    pool.push(unit);
  }
  return pool;
}

function uniqueIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function mix(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
