const MARKS = /\p{M}/gu;
/** Punctuation that should not change a search. Letters stay. */
const PUNCTUATION = /[¿¡?!.,…;:'"«»“”„()[\]{}<>/\\|_+=*#@~^`—–\-]/gu;

/**
 * Fold a search string: case, diacritics (é → e, ñ → n), opening marks,
 * and repeated spaces. The stored phrase is not changed.
 */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(MARKS, '')
    .toLocaleLowerCase('es')
    .replace(PUNCTUATION, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
