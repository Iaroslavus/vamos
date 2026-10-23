import { createReviewRepository } from './repository';
import type {
  KeyValueStorage,
  NetworkMonitor,
  ReviewLog,
  ReviewRemote,
  Scheduler,
  StoredCard,
} from './types';

const USER = '11111111-1111-1111-1111-111111111111';

type Scheduled = { run: () => void; delayMs: number };

function memoryStorage(): KeyValueStorage {
  const items = new Map<string, string>();
  return {
    async getItem(key) {
      return items.get(key) ?? null;
    },
    async setItem(key, value) {
      items.set(key, value);
    },
    async removeItem(key) {
      items.delete(key);
    },
  };
}

function createNetwork(initial: boolean): NetworkMonitor & { setOnline(online: boolean): void } {
  let online = initial;
  const listeners = new Set<(online: boolean) => void>();
  return {
    async isOnline() {
      return online;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setOnline(next) {
      const becameOnline = !online && next;
      online = next;
      if (becameOnline) {
        for (const listener of listeners) listener(true);
      }
    },
  };
}

function createRemote() {
  const cards = new Map<string, StoredCard>();
  const logs = new Map<string, ReviewLog>();
  const logInserts: string[] = [];
  let loseAck = false;

  const remote: ReviewRemote = {
    async fetchCards() {
      return [...cards.values()];
    },
    async fetchLogs() {
      return [...logs.values()];
    },
    async upsertCard(_userId, card) {
      const key = `${card.itemId}:${card.direction}`;
      const existing = cards.get(key);
      if (
        existing?.lastReview &&
        card.lastReview &&
        Date.parse(existing.lastReview) > Date.parse(card.lastReview)
      ) {
        return existing;
      }
      const stored = { ...card, id: existing?.id ?? card.id };
      cards.set(key, stored);
      return stored;
    },
    async insertLog(_userId, log) {
      if (!logs.has(log.clientId)) logs.set(log.clientId, log);
      logInserts.push(log.clientId);
      if (loseAck) {
        loseAck = false;
        throw new Error('acknowledgement lost');
      }
    },
  };

  return {
    remote,
    cards,
    logs,
    logInserts,
    loseNextAck() {
      loseAck = true;
    },
  };
}

function setup(online: boolean) {
  const storage = memoryStorage();
  const network = createNetwork(online);
  const server = createRemote();
  const scheduled: Scheduled[] = [];
  const schedule: Scheduler = (run, delayMs) => {
    scheduled.push({ run, delayMs });
    return () => undefined;
  };
  let ids = 0;
  const repo = createReviewRepository({
    storage,
    network,
    remote: server.remote,
    now: () => '2026-10-23T12:00:00.000Z',
    createId: () => `generated-${(ids += 1)}`,
    schedule,
  });
  return { storage, network, server, scheduled, repo };
}

describe('review repository', () => {
  it('keeps a rating on the device while offline and sends it when the network returns', async () => {
    const { repo, network, server } = setup(false);
    const stop = repo.start(USER, () => undefined);
    await repo.settled();

    await repo.recordRating(USER, { itemId: 'hola', rating: 'good', clientId: 'rev-1' });

    expect(server.logInserts).toEqual([]);
    expect(server.cards.size).toBe(0);
    const queued = await repo.read(USER);
    const recognition = queued.cards.find((card) => card.direction === 'es_to_ru');
    const recall = queued.cards.find((card) => card.direction === 'ru_to_es');
    expect(recognition?.reps).toBe(1);
    expect(recall?.reps).toBe(0);
    expect(queued.dueCount).toBe(1);
    expect(queued.pending).toBe(2);

    network.setOnline(true);
    await repo.settled();

    expect(server.logInserts).toEqual(['rev-1']);
    expect(server.cards.get('hola:es_to_ru')?.reps).toBe(1);
    expect(server.cards.get('hola:ru_to_es')?.reps).toBe(0);
    expect(server.logs.get('rev-1')).toMatchObject({ rating: 'good', state: 0, elapsedDays: 0 });
    expect((await repo.read(USER)).pending).toBe(0);
    stop();
  });

  it('does not insert the review again when the same rating is synced twice', async () => {
    const { repo, network, server } = setup(false);
    const input = { itemId: 'hola', rating: 'good' as const, clientId: 'rev-1' };

    await repo.recordRating(USER, input);
    await repo.recordRating(USER, input);

    expect((await repo.read(USER)).cards[0]?.reps).toBe(1);
    expect((await repo.read(USER)).pending).toBe(2);

    network.setOnline(true);
    await repo.sync(USER);
    await repo.sync(USER);

    expect(server.logInserts).toEqual(['rev-1']);
    expect(server.logs.size).toBe(1);
    expect(server.cards.get('hola:es_to_ru')?.reps).toBe(1);
    expect(server.cards.size).toBe(2);
    expect((await repo.read(USER)).pending).toBe(0);
  });

  it('keeps a single log when the server stored the rating but the acknowledgement was lost', async () => {
    const { repo, server, scheduled } = setup(true);
    server.loseNextAck();

    await repo.recordRating(USER, { itemId: 'hola', rating: 'good', clientId: 'rev-1' });

    expect(server.logs.size).toBe(1);
    expect((await repo.read(USER)).pending).toBeGreaterThan(0);
    expect(scheduled.map((item) => item.delayMs)).toEqual([1000]);

    scheduled[0]?.run();
    await repo.settled();

    expect(server.logInserts).toEqual(['rev-1', 'rev-1']);
    expect(server.logs.size).toBe(1);
    expect(server.cards.size).toBe(2);
    expect((await repo.read(USER)).cards[0]?.reps).toBe(1);
    expect((await repo.read(USER)).pending).toBe(0);
  });
});
