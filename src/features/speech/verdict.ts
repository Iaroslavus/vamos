import { colors } from '@/theme/tokens';

import type { WordMark } from './score';

export type SpeechVerdict = 'great' | 'almost' | 'again';

/** What the result says instead of a bare percent. */
export function speechVerdict(score: number): SpeechVerdict {
  if (score >= 85) return 'great';
  if (score >= 60) return 'almost';
  return 'again';
}

/** Green is clear, yellow is close, red was not recognized. */
export function wordMarkColor(mark: WordMark): string {
  if (mark === 'ok') return colors.teal;
  if (mark === 'close') return colors.saffronDeep;
  return colors.coralDeep;
}
