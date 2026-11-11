import { pronunciationHints, type PronunciationRule } from './rules';

/**
 * One pronunciation rule for this miss.
 * Prefer a rule that applies to the missed word; otherwise the first rule in the phrase.
 */
export function pronunciationCoach(
  phrase: string,
  problemWord: string | null,
): PronunciationRule | null {
  const rules = pronunciationHints(phrase);
  if (rules.length === 0) return null;
  if (problemWord) {
    const focused = rules.find((rule) => rule.applies(problemWord));
    if (focused) return focused;
  }
  return rules[0] ?? null;
}
