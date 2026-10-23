export const SKILLS = ['vocabulary', 'grammar', 'listening', 'speaking'] as const;
export type SkillId = (typeof SKILLS)[number];

export type SkillBar = {
  id: SkillId;
  progress: number;
};

/** Shown before the review queue has been read. An empty deck is also zero. */
export const REVIEWS_DUE = 0;

/** Skill scores stay at 0 until exercises are tagged by skill. */
export function skillBars(): SkillBar[] {
  return SKILLS.map((id) => ({ id, progress: 0 }));
}
