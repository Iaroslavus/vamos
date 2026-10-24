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

export type LearnerRemote = {
  fetch(userId: string): Promise<LearnerProfile | null>;
  update(userId: string, profile: LearnerProfile): Promise<void>;
};

export type LearnerRepository = {
  read(userId: string): Promise<LearnerProfile>;
  save(userId: string, patch: Partial<LearnerProfile>): Promise<LearnerProfile>;
};

type CreateLearnerRepositoryInput = {
  storage: KeyValueStorage;
  remote: LearnerRemote;
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
}: CreateLearnerRepositoryInput): LearnerRepository {
  return {
    async read(userId) {
      const local = await load(storage, userId);
      let remoteProfile: LearnerProfile | null = null;
      try {
        remoteProfile = await remote.fetch(userId);
      } catch {
        remoteProfile = null;
      }
      const merged = mergeProfiles(local, remoteProfile);
      if (!profilesEqual(local, merged)) await store(storage, userId, merged);
      if (remoteProfile && !profilesEqual(merged, remoteProfile)) {
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
