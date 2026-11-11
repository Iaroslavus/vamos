import { colors } from '@/theme/tokens';

/**
 * One color for the phrase and the score ring.
 * Yellow and coral use the darker token so the words stay readable on cream.
 */
export function speechScoreColor(score: number): string {
  if (score >= 80) return colors.teal;
  if (score >= 50) return colors.saffronDeep;
  return colors.coralDeep;
}
