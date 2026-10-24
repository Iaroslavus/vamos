import type { KeyValueStorage } from '@/features/progress/types';

import { EMPTY_PROFILE, type LearnerProfile } from './profile';
import { createLearnerRepository, profileFromRemote, type LearnerRemote } from './repository';

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

function remote(
  seed: LearnerProfile | null,
  fail = false,
): LearnerRemote & { saved: LearnerProfile | null } {
  const state = { saved: seed, fail };
  return {
    saved: seed,
    async fetch() {
      if (state.fail) throw new Error('offline');
      return state.saved;
    },
    async update(_userId, profile) {
      if (state.fail) throw new Error('offline');
      state.saved = profile;
      this.saved = profile;
    },
  };
}

const named: LearnerProfile = {
  name: 'Анна',
  goal: null,
  dailyMinutes: 10,
  preferencesAsked: false,
};

describe('createLearnerRepository', () => {
  it('keeps the local profile when the server cannot be read', async () => {
    const storage = memoryStorage();
    const server = remote(null, true);
    const repo = createLearnerRepository({ storage, remote: server });

    await repo.save('user-1', { name: 'Анна' });
    await expect(repo.read('user-1')).resolves.toMatchObject(named);
  });

  it('saves locally when the upload fails', async () => {
    const storage = memoryStorage();
    const server = remote(null, true);
    const repo = createLearnerRepository({ storage, remote: server });

    await expect(repo.save('user-1', { name: 'Анна' })).resolves.toMatchObject({ name: 'Анна' });
    const next = createLearnerRepository({ storage, remote: remote(null) });
    await expect(next.read('user-1')).resolves.toMatchObject({ name: 'Анна' });
  });

  it('uploads a merged profile when the server is behind', async () => {
    const storage = memoryStorage();
    await storage.setItem('vamos.learner.user-1', JSON.stringify({ version: 1, profile: named }));
    const server = remote({ ...EMPTY_PROFILE, name: null });
    const repo = createLearnerRepository({ storage, remote: server });

    await expect(repo.read('user-1')).resolves.toMatchObject({ name: 'Анна' });
    expect(server.saved?.name).toBe('Анна');
  });

  it('reads a stored profile row', () => {
    expect(
      profileFromRemote({ display_name: '  Анна  ', goal: 'work', daily_minutes: 20 }),
    ).toEqual({
      name: 'Анна',
      goal: 'work',
      dailyMinutes: 20,
      preferencesAsked: true,
    });
    expect(profileFromRemote(null)).toBeNull();
    expect(
      profileFromRemote({ display_name: null, goal: 'nope', daily_minutes: 12 }),
    ).toMatchObject({ name: null, goal: null, dailyMinutes: 10, preferencesAsked: false });
  });
});
