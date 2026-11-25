import { normalizeForCompare } from './grading';

const EDGE = /[¿¡.,;:!?…«»"'`´\-—–()[\]]/u;

/** Punctuation stuck to a tile. Braces stay, so `{name}` is kept whole. */
export function stripEdgePunctuation(token: string): string {
  let start = 0;
  let end = token.length;
  while (start < end && EDGE.test(token.charAt(start))) start += 1;
  while (end > start && EDGE.test(token.charAt(end - 1))) end -= 1;
  return token.slice(start, end);
}

/**
 * A name keeps its capital. The first word of a sentence does not:
 * that capital is added back only on the assembled line.
 */
export function isProperName(token: string, index: number): boolean {
  const bare = stripEdgePunctuation(token);
  if (bare === '{name}') return true;
  if (!bare || index === 0) return false;
  return /^\p{Lu}/u.test(bare);
}

/** Bank tile: lower case, no punctuation, except a proper name. */
export function tileLabel(token: string, proper: boolean): string {
  const bare = stripEdgePunctuation(token);
  if (!bare) return token.trim();
  if (proper) return bare;
  return bare.toLocaleLowerCase('es');
}

export function phraseTileLabels(tokens: readonly string[]): string[] {
  return tokens.map((token, index) => tileLabel(token, isProperName(token, index)));
}

/**
 * Capitals and ¿?¡! live on the assembled line.
 * A prefix of the canonical phrase keeps that slice; a wrong pick stays as tiles.
 */
export function assembledPhrase(picked: readonly string[], canonical: string): string {
  const tokens = canonical
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
  const keys = tokens.map((token) => normalizeForCompare(token));
  const pickedKeys = picked.map((token) => normalizeForCompare(token));
  if (pickedKeys.length === 0) return '';
  const prefix = pickedKeys.every((key, index) => key.length > 0 && key === keys[index]);
  if (!prefix) return picked.join(' ');
  return tokens.slice(0, pickedKeys.length).join(' ');
}
