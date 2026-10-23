import {
  LEGACY_MIGRATED_KEY,
  LEGACY_PROGRESS_KEY,
  legacyXpClientId,
  parseLegacyProgressV28,
} from './legacy';
import { resolveLessonConflict, retryDelayMs, roundAccuracy } from './merge';
import type {
  CompletionInput,
  KeyValueStorage,
  LessonProgress,
  NetworkMonitor,
  OutboxItem,
  PersistedProgress,
  ProgressRemote,
  ProgressRepository,
  ProgressSnapshot,
  Scheduler,
  XpAward,
  XpGrantInput,
  XpSource,
} from './types';

const CLIENT_ID_MAX = 200;

export function progressStorageKey(userId: string): string {
  return `vamos.progress.local.${userId}`;
}

export type ProgressRepositoryDeps = {
  storage: KeyValueStorage;
  network: NetworkMonitor;
  remote: ProgressRemote;
  now?: () => string;
  createId?: () => string;
  schedule?: Scheduler;
};

export function createProgressRepository(deps: ProgressRepositoryDeps): ProgressRepository {
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

  async function load(userId: string): Promise<PersistedProgress> {
    const raw = await deps.storage.getItem(progressStorageKey(userId));
    if (!raw) return emptyProgress();
    const parsed: unknown = JSON.parse(raw);
    if (!isPersisted(parsed)) {
      throw new Error('Stored progress is unreadable');
    }
    return parsed;
  }

  async function save(userId: string, state: PersistedProgress): Promise<void> {
    await deps.storage.setItem(progressStorageKey(userId), JSON.stringify(state));
  }

  async function migrateLegacy(userId: string): Promise<void> {
    if ((await deps.storage.getItem(LEGACY_MIGRATED_KEY)) === '1') return;

    const legacy = parseLegacyProgressV28(await deps.storage.getItem(LEGACY_PROGRESS_KEY));
    if (legacy) {
      for (const lesson of legacy.lessons) {
        await applyCompletion(userId, {
          lessonId: lesson.lessonId,
          accuracy: lesson.accuracy,
          xp: lesson.xp,
          completedAt: lesson.completedAt,
          xpClientId: legacyXpClientId(lesson),
        });
      }
    }

    await deps.storage.setItem(LEGACY_MIGRATED_KEY, '1');
  }

  async function applyCompletion(userId: string, input: CompletionInput): Promise<void> {
    const lessonId = input.lessonId.trim();
    assertCompletion(input, lessonId);
    const completedAt = input.completedAt ?? now();
    const attempt: LessonProgress = {
      lessonId,
      status: 'completed',
      bestAccuracy: roundAccuracy(input.accuracy),
      completedAt,
    };

    let state = await load(userId);
    const existing = state.lessons[lessonId] ?? null;
    const winner = resolveLessonConflict(attempt, existing);
    const improved = !existing || (attempt.bestAccuracy ?? -1) > (existing.bestAccuracy ?? -1);

    state = { ...state, lessons: { ...state.lessons, [lessonId]: winner } };
    if (improved) state = enqueue(state, { kind: 'lesson', key: lessonId, attempts: 0 });

    if (input.xp > 0) {
      const clientId = input.xpClientId ?? createId();
      if (clientId.length < 1 || clientId.length > CLIENT_ID_MAX) {
        throw new Error('Invalid xp client id');
      }
      if (!state.xp.some((event) => event.clientId === clientId)) {
        const award: XpAward = {
          clientId,
          lessonId,
          amount: input.xp,
          createdAt: completedAt,
          source: 'lesson',
        };
        state = { ...state, xp: [...state.xp, award] };
        state = enqueue(state, { kind: 'xp', key: clientId, attempts: 0 });
      }
    }

    await save(userId, state);
  }

  async function pull(userId: string): Promise<void> {
    const [remoteLessons, remoteXp] = await Promise.all([
      deps.remote.fetchLessons(userId),
      deps.remote.fetchXp(userId),
    ]);

    let state = await load(userId);
    const lessons = { ...state.lessons };
    for (const lesson of remoteLessons) {
      const local = lessons[lesson.lessonId] ?? null;
      lessons[lesson.lessonId] = local ? resolveLessonConflict(local, lesson) : lesson;
    }

    const xp = [...state.xp];
    const known = new Set(xp.map((event) => event.clientId));
    for (const award of remoteXp) {
      const clientId = award.clientId ?? `server:${award.serverId}`;
      if (known.has(clientId)) continue;
      xp.push({
        clientId,
        lessonId: award.lessonId ?? '',
        amount: award.amount,
        createdAt: award.createdAt,
      });
      known.add(clientId);
    }

    state = { ...state, lessons, xp };
    const onServer = new Set(remoteXp.flatMap((award) => (award.clientId ? [award.clientId] : [])));
    for (const award of xp) {
      if (award.clientId.startsWith('server:') || onServer.has(award.clientId)) continue;
      state = enqueue(state, { kind: 'xp', key: award.clientId, attempts: 0 });
    }

    await save(userId, state);
  }

  async function flush(userId: string): Promise<void> {
    if (!(await deps.network.isOnline())) return;

    let state = await load(userId);
    for (const item of [...state.outbox]) {
      if (!state.outbox.some((entry) => sameItem(entry, item))) continue;
      try {
        if (item.kind === 'lesson') {
          const lesson = state.lessons[item.key];
          if (!lesson) {
            state = without(state, item);
            await save(userId, state);
            continue;
          }
          const saved = await deps.remote.saveLesson(userId, lesson);
          state = without(state, item);
          state = { ...state, lessons: { ...state.lessons, [item.key]: saved } };
        } else {
          const award = state.xp.find((event) => event.clientId === item.key);
          if (!award) {
            state = without(state, item);
            await save(userId, state);
            continue;
          }
          await deps.remote.insertXp(userId, award);
          state = without(state, item);
        }
        await save(userId, state);
      } catch (error) {
        state = bump(state, item);
        await save(userId, state);
        throw error;
      }
    }
  }

  async function applyXp(userId: string, input: XpGrantInput): Promise<void> {
    assertXp(input);
    const refId = input.refId.trim();
    const clientId = input.clientId ?? createId();
    if (clientId.length < 1 || clientId.length > CLIENT_ID_MAX) {
      throw new Error('Invalid xp client id');
    }
    const createdAt = input.createdAt ?? now();
    if (Number.isNaN(Date.parse(createdAt))) throw new Error('Invalid createdAt');

    let state = await load(userId);
    if (state.xp.some((event) => event.clientId === clientId)) return;

    const award: XpAward = {
      clientId,
      lessonId: refId,
      amount: input.amount,
      createdAt,
      source: input.source,
    };
    state = { ...state, xp: [...state.xp, award] };
    state = enqueue(state, { kind: 'xp', key: clientId, attempts: 0 });
    await save(userId, state);
  }

  async function syncBody(userId: string): Promise<ProgressSnapshot> {
    await migrateLegacy(userId);
    if (await deps.network.isOnline()) {
      await pull(userId);
      await flush(userId);
    }
    return toSnapshot(await load(userId));
  }

  return {
    readProgress(userId) {
      return exclusive(async () => {
        await migrateLegacy(userId);
        return toSnapshot(await load(userId));
      });
    },

    recordCompletion(userId, input) {
      return exclusive(async () => {
        await migrateLegacy(userId);
        await applyCompletion(userId, input);
        if (await deps.network.isOnline()) {
          try {
            await flush(userId);
          } catch {
            scheduleRetry(() => flush(userId));
          }
        }
        const snapshot = toSnapshot(await load(userId));
        queueMicrotask(emit);
        return snapshot;
      });
    },

    awardXp(userId, input) {
      return exclusive(async () => {
        await migrateLegacy(userId);
        await applyXp(userId, input);
        if (await deps.network.isOnline()) {
          try {
            await flush(userId);
          } catch {
            scheduleRetry(() => flush(userId));
          }
        }
        const snapshot = toSnapshot(await load(userId));
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

function emptyProgress(): PersistedProgress {
  return { version: 1, lessons: {}, xp: [], outbox: [] };
}

function isPersisted(value: unknown): value is PersistedProgress {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as PersistedProgress;
  return (
    record.version === 1 &&
    typeof record.lessons === 'object' &&
    record.lessons !== null &&
    Array.isArray(record.xp) &&
    Array.isArray(record.outbox)
  );
}

function toSnapshot(state: PersistedProgress): ProgressSnapshot {
  const lessons = Object.values(state.lessons).sort((a, b) => a.lessonId.localeCompare(b.lessonId));
  const totalXp = state.xp.reduce((sum, event) => sum + event.amount, 0);
  return { lessons, totalXp, pending: state.outbox.length };
}

function enqueue(state: PersistedProgress, item: OutboxItem): PersistedProgress {
  if (state.outbox.some((entry) => sameItem(entry, item))) return state;
  return { ...state, outbox: [...state.outbox, item] };
}

function without(state: PersistedProgress, item: OutboxItem): PersistedProgress {
  return { ...state, outbox: state.outbox.filter((entry) => !sameItem(entry, item)) };
}

function bump(state: PersistedProgress, item: OutboxItem): PersistedProgress {
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

function assertXp(input: XpGrantInput): void {
  if (!isXpSource(input.source)) throw new Error('Invalid xp source');
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new Error('Invalid xp');
  const refId = input.refId.trim();
  if (refId.length < 1 || refId.length > 100) throw new Error('Invalid xp ref');
  if (input.createdAt !== undefined && Number.isNaN(Date.parse(input.createdAt))) {
    throw new Error('Invalid createdAt');
  }
}

function isXpSource(value: string): value is XpSource {
  return value === 'lesson' || value === 'review';
}

function assertCompletion(input: CompletionInput, lessonId: string): void {
  if (lessonId.length < 1 || lessonId.length > 100) throw new Error('Invalid lesson id');
  if (!Number.isFinite(input.accuracy) || input.accuracy < 0 || input.accuracy > 100) {
    throw new Error('Invalid accuracy');
  }
  if (!Number.isInteger(input.xp) || input.xp < 0) throw new Error('Invalid xp');
  if (input.completedAt !== undefined && Number.isNaN(Date.parse(input.completedAt))) {
    throw new Error('Invalid completedAt');
  }
}

function randomId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `xp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultSchedule(fn: () => void, delayMs: number): () => void {
  const timer = setTimeout(fn, delayMs);
  return () => clearTimeout(timer);
}
