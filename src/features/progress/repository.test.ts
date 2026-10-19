import { LEGACY_MIGRATED_KEY, LEGACY_PROGRESS_KEY } from './legacy';
import { resolveLessonConflict } from './merge';
import { createProgressRepository } from './repository';
import type {
  KeyValueStorage,
  LessonProgress,
  NetworkMonitor,
  ProgressRemote,
  Scheduler,
  XpAward,
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
  const lessons = new Map<string, LessonProgress>();
  const xp = new Map<string, XpAward>();
  const xpInserts: string[] = [];
  let failXp = 0;
  let loseAck = false;

  const remote: ProgressRemote = {
    async fetchLessons() {
      return [...lessons.values()];
    },
    async fetchXp() {
      return [...xp.values()].map((award) => ({
        serverId: award.clientId,
        clientId: award.clientId,
        lessonId: award.lessonId,
        amount: award.amount,
        createdAt: award.createdAt,
      }));
    },
    async saveLesson(_userId, lesson) {
      const winner = resolveLessonConflict(lesson, lessons.get(lesson.lessonId) ?? null);
      lessons.set(lesson.lessonId, winner);
      return winner;
    },
    async insertXp(_userId, award) {
      if (failXp > 0) {
        failXp -= 1;
        throw new Error('network');
      }
      if (!xp.has(award.clientId)) xp.set(award.clientId, award);
      xpInserts.push(award.clientId);
      if (loseAck) {
        loseAck = false;
        throw new Error('acknowledgement lost');
      }
    },
  };

  return {
    remote,
    lessons,
    xp,
    xpInserts,
    failNextXp(times = 1) {
      failXp = times;
    },
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
  const repo = createProgressRepository({
    storage,
    network,
    remote: server.remote,
    now: () => '2026-10-19T00:00:00.000Z',
    createId: () => 'generated-id',
    schedule,
  });
  return { storage, network, server, scheduled, repo };
}

describe('progress repository', () => {
  it('keeps a completion on the device while offline and sends it when the network returns', async () => {
    const { repo, network, server } = setup(false);
    const stop = repo.start(USER, () => undefined);
    await repo.settled();

    await repo.recordCompletion(USER, {
      lessonId: 'a1-u01-l01',
      accuracy: 80,
      xp: 10,
      xpClientId: 'xp-1',
    });

    expect(server.xpInserts).toEqual([]);
    expect(server.lessons.size).toBe(0);
    const queued = await repo.readProgress(USER);
    expect(queued.lessons[0]?.bestAccuracy).toBe(80);
    expect(queued.totalXp).toBe(10);
    expect(queued.pending).toBeGreaterThan(0);

    network.setOnline(true);
    await repo.settled();

    expect(server.xpInserts).toEqual(['xp-1']);
    expect(server.lessons.get('a1-u01-l01')?.bestAccuracy).toBe(80);
    expect((await repo.readProgress(USER)).pending).toBe(0);
    stop();
  });

  it('retries a send that failed and then clears the queue', async () => {
    const { repo, server, scheduled } = setup(true);
    server.failNextXp();

    await repo.recordCompletion(USER, {
      lessonId: 'a1-u01-l01',
      accuracy: 80,
      xp: 10,
      xpClientId: 'xp-1',
    });

    expect(server.xp.size).toBe(0);
    expect((await repo.readProgress(USER)).totalXp).toBe(10);
    expect(scheduled.map((item) => item.delayMs)).toEqual([1000]);

    scheduled[0]?.run();
    await repo.settled();

    expect(server.xp.size).toBe(1);
    expect((await repo.readProgress(USER)).pending).toBe(0);
  });

  it('does not award the same XP twice when the completion is recorded or delivered again', async () => {
    const { repo, server } = setup(true);
    const input = {
      lessonId: 'a1-u01-l01',
      accuracy: 80,
      xp: 15,
      xpClientId: 'xp-1',
      completedAt: '2026-10-01T00:00:00.000Z',
    };

    await repo.recordCompletion(USER, input);
    await repo.recordCompletion(USER, input);

    expect((await repo.readProgress(USER)).totalXp).toBe(15);
    expect(server.xpInserts).toEqual(['xp-1']);
    expect(server.xp.size).toBe(1);
  });

  it('keeps a single XP row when the server stored the award but the acknowledgement was lost', async () => {
    const { repo, server, scheduled } = setup(true);
    server.loseNextAck();

    await repo.recordCompletion(USER, {
      lessonId: 'a1-u01-l01',
      accuracy: 80,
      xp: 15,
      xpClientId: 'xp-1',
    });

    expect(server.xp.size).toBe(1);
    expect((await repo.readProgress(USER)).pending).toBeGreaterThan(0);

    scheduled[0]?.run();
    await repo.settled();

    expect(server.xpInserts).toEqual(['xp-1', 'xp-1']);
    expect(server.xp.size).toBe(1);
    expect((await repo.readProgress(USER)).totalXp).toBe(15);
    expect((await repo.readProgress(USER)).pending).toBe(0);
  });

  it('keeps the better accuracy when the device and the server disagree', async () => {
    const { repo, server } = setup(true);
    server.lessons.set('a1-u01-l01', {
      lessonId: 'a1-u01-l01',
      status: 'completed',
      bestAccuracy: 92,
      completedAt: '2024-01-01T00:00:00.000Z',
    });

    await repo.recordCompletion(USER, {
      lessonId: 'a1-u01-l01',
      accuracy: 60,
      xp: 5,
      xpClientId: 'xp-low',
      completedAt: '2026-03-01T00:00:00.000Z',
    });

    expect(server.lessons.get('a1-u01-l01')).toMatchObject({
      bestAccuracy: 92,
      completedAt: '2024-01-01T00:00:00.000Z',
    });
    expect((await repo.readProgress(USER)).lessons[0]).toMatchObject({
      bestAccuracy: 92,
      completedAt: '2024-01-01T00:00:00.000Z',
    });

    await repo.recordCompletion(USER, {
      lessonId: 'a1-u01-l01',
      accuracy: 99,
      xp: 5,
      xpClientId: 'xp-high',
      completedAt: '2026-06-01T00:00:00.000Z',
    });

    expect(server.lessons.get('a1-u01-l01')).toMatchObject({
      bestAccuracy: 99,
      completedAt: '2026-06-01T00:00:00.000Z',
    });
    expect((await repo.readProgress(USER)).lessons[0]?.bestAccuracy).toBe(99);
    expect((await repo.readProgress(USER)).totalXp).toBe(10);
  });

  it('copies version 2.8 progress into the local queue once', async () => {
    const { repo, storage, server } = setup(true);
    const legacy = JSON.stringify({
      version: '2.8',
      lessons: [
        {
          lessonId: 'a1-u01-l01',
          accuracy: 88,
          xp: 20,
          completedAt: '2024-05-01T00:00:00.000Z',
        },
        {
          lessonId: 'a1-u01-l02',
          accuracy: 70,
          xp: 10,
          completedAt: '2024-05-02T00:00:00.000Z',
        },
      ],
    });
    await storage.setItem(LEGACY_PROGRESS_KEY, legacy);

    const first = await repo.readProgress(USER);
    expect(first.totalXp).toBe(30);
    expect(first.lessons.map((lesson) => lesson.lessonId)).toEqual(['a1-u01-l01', 'a1-u01-l02']);
    expect(await storage.getItem(LEGACY_MIGRATED_KEY)).toBe('1');

    await repo.sync(USER);
    await repo.sync(USER);
    expect(server.xp.size).toBe(2);
    expect(server.xpInserts).toHaveLength(2);

    await storage.setItem(
      LEGACY_PROGRESS_KEY,
      JSON.stringify({
        version: '2.8',
        lessons: [
          {
            lessonId: 'a1-u01-l03',
            accuracy: 100,
            xp: 50,
            completedAt: '2024-06-01T00:00:00.000Z',
          },
        ],
      }),
    );
    const ignored = await repo.readProgress(USER);
    expect(ignored.totalXp).toBe(30);
    expect(ignored.lessons.map((lesson) => lesson.lessonId)).toEqual(['a1-u01-l01', 'a1-u01-l02']);

    await storage.setItem(LEGACY_PROGRESS_KEY, legacy);
    await storage.removeItem(LEGACY_MIGRATED_KEY);
    const replayed = await repo.readProgress(USER);
    expect(replayed.totalXp).toBe(30);
    expect(replayed.lessons.map((lesson) => lesson.lessonId)).toEqual(['a1-u01-l01', 'a1-u01-l02']);
    await repo.sync(USER);
    expect(server.xp.size).toBe(2);
  });
});
