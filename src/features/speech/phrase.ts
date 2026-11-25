import { normalizeForCompare } from '@/features/lesson/grading';

import type { ScoredWord, WordMark } from './score';

export type PhrasePiece = {
  text: string;
  word: string | null;
  mark: WordMark | null;
};

/**
 * Keep ¿?¡! on the tokens, and paint each word from the score.
 * Tokens and scored words line up after punctuation is ignored.
 */
export function decoratePhrase(phrase: string, words: readonly ScoredWord[]): PhrasePiece[] {
  const tokens = phrase
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
  let cursor = 0;
  return tokens.map((text) => {
    const key = normalizeForCompare(text);
    const scored = words[cursor];
    const matches = Boolean(
      scored && key.length > 0 && normalizeForCompare(scored.expected) === key,
    );
    if (!matches || !scored) {
      return { text, word: key.length > 0 ? text : null, mark: null };
    }
    cursor += 1;
    return { text, word: scored.expected, mark: scored.mark };
  });
}
