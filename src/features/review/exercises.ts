import { normalizeForCompare, type GradeStatus } from '@/features/lesson/grading';
import type { LessonExerciseItem } from '@/features/lesson/store';

import type { ReviewRating } from './fsrs';
import type { ReviewDirection } from './types';

/** Exercises in one quick-review session. */
export const QUICK_REVIEW_LIMIT = 10;

const CHOICES = 4;

const TYPE_CYCLE = ['select_translation', 'listen_select', 'type_translation'] as const;
type ReviewExerciseType = (typeof TYPE_CYCLE)[number];

/**
 * How a finished exercise should move its card.
 * A pass is the lesson grade `correct` or `almost` — both solve the exercise.
 */
export type ReviewExerciseResult = 'correct_first' | 'correct_after_error' | 'incorrect';

export type ReviewStudyMode = 'cards' | 'quick';

export type ReviewExerciseSource = {
  itemId: string;
  direction: ReviewDirection;
  es: string;
  ru: string;
  audio?: string;
};

export type ReviewDistractor = {
  id: string;
  es: string;
  ru: string;
};

export type ReviewExercisePrompts = {
  select: string;
  listen: string;
  type: string;
};

export type BuiltReviewExercise = {
  itemId: string;
  direction: ReviewDirection;
  exercise: LessonExerciseItem;
};

/** First-try pass → Good, pass after a miss → Hard, miss → Again. */
export function ratingForExerciseResult(result: ReviewExerciseResult): ReviewRating {
  switch (result) {
    case 'correct_first':
      return 'good';
    case 'correct_after_error':
      return 'hard';
    case 'incorrect':
      return 'again';
  }
}

/**
 * Outcome once the lesson engine has settled the exercise.
 * `settled` is set when the session failed and this exercise never passed.
 * A wrong answer that will be retried is not settled yet.
 */
export function exerciseResult(
  grades: readonly GradeStatus[],
  settled: boolean,
): ReviewExerciseResult | null {
  if (grades.length === 0) return null;
  const passAt = grades.findIndex((grade) => grade === 'correct' || grade === 'almost');
  if (passAt === 0) return 'correct_first';
  if (passAt > 0) return 'correct_after_error';
  if (settled && grades.every((grade) => grade === 'wrong')) return 'incorrect';
  return null;
}

export type AttemptRating = {
  exerciseId: string;
  rating: ReviewRating;
};

/** Ratings to record for the attempt that just finished, skipping ones already saved or queued. */
export function pendingExerciseRatings(input: {
  attempts: ReadonlyMap<string, readonly GradeStatus[]>;
  rated: ReadonlySet<string>;
  queued: ReadonlySet<string>;
  focusId: string;
  sessionFailed: boolean;
}): AttemptRating[] {
  const ids = input.sessionFailed ? [...input.attempts.keys()] : [input.focusId];
  const ratings: AttemptRating[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id) || input.rated.has(id) || input.queued.has(id)) continue;
    seen.add(id);
    const result = exerciseResult(input.attempts.get(id) ?? [], input.sessionFailed);
    if (!result) continue;
    ratings.push({ exerciseId: id, rating: ratingForExerciseResult(result) });
  }

  return ratings;
}

/**
 * Up to {@link QUICK_REVIEW_LIMIT} playable exercises, in queue order.
 * Recognition cards cycle select, listen, and type. Recall cards skip listening,
 * because hearing the Spanish word does not test ru→es.
 * Choice exercises fall back to typing when the course has no other option.
 */
export function buildQuickReviewExercises(input: {
  cards: readonly ReviewExerciseSource[];
  pool: readonly ReviewDistractor[];
  prompts: ReviewExercisePrompts;
  limit?: number;
}): BuiltReviewExercise[] {
  const limit = input.limit ?? QUICK_REVIEW_LIMIT;
  const cards = input.cards.slice(0, Math.max(0, limit));

  return cards.map((card, index) => {
    const type = resolveType(card, index, input.pool);
    return {
      itemId: card.itemId,
      direction: card.direction,
      exercise: toExercise(card, index, type, input.pool, input.prompts),
    };
  });
}

function resolveType(
  card: ReviewExerciseSource,
  index: number,
  pool: readonly ReviewDistractor[],
): ReviewExerciseType {
  const preferred = TYPE_CYCLE[index % TYPE_CYCLE.length] ?? 'type_translation';
  const type =
    preferred === 'listen_select' && card.direction === 'ru_to_es' ? 'type_translation' : preferred;
  if (type === 'type_translation') return type;
  if (distractors(pool, answerOf(card, type), answerSide(card, type), index).length === 0) {
    return 'type_translation';
  }
  return type;
}

function toExercise(
  card: ReviewExerciseSource,
  index: number,
  type: ReviewExerciseType,
  pool: readonly ReviewDistractor[],
  prompts: ReviewExercisePrompts,
): LessonExerciseItem {
  const id = `q${index}`;
  const answer = answerOf(card, type);

  if (type === 'type_translation') {
    return {
      id,
      type,
      prompt_ru: prompts.type,
      prompt: card.direction === 'es_to_ru' ? card.es : card.ru,
      direction: card.direction,
      answer,
    };
  }

  const options = withAnswer(
    answer,
    distractors(pool, answer, answerSide(card, type), index),
    `${card.itemId}:${card.direction}`,
  );

  if (type === 'listen_select') {
    return {
      id,
      type,
      prompt_ru: prompts.listen,
      options,
      answer,
      speakText: card.es,
      ...(card.audio ? { audio: card.audio } : {}),
    };
  }

  return {
    id,
    type: 'select_translation',
    prompt_ru: prompts.select,
    prompt: card.direction === 'es_to_ru' ? card.es : card.ru,
    options,
    answer,
  };
}

function answerOf(card: ReviewExerciseSource, type: ReviewExerciseType): string {
  if (type === 'listen_select' || card.direction === 'es_to_ru') return card.ru;
  return card.es;
}

function answerSide(card: ReviewExerciseSource, type: ReviewExerciseType): 'es' | 'ru' {
  if (type === 'listen_select' || card.direction === 'es_to_ru') return 'ru';
  return 'es';
}

function distractors(
  pool: readonly ReviewDistractor[],
  answer: string,
  side: 'es' | 'ru',
  start: number,
): string[] {
  const answerKey = normalizeForCompare(answer);
  const seen = new Set<string>();
  const texts: string[] = [];

  for (const word of [...pool].sort((left, right) => left.id.localeCompare(right.id))) {
    const text = word[side];
    const key = normalizeForCompare(text);
    if (!key || key === answerKey || seen.has(key)) continue;
    seen.add(key);
    texts.push(text);
  }

  const take = Math.min(CHOICES - 1, texts.length);
  const picked: string[] = [];
  for (let step = 0; step < take; step += 1) {
    picked.push(texts[(start + step) % texts.length]!);
  }
  return picked;
}

function withAnswer(answer: string, extras: readonly string[], seed: string): string[] {
  const options = [...extras];
  options.splice(mix(seed) % (options.length + 1), 0, answer);
  return options;
}

function mix(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
