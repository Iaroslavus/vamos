import { normalizeForCompare } from '@/features/lesson/grading';

import type { ReviewRating } from './fsrs';
import { REVIEW_DIRECTIONS, type RatingInput, type ReviewDirection } from './types';

export type VocabularyRef = {
  id: string;
  es: string;
  ru: string;
};

/** The parts of an exercise that name the word it practices. */
export type ExerciseReference = {
  type: string;
  prompt?: string;
  answer: string;
  direction?: ReviewDirection;
  pairs?: readonly { left: string; right: string }[];
};

export type PracticedItem = {
  itemId: string;
  direction: ReviewDirection;
};

type SurfaceHit = {
  itemId: string;
  side: 'es' | 'ru';
};

const PRODUCTION_TYPES = new Set(['build_sentence', 'fill_gap']);

export function isDirection(value: unknown): value is ReviewDirection {
  return (REVIEW_DIRECTIONS as readonly unknown[]).includes(value);
}

export function cardKey(itemId: string, direction: ReviewDirection): string {
  return `${itemId}:${direction}`;
}

/** Again is a miss. Hard, Good, and Easy still count as remembering the card. */
export function isSuccessfulRating(rating: ReviewRating): boolean {
  return rating !== 'again';
}

/**
 * Open the deck for a finished lesson.
 * Failed sessions and lessons with nothing new do not create cards.
 */
export async function introduceCompletedLesson<T>(
  repository: { introduceItems(userId: string, items: readonly { id: string }[]): Promise<T> },
  userId: string,
  summary: { status: string; newItems: readonly { id: string }[] },
): Promise<T | null> {
  if (summary.status !== 'completed' || summary.newItems.length === 0) return null;
  return repository.introduceItems(userId, summary.newItems);
}

/**
 * A wrong answer on a known word is an Again.
 * Correct and almost-correct answers are not reviews, and a word with no card is left alone.
 */
export async function recordKnownWordMistake(
  repository: { recordRating(userId: string, input: RatingInput): Promise<unknown> },
  userId: string,
  status: string,
  exercise: ExerciseReference,
  lexicon: readonly VocabularyRef[],
): Promise<void> {
  if (status !== 'wrong') return;

  for (const target of itemsPracticed(exercise, lexicon)) {
    await repository.recordRating(userId, {
      itemId: target.itemId,
      direction: target.direction,
      rating: 'again',
      createIfMissing: false,
    });
  }
}

/**
 * Which known-vocabulary directions this exercise is about.
 * Matching is the whole Spanish or Russian form, so a sentence that merely
 * contains a word does not schedule that word.
 */
export function itemsPracticed(
  exercise: ExerciseReference,
  lexicon: readonly VocabularyRef[],
): PracticedItem[] {
  const index = indexLexicon(lexicon);
  const chosen = new Map<string, ReviewDirection>();

  if (exercise.type === 'match_pairs') {
    for (const pair of exercise.pairs ?? []) {
      rememberPair(chosen, hitsFor(index, pair.left), hitsFor(index, pair.right));
    }
    return inLexiconOrder(lexicon, chosen);
  }

  const promptHits = hitsFor(index, exercise.prompt);
  const answerHits = hitsFor(index, exercise.answer);
  rememberBothSides(chosen, exercise, promptHits, answerHits);

  if (chosen.size === 0) {
    const itemId = onlyItem(promptHits, answerHits);
    if (itemId) {
      chosen.set(itemId, directionForSingle(exercise, promptHits, answerHits));
    }
  }

  return inLexiconOrder(lexicon, chosen);
}

function rememberPair(
  chosen: Map<string, ReviewDirection>,
  leftHits: readonly SurfaceHit[],
  rightHits: readonly SurfaceHit[],
): void {
  for (const left of leftHits) {
    const right = rightHits.find((hit) => hit.itemId === left.itemId && hit.side !== left.side);
    if (!right || chosen.has(left.itemId)) continue;
    chosen.set(left.itemId, left.side === 'es' ? 'es_to_ru' : 'ru_to_es');
  }
}

function rememberBothSides(
  chosen: Map<string, ReviewDirection>,
  exercise: ExerciseReference,
  promptHits: readonly SurfaceHit[],
  answerHits: readonly SurfaceHit[],
): void {
  for (const promptHit of promptHits) {
    const answerHit = answerHits.find(
      (hit) => hit.itemId === promptHit.itemId && hit.side !== promptHit.side,
    );
    if (!answerHit || chosen.has(promptHit.itemId)) continue;
    const direction = exercise.direction ?? (promptHit.side === 'es' ? 'es_to_ru' : 'ru_to_es');
    chosen.set(promptHit.itemId, direction);
  }
}

function directionForSingle(
  exercise: ExerciseReference,
  promptHits: readonly SurfaceHit[],
  answerHits: readonly SurfaceHit[],
): ReviewDirection {
  if (exercise.direction) return exercise.direction;
  if (exercise.type === 'listen_select') return 'es_to_ru';
  if (PRODUCTION_TYPES.has(exercise.type)) return 'ru_to_es';
  if (promptHits[0]?.side === 'ru' || answerHits[0]?.side === 'es') return 'ru_to_es';
  return 'es_to_ru';
}

function onlyItem(
  promptHits: readonly SurfaceHit[],
  answerHits: readonly SurfaceHit[],
): string | null {
  const ids = new Set([...promptHits, ...answerHits].map((hit) => hit.itemId));
  if (ids.size !== 1) return null;
  const [itemId] = ids;
  return itemId ?? null;
}

function inLexiconOrder(
  lexicon: readonly VocabularyRef[],
  chosen: ReadonlyMap<string, ReviewDirection>,
): PracticedItem[] {
  const items: PracticedItem[] = [];
  for (const entry of lexicon) {
    const direction = chosen.get(entry.id);
    if (!direction) continue;
    items.push({ itemId: entry.id, direction });
  }
  return items;
}

function indexLexicon(lexicon: readonly VocabularyRef[]): Map<string, SurfaceHit[]> {
  const index = new Map<string, SurfaceHit[]>();
  for (const item of lexicon) {
    pushHit(index, item.es, { itemId: item.id, side: 'es' });
    pushHit(index, item.ru, { itemId: item.id, side: 'ru' });
  }
  return index;
}

function pushHit(index: Map<string, SurfaceHit[]>, text: string, hit: SurfaceHit): void {
  const key = normalizeForCompare(text);
  if (!key) return;
  const list = index.get(key);
  if (list) list.push(hit);
  else index.set(key, [hit]);
}

function hitsFor(index: ReadonlyMap<string, SurfaceHit[]>, text: string | undefined): SurfaceHit[] {
  if (!text) return [];
  const key = normalizeForCompare(text);
  if (!key) return [];
  return index.get(key) ?? [];
}
