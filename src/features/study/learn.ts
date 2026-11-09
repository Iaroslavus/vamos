import type { StudyGrade } from './types';

/** Units practiced together before the break screen. */
export const LEARN_PORTION = 7;

/** A correct answer counts toward "learned" only from this level up. */
export const LEARN_FIRM_AT = 2;

/** Firm points required before a unit leaves the portion. */
export const LEARN_FIRM_NEED = 2;

export type LearnTask = 'select' | 'type' | 'speak' | 'type_reverse';

export type LearnCard = {
  id: string;
  level: number;
  /** Correct answers given while the level was already {@link LEARN_FIRM_AT} or higher. */
  firm: number;
  misses: number;
  learned: boolean;
};

export type LearnPhase = 'quiz' | 'break' | 'done';

export type LearnState = {
  phase: LearnPhase;
  /** Ids that have not entered a portion yet. */
  waiting: readonly string[];
  /** Ids in the open portion, including ones already learned. */
  portion: readonly string[];
  cards: Readonly<Record<string, LearnCard>>;
  /** Front of the queue is the current prompt. Empty on a break and at the end. */
  queue: readonly string[];
};

export type LearnOutcome = {
  id: string;
  misses: number;
};

export type LearnAnswer = {
  state: LearnState;
  /** Set when this answer is the one that learned the unit. */
  learned: LearnOutcome | null;
};

/**
 * Level queue for «Заучивание».
 * Level 0 is a 4-way choice, level 1 is typing, and level 2 or higher is
 * speaking — or typing in the opposite direction when the microphone is off.
 * Correct raises the level by 1 and, if the unit is not learned yet, sends it
 * to the back of the queue. A miss lowers the level by 1 (never below 0) and
 * brings the unit back after 2 or 3 other steps.
 * Firm points are not cleared by a miss. The unit is learned after two correct
 * answers given at level 2 or higher.
 */
export function createLearnSession(ids: readonly string[]): LearnState {
  const waiting: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    waiting.push(id);
  }
  return openPortion({
    phase: 'quiz',
    waiting,
    portion: [],
    cards: {},
    queue: [],
  });
}

export function learnTask(level: number, mic: boolean): LearnTask {
  if (level <= 0) return 'select';
  if (level === 1) return 'type';
  return mic ? 'speak' : 'type_reverse';
}

/** 2 when `rng` is below 0.5, otherwise 3. */
export function learnReturnGap(rng: () => number): 2 | 3 {
  return rng() < 0.5 ? 2 : 3;
}

/**
 * V1 study grades.
 * A unit learned with no misses is a first-try pass (Good).
 * A unit learned after at least one miss is a pass after an error (Hard).
 * The portion does not finish a unit as a miss, so it does not write Again.
 */
export function learnStudyGrade(misses: number): StudyGrade {
  return misses > 0 ? 'correct_after_error' : 'correct_first';
}

export function learnProgress(state: LearnState): { learned: number; total: number } {
  let learned = 0;
  for (const id of state.portion) {
    if (state.cards[id]?.learned) learned += 1;
  }
  return { learned, total: state.portion.length };
}

export function sessionTally(state: LearnState): {
  learned: number;
  total: number;
  misses: number;
} {
  let learned = 0;
  let misses = 0;
  for (const card of Object.values(state.cards)) {
    if (card.learned) learned += 1;
    misses += card.misses;
  }
  return {
    learned,
    total: Object.keys(state.cards).length + state.waiting.length,
    misses,
  };
}

export function answerLearn(
  state: LearnState,
  correct: boolean,
  rng: () => number = Math.random,
): LearnAnswer {
  if (state.phase !== 'quiz' || state.queue.length === 0) {
    return { state, learned: null };
  }
  const id = state.queue[0];
  const card = id ? state.cards[id] : undefined;
  if (!id || !card || card.learned) return { state, learned: null };

  const nextCard = applyOutcome(card, correct);
  const rest = state.queue.slice(1);
  const queue = nextCard.learned
    ? rest
    : correct
      ? [...rest, id]
      : insertAfter(rest, id, learnReturnGap(rng));

  return {
    state: finishPrompt({ ...state, cards: { ...state.cards, [id]: nextCard } }, queue),
    learned: nextCard.learned ? { id, misses: nextCard.misses } : null,
  };
}

/** Opens the next portion. No effect unless the session is on the break screen. */
export function continueLearn(state: LearnState): LearnState {
  if (state.phase !== 'break') return state;
  return openPortion(state);
}

function applyOutcome(card: LearnCard, correct: boolean): LearnCard {
  if (!correct) {
    return {
      ...card,
      level: Math.max(0, card.level - 1),
      misses: card.misses + 1,
    };
  }
  const firm = card.level >= LEARN_FIRM_AT ? card.firm + 1 : card.firm;
  return {
    ...card,
    level: card.level + 1,
    firm,
    learned: firm >= LEARN_FIRM_NEED,
  };
}

function openPortion(state: LearnState): LearnState {
  if (state.waiting.length === 0) {
    return { ...state, phase: 'done', queue: [], portion: [] };
  }
  const portion = state.waiting.slice(0, LEARN_PORTION);
  const cards = { ...state.cards };
  for (const id of portion) {
    cards[id] = { id, level: 0, firm: 0, misses: 0, learned: false };
  }
  return {
    ...state,
    phase: 'quiz',
    waiting: state.waiting.slice(LEARN_PORTION),
    portion,
    cards,
    queue: portion,
  };
}

function finishPrompt(state: LearnState, queue: readonly string[]): LearnState {
  if (queue.length > 0) return { ...state, phase: 'quiz', queue };
  if (state.waiting.length > 0) return { ...state, phase: 'break', queue };
  return { ...state, phase: 'done', queue };
}

function insertAfter(queue: readonly string[], id: string, gap: number): string[] {
  const next = [...queue];
  next.splice(Math.min(Math.max(0, gap), next.length), 0, id);
  return next;
}
