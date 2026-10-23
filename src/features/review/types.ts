import type { ReviewRating } from './fsrs';

/** es→ru is recognition. ru→es is recall and stays closed until recognition succeeds. */
export const REVIEW_DIRECTIONS = ['es_to_ru', 'ru_to_es'] as const;
export type ReviewDirection = (typeof REVIEW_DIRECTIONS)[number];

export type StoredCard = {
  id: string;
  itemId: string;
  direction: ReviewDirection;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | null;
};

/** A review log row. `state` is the card state before the rating (ts-fsrs ReviewLog). */
export type ReviewLog = {
  clientId: string;
  cardId: string;
  rating: ReviewRating;
  reviewedAt: string;
  elapsedDays: number;
  scheduledDays: number;
  state: number;
};

export type LocalReviewLog = ReviewLog & {
  itemId: string;
  direction: ReviewDirection;
  /** Card as it stood after this rating. Present for reviews recorded on this device. */
  card?: StoredCard;
};

export type OutboxItem = {
  /** `review` syncs a rating. `card` syncs a card that has not been rated yet. */
  kind: 'review' | 'card';
  key: string;
  attempts: number;
};

export type PersistedReviews = {
  version: 1;
  cards: Record<string, StoredCard>;
  logs: LocalReviewLog[];
  outbox: OutboxItem[];
};

export type ReviewSnapshot = {
  cards: StoredCard[];
  /** Every local rating, oldest first. The session uses these for the daily caps. */
  logs: LocalReviewLog[];
  dueCount: number;
  pending: number;
};

export type RatingInput = {
  itemId: string;
  rating: ReviewRating;
  /** Defaults to recognition. Recall is rated only after that direction exists. */
  direction?: ReviewDirection;
  reviewedAt?: string;
  /** Stable id for this rating. Reusing it on retry must not apply the review again. */
  clientId?: string;
  /**
   * When false, a word that has no card yet is ignored.
   * Lesson mistakes set this so an unknown word does not enter the deck.
   */
  createIfMissing?: boolean;
};

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type NetworkMonitor = {
  isOnline(): Promise<boolean>;
  subscribe(listener: (online: boolean) => void): () => void;
};

export type ReviewRemote = {
  fetchCards(userId: string): Promise<StoredCard[]>;
  fetchLogs(userId: string): Promise<ReviewLog[]>;
  /** Inserts the card or replaces it when this review is at least as new as the stored one. */
  upsertCard(userId: string, card: StoredCard): Promise<StoredCard>;
  /** Inserts the log once per clientId. */
  insertLog(userId: string, log: ReviewLog): Promise<void>;
};

export type Scheduler = (fn: () => void, delayMs: number) => () => void;

export type ReviewRepository = {
  read(userId: string): Promise<ReviewSnapshot>;
  /**
   * Creates one recognition card per item that does not have one yet.
   * An existing card keeps its schedule, so repeating a lesson does not duplicate it.
   */
  introduceItems(userId: string, items: readonly { id: string }[]): Promise<ReviewSnapshot>;
  recordRating(userId: string, input: RatingInput): Promise<ReviewSnapshot>;
  sync(userId: string): Promise<ReviewSnapshot>;
  start(userId: string, onSynced: () => void): () => void;
  settled(): Promise<void>;
};
