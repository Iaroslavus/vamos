import type { ReviewRating } from './fsrs';

export type StoredCard = {
  id: string;
  itemId: string;
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
  /** Card as it stood after this rating. Present for reviews recorded on this device. */
  card?: StoredCard;
};

export type OutboxItem = {
  kind: 'review';
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
  dueCount: number;
  pending: number;
};

export type RatingInput = {
  itemId: string;
  rating: ReviewRating;
  reviewedAt?: string;
  /** Stable id for this rating. Reusing it on retry must not apply the review again. */
  clientId?: string;
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
  recordRating(userId: string, input: RatingInput): Promise<ReviewSnapshot>;
  sync(userId: string): Promise<ReviewSnapshot>;
  start(userId: string, onSynced: () => void): () => void;
  settled(): Promise<void>;
};
