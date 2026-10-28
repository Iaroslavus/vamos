import type { KeyValueStorage } from '@/features/progress/types';

import type { UiLanguage } from '@/i18n/language';

import { EMPTY_PROFILE, type LearnerProfile } from './profile';
import {
  createLearnerRepository,
  profileFromRemote,
  profileToRemote,
  type LearnerRemote,
  type UiLanguageStorage,
} from './repository';

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
  uiLanguage: null,
  spanishVariant: 'spain',
};

function languageMemory(initial: UiLanguage | null = null): UiLanguageStorage & {
  current: () => UiLanguage | null;
} {
  let value = initial;
  return {
    current: () => value,
    async read() {
      return value;
    },
    async write(language) {
      value = language;
    },
  };
}

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
      profileFromRemote({
        display_name: '  Анна  ',
        goal: 'work',
        daily_minutes: 20,
        ui_language: 'uk',
      }),
    ).toEqual({
      name: 'Анна',
      goal: 'work',
      dailyMinutes: 20,
      preferencesAsked: true,
      uiLanguage: 'uk',
      spanishVariant: 'spain',
    });
    expect(profileFromRemote(null)).toBeNull();
    expect(
      profileFromRemote({
        display_name: null,
        goal: 'nope',
        daily_minutes: 12,
        ui_language: 'fr',
      }),
    ).toMatchObject({
      name: null,
      goal: null,
      dailyMinutes: 10,
      preferencesAsked: false,
      uiLanguage: null,
      spanishVariant: 'spain',
    });
    expect(
      profileFromRemote({
        display_name: null,
        goal: null,
        daily_minutes: 10,
        ui_language: null,
        spanish_variant: 'latam',
      })?.spanishVariant,
    ).toBe('latam');
  });

  it('stores the device language when the account has none and uploads it', async () => {
    const storage = memoryStorage();
    const server = remote({ ...EMPTY_PROFILE });
    const languages = languageMemory();
    const repo = createLearnerRepository({
      storage,
      remote: server,
      deviceLanguage: () => 'uk',
      languageStorage: languages,
    });

    await expect(repo.read('user-1')).resolves.toMatchObject({ uiLanguage: 'uk' });
    expect(languages.current()).toBe('uk');
    expect(server.saved?.uiLanguage).toBe('uk');
  });

  it('keeps the language already chosen on this device', async () => {
    const storage = memoryStorage();
    const server = remote({ ...EMPTY_PROFILE, uiLanguage: 'en' });
    const languages = languageMemory('uk');
    const repo = createLearnerRepository({
      storage,
      remote: server,
      deviceLanguage: () => 'ru',
      languageStorage: languages,
    });

    await expect(repo.read('user-1')).resolves.toMatchObject({ uiLanguage: 'uk' });
    expect(server.saved?.uiLanguage).toBe('uk');
  });

  it('does not invent a language while the server cannot be read', async () => {
    const storage = memoryStorage();
    const server = remote(null, true);
    const languages = languageMemory();
    const repo = createLearnerRepository({
      storage,
      remote: server,
      deviceLanguage: () => 'uk',
      languageStorage: languages,
    });

    await expect(repo.read('user-1')).resolves.toMatchObject({ uiLanguage: null });
    expect(languages.current()).toBeNull();
  });

  it('omits a null language from the profile update', () => {
    expect(profileToRemote(EMPTY_PROFILE)).toEqual({
      display_name: null,
      goal: null,
      daily_minutes: 10,
    });
    expect(profileToRemote({ ...EMPTY_PROFILE, uiLanguage: 'en' }).ui_language).toBe('en');
  });
});
