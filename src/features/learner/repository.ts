import {
  applyPatch,
  EMPTY_PROFILE,
  isLearningGoal,
  mergeProfiles,
  parseDisplayName,
  profilesEqual,
  type LearnerProfile,
} from '@/features/learner/profile';
import type { DailyGoalMinutes } from '@/features/progress/streak';
import type { KeyValueStorage } from '@/features/progress/types';
import { isUiLanguage, resolveUiLanguage, type UiLanguage } from '@/i18n/language';

export type LearnerRemote = {
  fetch(userId: string): Promise<LearnerProfile | null>;
  update(userId: string, profile: LearnerProfile): Promise<void>;
};

export type LearnerRepository = {
  read(userId: string): Promise<LearnerProfile>;
  save(userId: string, patch: Partial<LearnerProfile>): Promise<LearnerProfile>;
};

export type UiLanguageStorage = {
  read(): Promise<UiLanguage | null>;
  write(language: UiLanguage): Promise<void>;
};

type CreateLearnerRepositoryInput = {
  storage: KeyValueStorage;
  remote: LearnerRemote;
  /** Phone language used when neither the device key nor the account has one. */
  deviceLanguage?: () => Promise<UiLanguage> | UiLanguage;
  /** Device-level key, so the next launch can paint before the profile query. */
  languageStorage?: UiLanguageStorage;
};

const VERSION = 1;

type StoredProfile = {
  version: typeof VERSION;
  profile: LearnerProfile;
};

export function learnerStorageKey(userId: string): string {
  return `vamos.learner.${userId}`;
}

export function createLearnerRepository({
  storage,
  remote,
  deviceLanguage,
  languageStorage,
}: CreateLearnerRepositoryInput): LearnerRepository {
  return {
    async read(userId) {
      let remoteProfile: LearnerProfile | null = null;
      let remoteKnown = false;
      try {
        remoteProfile = await remote.fetch(userId);
        remoteKnown = true;
      } catch {
        remoteProfile = null;
      }
      const latest = await load(storage, userId);
      let merged = mergeProfiles(latest, remoteProfile);
      const stored = languageStorage ? await languageStorage.read() : null;
      const device =
        !stored && !merged.uiLanguage && remoteKnown && deviceLanguage
          ? await deviceLanguage()
          : null;
      const resolved = resolveUiLanguage({
        profile: merged.uiLanguage,
        stored,
        device: isUiLanguage(device) ? device : null,
        remoteKnown,
      });
      if (resolved.language !== merged.uiLanguage) {
        merged = { ...merged, uiLanguage: resolved.language };
      }
      if (resolved.persistStored && resolved.language && languageStorage) {
        await languageStorage.write(resolved.language);
      }
      if (!profilesEqual(latest, merged)) await store(storage, userId, merged);
      if (remoteKnown && remoteProfile && !profilesEqual(merged, remoteProfile)) {
        try {
          await remote.update(userId, merged);
        } catch {
          // The device copy is enough until the next save.
        }
      }
      return merged;
    },

    async save(userId, patch) {
      const next = applyPatch(await load(storage, userId), patch);
      await store(storage, userId, next);
      if (languageStorage && patch.uiLanguage && next.uiLanguage) {
        await languageStorage.write(next.uiLanguage);
      }
      try {
        await remote.update(userId, next);
      } catch {
        // Kept locally. The next read retries the upload.
      }
      return next;
    },
  };
}

export function profileFromRemote(
  row: {
    display_name: string | null;
    goal: string | null;
    daily_minutes: number;
    ui_language: string | null;
  } | null,
): LearnerProfile | null {
  if (!row) return null;
  const dailyMinutes = isDailyMinutes(row.daily_minutes) ? row.daily_minutes : 10;
  const goal = row.goal && isLearningGoal(row.goal) ? row.goal : null;
  return {
    name: row.display_name ? parseDisplayName(row.display_name) : null,
    goal,
    dailyMinutes,
    preferencesAsked: goal != null,
    uiLanguage: isUiLanguage(row.ui_language) ? row.ui_language : null,
  };
}

/** Column patch for `profiles`. A null language is omitted so a name save cannot clear it. */
export function profileToRemote(profile: LearnerProfile): {
  display_name: string | null;
  goal: LearnerProfile['goal'];
  daily_minutes: DailyGoalMinutes;
  ui_language?: UiLanguage;
} {
  return {
    display_name: profile.name,
    goal: profile.goal,
    daily_minutes: profile.dailyMinutes,
    ...(profile.uiLanguage ? { ui_language: profile.uiLanguage } : {}),
  };
}

function isDailyMinutes(value: number): value is DailyGoalMinutes {
  return value === 5 || value === 10 || value === 20 || value === 30;
}

async function load(storage: KeyValueStorage, userId: string): Promise<LearnerProfile> {
  const raw = await storage.getItem(learnerStorageKey(userId));
  if (!raw) return EMPTY_PROFILE;
  try {
    const parsed = JSON.parse(raw) as StoredProfile;
    if (parsed.version !== VERSION || !parsed.profile) return EMPTY_PROFILE;
    return applyPatch(EMPTY_PROFILE, parsed.profile);
  } catch {
    return EMPTY_PROFILE;
  }
}

async function store(
  storage: KeyValueStorage,
  userId: string,
  profile: LearnerProfile,
): Promise<void> {
  const payload: StoredProfile = { version: VERSION, profile };
  await storage.setItem(learnerStorageKey(userId), JSON.stringify(payload));
}
