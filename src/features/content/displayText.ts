const LEADING_MARKS = /^[\s¿¡]*/u;
const LETTER = /^\p{L}/u;
const PHRASE_DASH = ' — ';
const MISS_MARK = ' ✗';

/**
 * First letter of a word or phrase, for cards, options, lists, and summaries.
 * Opening ¿ and ¡ stay put: the letter after them is the one that rises.
 * Content files stay as written. Answer checks still ignore case.
 */
/**
 * Spanish as the learner should read it.
 * Opening ¿ ¡ and closing ? ! stay. Only the first letter is raised.
 * Comparison still goes through `normalizeForCompare`, never through here.
 * `{name}` becomes the profile name, or Ana when the caller has not chosen one.
 */
export function displayEs(value: string, name?: string | null): string {
  const speaker = name?.trim() || 'Ana';
  const filled = value.includes('{name}') ? value.replaceAll('{name}', speaker) : value;
  return displayText(filled);
}

export function displayText(value: string): string {
  const lead = LEADING_MARKS.exec(value)?.[0] ?? '';
  const rest = value.slice(lead.length);
  const letter = LETTER.exec(rest)?.[0];
  if (!letter) return value;
  const upper = letter.toLocaleUpperCase('es');
  if (upper === letter) return value;
  return lead + upper + rest.slice(letter.length);
}

/**
 * `displayText` on each phrase of a result line.
 * A trailing miss mark and the dash between a pair stay as they are.
 */
export function displayLine(value: string): string {
  const missed = value.endsWith(MISS_MARK);
  const body = missed ? value.slice(0, -MISS_MARK.length) : value;
  const shown = body
    .split(PHRASE_DASH)
    .map((part) => displayEs(part))
    .join(PHRASE_DASH);
  return missed ? `${shown}${MISS_MARK}` : shown;
}
