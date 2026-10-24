import { DAILY_GOAL_MINUTES, type DailyGoalMinutes } from '@/features/progress/streak';

export type LearningGoal = 'travel' | 'work' | 'relocation' | 'dele';

export const LEARNING_GOALS: readonly LearningGoal[] = ['travel', 'work', 'relocation', 'dele'];

export type LearnerProfile = {
  name: string | null;
  goal: LearningGoal | null;
  dailyMinutes: DailyGoalMinutes;
  preferencesAsked: boolean;
};

export const EMPTY_PROFILE: LearnerProfile = {
  name: null,
  goal: null,
  dailyMinutes: 10,
  preferencesAsked: false,
};

const NAME_MAX = 60;

/** Trimmed display name, or null when it is empty or longer than the profile column. */
export function parseDisplayName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > NAME_MAX) return null;
  return name;
}

export function isLearningGoal(value: string): value is LearningGoal {
  return (LEARNING_GOALS as readonly string[]).includes(value);
}

export function applyPatch(
  profile: LearnerProfile,
  patch: Partial<LearnerProfile>,
): LearnerProfile {
  const next: LearnerProfile = { ...profile, ...patch };
  if (patch.name !== undefined) {
    next.name = patch.name === null ? null : (parseDisplayName(patch.name) ?? profile.name);
  }
  if (
    patch.dailyMinutes !== undefined &&
    !(DAILY_GOAL_MINUTES as readonly number[]).includes(patch.dailyMinutes)
  ) {
    next.dailyMinutes = profile.dailyMinutes;
  }
  if (patch.goal !== undefined && patch.goal !== null && !isLearningGoal(patch.goal)) {
    next.goal = profile.goal;
  }
  return next;
}

/**
 * Local answers win once the learner has typed them.
 * A remote goal counts as “preferences asked” so a second device does not ask again.
 */
export function mergeProfiles(
  local: LearnerProfile,
  remote: LearnerProfile | null,
): LearnerProfile {
  if (!remote) return local;
  const preferencesAsked = local.preferencesAsked || remote.goal != null || remote.preferencesAsked;
  return {
    name: local.name ?? remote.name,
    goal: local.preferencesAsked ? local.goal : (remote.goal ?? local.goal),
    dailyMinutes: local.preferencesAsked ? local.dailyMinutes : remote.dailyMinutes,
    preferencesAsked,
  };
}

export function profilesEqual(a: LearnerProfile, b: LearnerProfile): boolean {
  return (
    a.name === b.name &&
    a.goal === b.goal &&
    a.dailyMinutes === b.dailyMinutes &&
    a.preferencesAsked === b.preferencesAsked
  );
}
