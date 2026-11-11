import { isGradedStep } from './exercise';
import { flashSummary, type FlashRound } from './flashcards';
import type { TestMiss, TestResult } from './testMode';
import type {
  StudyExerciseStep,
  StudyGrade,
  StudyMatchPair,
  StudyMatchStep,
  StudyStep,
  StudyUnit,
} from './types';

export type SummaryVariant = 'score' | 'cards' | 'speak';

export type SummaryValueKind = 'text' | 'bool';

/** One row under the ring. A pass stays out of the list. */
export type SummaryRow = {
  key: string;
  itemId: string;
  phrase: string;
  phraseEs: string;
  audio: string | null;
  correct: string;
  /** Learner's input, when the step asked for one. */
  yours: string | null;
  valueKind: SummaryValueKind;
  /** Pronunciation score, 0–100. Set on a speak miss. */
  score: number | null;
};

export type SessionSummary = {
  variant: SummaryVariant;
  correct: number;
  wrong: number;
  /** 0–100. Speak uses the average score. */
  percent: number;
  rows: readonly SummaryRow[];
  repeatIds: readonly string[];
};

export type ScoreAttempt = {
  key: string;
  itemId: string;
  phrase: string;
  phraseEs: string;
  audio: string | null;
  correct: string;
  yours: string | null;
  passed: boolean;
  valueKind?: SummaryValueKind;
};

export type SpeakTake = {
  key: string;
  itemId: string;
  phraseEs: string;
  phraseTr: string;
  audio: string | null;
  score: number | null;
  passed: boolean;
};

/** Whole percent. An empty round is 0. */
export function percentOf(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

/** A finished round with no misses. An empty round is not a celebration. */
export function isPerfect(summary: SessionSummary): boolean {
  return summary.correct + summary.wrong > 0 && summary.rows.length === 0;
}

/**
 * Learn, blitz, and test.
 * A first-try pass counts. A miss, including one that was later corrected, does not.
 */
export function summarizeScores(attempts: readonly ScoreAttempt[]): SessionSummary {
  const correct = attempts.filter((attempt) => attempt.passed).length;
  const rows = attempts.filter((attempt) => !attempt.passed).map(rowFromScore);
  return {
    variant: 'score',
    correct,
    wrong: attempts.length - correct,
    percent: percentOf(correct, attempts.length),
    rows,
    repeatIds: uniqueIds(rows.map((row) => row.itemId)),
  };
}

/** Know versus still learning. The list is the still-learning pile, once each. */
export function summarizeCards(round: FlashRound): SessionSummary {
  const stats = flashSummary(round);
  const again = new Set(stats.againIds);
  const seen = new Set<string>();
  const rows: SummaryRow[] = [];
  for (const card of round.cards) {
    if (!again.has(card.itemId) || seen.has(card.itemId)) continue;
    seen.add(card.itemId);
    rows.push({
      key: card.id,
      itemId: card.itemId,
      phrase: card.front,
      phraseEs: card.phraseEs,
      audio: card.audio,
      correct: card.back,
      yours: null,
      valueKind: 'text',
      score: null,
    });
  }
  return {
    variant: 'cards',
    correct: stats.know,
    wrong: stats.again,
    percent: percentOf(stats.know, stats.know + stats.again),
    rows,
    repeatIds: stats.againIds,
  };
}

/**
 * The ring is the average score of takes that have one.
 * Misses are the takes that did not pass, lowest score first.
 * A pass is not listed, even when the score is not perfect.
 */
export function summarizeSpeak(takes: readonly SpeakTake[]): SessionSummary {
  const scored = takes.map((take) => take.score).filter((score): score is number => score != null);
  const allPassed = takes.length > 0 && takes.every((take) => take.passed);
  const percent =
    scored.length > 0
      ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)
      : allPassed
        ? 100
        : 0;
  const rows = takes
    .filter((take) => !take.passed)
    .map(rowFromSpeak)
    .sort((left, right) => (left.score ?? -1) - (right.score ?? -1));
  return {
    variant: 'speak',
    correct: takes.filter((take) => take.passed).length,
    wrong: rows.length,
    percent,
    rows,
    repeatIds: uniqueIds(rows.map((row) => row.itemId)),
  };
}

/** Test paper, already scored. Near misses stay in the list. */
export function summaryFromTest(result: TestResult): SessionSummary {
  return {
    variant: 'score',
    correct: result.correct,
    wrong: Math.max(0, result.total - result.correct),
    percent: result.percent,
    rows: result.misses.map(rowFromTestMiss),
    repeatIds: result.missedItemIds,
  };
}

/**
 * Steps whose phrase is in `itemIds`, in the same order and the same mode.
 * A pairs board keeps only the missed phrases. One leftover becomes typing.
 */
export function studyStepsForRepeat(
  steps: readonly StudyStep[],
  itemIds: readonly string[],
): StudyStep[] {
  const wanted = new Set(itemIds);
  const next: StudyStep[] = [];
  for (const step of steps) {
    if (step.type !== 'match_pairs') {
      if (stepItemIds(step).some((id) => wanted.has(id))) next.push(step);
      continue;
    }
    const pairs = step.pairs.filter((pair) => wanted.has(pair.itemId));
    if (pairs.length >= 2) {
      next.push({ ...step, pairs, itemIds: pairs.map((pair) => pair.itemId) });
      continue;
    }
    const alone = pairs[0];
    if (alone) next.push(typeFromPair(step, alone));
  }
  return next;
}

export function stepItemIds(step: StudyStep): readonly string[] {
  if (step.type === 'match_pairs') return step.itemIds;
  return [step.itemId];
}

export function attemptsFromMatch(
  step: StudyMatchStep,
  wrongKeys: readonly string[],
  mistakes: number,
): ScoreAttempt[] {
  const wrong = new Set(wrongKeys);
  const unknown = mistakes > 0 && wrongKeys.length === 0;
  return step.pairs.map((pair) => ({
    key: `${step.id}:${pair.itemId}`,
    itemId: pair.itemId,
    phrase: pair.es,
    phraseEs: pair.es,
    audio: null,
    correct: pair.tr,
    yours: null,
    passed: !unknown && !wrong.has(pair.left),
    valueKind: 'text',
  }));
}

/** One row per phrase on a pairs board. A phrase that was mismatched is a miss. */
export function attemptsFromUnits(
  units: readonly StudyUnit[],
  missedIds: readonly string[],
  keyPrefix: string,
): ScoreAttempt[] {
  const missed = new Set(missedIds);
  return units.map((unit) => ({
    key: `${keyPrefix}:${unit.id}`,
    itemId: unit.id,
    phrase: unit.es,
    phraseEs: unit.es,
    audio: unit.audio,
    correct: unit.tr,
    yours: null,
    passed: !missed.has(unit.id),
    valueKind: 'text',
  }));
}

export function attemptFromDictation(
  unit: StudyUnit,
  grade: StudyGrade,
  yours: string,
): ScoreAttempt {
  const answer = yours.trim();
  return {
    key: `dictation:${unit.id}`,
    itemId: unit.id,
    phrase: unit.tr,
    phraseEs: unit.es,
    audio: unit.audio,
    correct: unit.es,
    yours: answer.length > 0 ? answer : null,
    passed: grade === 'correct_first',
    valueKind: 'text',
  };
}

type Recorded = { kind: 'record'; grade: StudyGrade } | { kind: 'next' };

/** What a finished study step contributes to the summary. */
export function attemptsForStep(
  step: StudyStep,
  action: Recorded,
  yours: string,
  wrongKeys: readonly string[],
  mistakes: number,
): ScoreAttempt[] {
  if (action.kind === 'next' && step.type === 'match_pairs') {
    return attemptsFromMatch(step, wrongKeys, mistakes);
  }
  if (action.kind !== 'record') return [];
  if (isGradedStep(step)) return [attemptFromExercise(step, action.grade, yours)];
  if (step.type === 'speak_repeat') {
    return [
      {
        key: step.id,
        itemId: step.itemId,
        phrase: step.promptEs,
        phraseEs: step.promptEs,
        audio: step.audio,
        correct: step.phraseTr,
        yours: null,
        passed: action.grade === 'correct_first',
        valueKind: 'text',
      },
    ];
  }
  return [];
}

function attemptFromExercise(
  step: Extract<StudyStep, { type: 'select_translation' | 'listen_select' | 'type_translation' }>,
  grade: StudyGrade,
  yours: string,
): ScoreAttempt {
  const answer = yours.trim();
  return {
    key: step.id,
    itemId: step.itemId,
    phrase: step.prompt,
    phraseEs: step.phraseEs,
    audio: step.audio,
    correct: step.answer,
    yours: answer.length > 0 ? answer : null,
    passed: grade === 'correct_first',
    valueKind: 'text',
  };
}

function rowFromScore(attempt: ScoreAttempt): SummaryRow {
  return {
    key: attempt.key,
    itemId: attempt.itemId,
    phrase: attempt.phrase,
    phraseEs: attempt.phraseEs,
    audio: attempt.audio,
    correct: attempt.correct,
    yours: attempt.yours,
    valueKind: attempt.valueKind ?? 'text',
    score: null,
  };
}

function rowFromSpeak(take: SpeakTake): SummaryRow {
  return {
    key: take.key,
    itemId: take.itemId,
    phrase: take.phraseEs,
    phraseEs: take.phraseEs,
    audio: take.audio,
    correct: take.phraseTr,
    yours: null,
    valueKind: 'text',
    score: take.score,
  };
}

function rowFromTestMiss(miss: TestMiss): SummaryRow {
  const yours = miss.yours.trim();
  return {
    key: miss.key,
    itemId: miss.itemId,
    phrase: miss.caption,
    phraseEs: miss.phraseEs,
    audio: miss.audio,
    correct: miss.correct,
    yours: yours.length > 0 ? yours : null,
    valueKind: miss.kind === 'bool' ? 'bool' : 'text',
    score: null,
  };
}

function typeFromPair(step: StudyMatchStep, pair: StudyMatchPair): StudyExerciseStep {
  return {
    id: `${step.id}:${pair.itemId}`,
    type: 'type_translation',
    autoplay: step.autoplay,
    itemId: pair.itemId,
    direction: 'es_to_ru',
    promptKey: 'typeEs',
    prompt: pair.es,
    options: [],
    answer: pair.tr,
    phraseEs: pair.es,
    phraseTr: pair.tr,
    audio: null,
    playEs: false,
  };
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
