import { createCard, rateCard, selectDueCards, REVIEW_RATINGS, type FsrsCard } from './fsrs';
import type {
  KeyValueStorage,
  LocalReviewLog,
  NetworkMonitor,
  OutboxItem,
  PersistedReviews,
  RatingInput,
  ReviewRemote,
  ReviewRepository,
  ReviewSnapshot,
  Scheduler,
  StoredCard,
} from './types';

const CLIENT_ID_MAX = 200;
const ITEM_ID_MAX = 100;

export function reviewStorageKey(userId: string): string {
  return `vamos.review.local.${userId}`;
}

export type ReviewRepositoryDeps = {
  storage: KeyValueStorage;
  network: NetworkMonitor;
  remote: ReviewRemote;
  now?: () => string;
  createId?: () => string;
  schedule?: Scheduler;
};

export function createReviewRepository(deps: ReviewRepositoryDeps): ReviewRepository {
  const now = deps.now ?? (() => new Date().toISOString());
  const createId = deps.createId ?? randomId;
  const schedule = deps.schedule ?? defaultSchedule;

  let tail: Promise<void> = Promise.resolve();
  let retryAttempts = 0;
  let cancelRetry: (() => void) | null = null;
  const listeners = new Set<() => void>();

  function exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.then(task, task);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function emit(): void {
    for (const listener of listeners) listener();
  }

  function scheduleRetry(task: () => Promise<void>): void {
    cancelRetry?.();
    retryAttempts += 1;
    const delay = retryDelayMs(retryAttempts);
    cancelRetry = schedule(() => {
      cancelRetry = null;
      void exclusive(task)
        .then(() => {
          retryAttempts = 0;
          emit();
        })
        .catch(() => {
          scheduleRetry(task);
        });
    }, delay);
  }

  async function load(userId: string): Promise<PersistedReviews> {
    const raw = await deps.storage.getItem(reviewStorageKey(userId));
    if (!raw) return emptyReviews();
    const parsed: unknown = JSON.parse(raw);
    if (!isPersisted(parsed)) throw new Error('Stored reviews are unreadable');
    return parsed;
  }

  async function save(userId: string, state: PersistedReviews): Promise<void> {
    await deps.storage.setItem(reviewStorageKey(userId), JSON.stringify(state));
  }

  async function applyRating(userId: string, input: RatingInput): Promise<void> {
    const itemId = input.itemId.trim();
    assertRating(input, itemId);
    const clientId = input.clientId ?? createId();
    if (clientId.length < 1 || clientId.length > CLIENT_ID_MAX) {
      throw new Error('Invalid review client id');
    }
    const reviewedAt = input.reviewedAt ?? now();
    if (Number.isNaN(Date.parse(reviewedAt))) throw new Error('Invalid reviewedAt');

    let state = await load(userId);
    if (state.logs.some((log) => log.clientId === clientId)) return;

    const when = new Date(reviewedAt);
    const existing = state.cards[itemId];
    if (existing?.lastReview && Date.parse(existing.lastReview) > when.getTime()) {
      throw new Error('Review is older than the card');
    }

    const current = existing ? toFsrs(existing) : createCard(when);
    const rated = rateCard(current, input.rating, when);
    const card = toStored(rated.card, existing?.id ?? createId(), itemId);
    const log: LocalReviewLog = {
      clientId,
      cardId: card.id,
      itemId,
      rating: input.rating,
      reviewedAt: when.toISOString(),
      elapsedDays: rated.log.elapsedDays,
      scheduledDays: rated.log.scheduledDays,
      state: rated.log.state,
      card,
    };

    state = {
      ...state,
      cards: { ...state.cards, [itemId]: card },
      logs: [...state.logs, log],
    };
    state = enqueue(state, { kind: 'review', key: clientId, attempts: 0 });
    await save(userId, state);
  }

  async function pull(userId: string): Promise<void> {
    const [remoteCards, remoteLogs] = await Promise.all([
      deps.remote.fetchCards(userId),
      deps.remote.fetchLogs(userId),
    ]);

    let state = await load(userId);
    const pendingItems = new Set(
      state.outbox.flatMap((item) => {
        const log = state.logs.find((entry) => entry.clientId === item.key);
        return log ? [log.itemId] : [];
      }),
    );

    const cards = { ...state.cards };
    for (const remote of remoteCards) {
      cards[remote.itemId] = mergeCard(
        cards[remote.itemId],
        remote,
        pendingItems.has(remote.itemId),
      );
    }

    const logs = state.logs.map((log) => rewriteLogId(log, cards[log.itemId]?.id));
    const known = new Set(logs.map((log) => log.clientId));
    for (const remote of remoteLogs) {
      if (known.has(remote.clientId)) continue;
      const itemId = itemIdFor(cards, remote.cardId);
      if (!itemId) continue;
      logs.push({ ...remote, itemId });
      known.add(remote.clientId);
    }

    const confirmed = new Set(remoteLogs.map((log) => log.clientId));
    const outbox = state.outbox.filter((item) => !confirmed.has(item.key));
    await save(userId, { ...state, cards, logs, outbox });
  }

  async function flush(userId: string): Promise<void> {
    if (!(await deps.network.isOnline())) return;

    let state = await load(userId);
    for (const item of [...state.outbox]) {
      if (!state.outbox.some((entry) => sameItem(entry, item))) continue;
      const log = state.logs.find((entry) => entry.clientId === item.key);
      if (!log?.card) {
        state = without(state, item);
        await save(userId, state);
        continue;
      }

      try {
        const saved = await deps.remote.upsertCard(userId, log.card);
        state = adoptCardId(state, log.itemId, saved.id);
        const current = state.logs.find((entry) => entry.clientId === item.key);
        if (!current) throw new Error('Queued review disappeared');
        await deps.remote.insertLog(userId, current);
        state = without(state, item);
        await save(userId, state);
      } catch (error) {
        state = bump(state, item);
        await save(userId, state);
        throw error;
      }
    }
  }

  async function syncBody(userId: string): Promise<ReviewSnapshot> {
    if (await deps.network.isOnline()) {
      await pull(userId);
      await flush(userId);
    }
    return toSnapshot(await load(userId), now());
  }

  return {
    read(userId) {
      return exclusive(async () => toSnapshot(await load(userId), now()));
    },

    recordRating(userId, input) {
      return exclusive(async () => {
        await applyRating(userId, input);
        if (await deps.network.isOnline()) {
          try {
            await flush(userId);
          } catch {
            scheduleRetry(() => flush(userId));
          }
        }
        const snapshot = toSnapshot(await load(userId), now());
        queueMicrotask(emit);
        return snapshot;
      });
    },

    sync(userId) {
      return exclusive(async () => {
        try {
          return await syncBody(userId);
        } catch (error) {
          scheduleRetry(() => syncBody(userId).then(() => undefined));
          throw error;
        }
      });
    },

    start(userId, onSynced) {
      let stopped = false;
      listeners.add(onSynced);

      const run = () => {
        if (stopped) return;
        void exclusive(() => syncBody(userId))
          .then(() => {
            if (!stopped) onSynced();
          })
          .catch(() => {
            if (!stopped) scheduleRetry(() => syncBody(userId).then(() => undefined));
          });
      };

      const unsubscribe = deps.network.subscribe((online) => {
        if (online) run();
      });
      run();

      return () => {
        stopped = true;
        listeners.delete(onSynced);
        unsubscribe();
      };
    },

    settled() {
      return tail;
    },
  };
}

function emptyReviews(): PersistedReviews {
  return { version: 1, cards: {}, logs: [], outbox: [] };
}

function isPersisted(value: unknown): value is PersistedReviews {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as PersistedReviews;
  return (
    record.version === 1 &&
    typeof record.cards === 'object' &&
    record.cards !== null &&
    Array.isArray(record.logs) &&
    Array.isArray(record.outbox)
  );
}

function toSnapshot(state: PersistedReviews, nowIso: string): ReviewSnapshot {
  const cards = Object.values(state.cards).sort((left, right) =>
    left.itemId.localeCompare(right.itemId),
  );
  const dueCount = selectDueCards(cards, new Date(nowIso)).length;
  return { cards, dueCount, pending: state.outbox.length };
}

function toFsrs(card: StoredCard): FsrsCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsedDays,
    scheduledDays: card.scheduledDays,
    learningSteps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: asState(card.state),
    lastReview: card.lastReview ? new Date(card.lastReview) : null,
  };
}

function toStored(card: FsrsCard, id: string, itemId: string): StoredCard {
  return {
    id,
    itemId,
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsedDays,
    scheduledDays: card.scheduledDays,
    learningSteps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.lastReview ? card.lastReview.toISOString() : null,
  };
}

function mergeCard(
  local: StoredCard | undefined,
  remote: StoredCard,
  pending: boolean,
): StoredCard {
  if (!local || pending) return { ...(local ?? remote), id: remote.id };
  if (reviewTime(remote.lastReview) > reviewTime(local.lastReview)) return remote;
  return { ...local, id: remote.id };
}

function rewriteLogId(log: LocalReviewLog, cardId: string | undefined): LocalReviewLog {
  if (!cardId || cardId === log.cardId) return log;
  return { ...log, cardId, card: log.card ? { ...log.card, id: cardId } : undefined };
}

function adoptCardId(state: PersistedReviews, itemId: string, id: string): PersistedReviews {
  const current = state.cards[itemId];
  if (!current || current.id === id) return state;
  return {
    ...state,
    cards: { ...state.cards, [itemId]: { ...current, id } },
    logs: state.logs.map((log) => (log.itemId === itemId ? rewriteLogId(log, id) : log)),
  };
}

function itemIdFor(cards: Record<string, StoredCard>, cardId: string): string | null {
  for (const card of Object.values(cards)) {
    if (card.id === cardId) return card.itemId;
  }
  return null;
}

function reviewTime(value: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function enqueue(state: PersistedReviews, item: OutboxItem): PersistedReviews {
  if (state.outbox.some((entry) => sameItem(entry, item))) return state;
  return { ...state, outbox: [...state.outbox, item] };
}

function without(state: PersistedReviews, item: OutboxItem): PersistedReviews {
  return { ...state, outbox: state.outbox.filter((entry) => !sameItem(entry, item)) };
}

function bump(state: PersistedReviews, item: OutboxItem): PersistedReviews {
  return {
    ...state,
    outbox: state.outbox.map((entry) =>
      sameItem(entry, item) ? { ...entry, attempts: entry.attempts + 1 } : entry,
    ),
  };
}

function sameItem(left: OutboxItem, right: OutboxItem): boolean {
  return left.kind === right.kind && left.key === right.key;
}

function assertRating(input: RatingInput, itemId: string): void {
  if (itemId.length < 1 || itemId.length > ITEM_ID_MAX) throw new Error('Invalid item id');
  if (!(REVIEW_RATINGS as readonly string[]).includes(input.rating)) {
    throw new Error('Invalid review rating');
  }
}

function asState(value: number): FsrsCard['state'] {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  throw new Error('Invalid card state');
}

function retryDelayMs(attempts: number): number {
  const exponent = Math.min(Math.max(attempts, 1), 5) - 1;
  return 1000 * 2 ** exponent;
}

function randomId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `review-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultSchedule(fn: () => void, delayMs: number): () => void {
  const timer = setTimeout(fn, delayMs);
  return () => clearTimeout(timer);
}
