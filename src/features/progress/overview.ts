export const SKILLS = ['vocabulary', 'grammar', 'listening', 'speaking'] as const;
export type SkillId = (typeof SKILLS)[number];

export type SkillBar = {
  id: SkillId;
  progress: number;
};

/**
 * Nothing is due until FSRS review cards drive this counter.
 * Keep the value at 0 rather than inventing a queue.
 */
export const REVIEWS_DUE = 0;

/** Skill scores stay at 0 until exercises are tagged by skill. */
export function skillBars(): SkillBar[] {
  return SKILLS.map((id) => ({ id, progress: 0 }));
}
