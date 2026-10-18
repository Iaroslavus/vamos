export type GradeStatus = 'correct' | 'almost' | 'wrong';

export type GradeResult = {
  status: GradeStatus;
  /** Canonical expected answer shown to the learner. */
  correctAnswer: string;
  /** Short Russian note for near-misses (accent / typo). */
  note?: string;
};

export type GradeAnswerInput = {
  userAnswer: string;
  /** Primary correct answer (also used as `correctAnswer` in the result). */
  answer: string;
  /** Extra accepted variants (same meaning / alternate spelling). */
  accepted?: readonly string[];
};

const NOTE_MISSING_ACCENT = 'Почти верно: забыт акцент';
const NOTE_TYPO = 'Почти верно: небольшая опечатка';

/** Spanish inverted marks and common sentence punctuation stripped for compare. */
const PUNCTUATION_RE = /[¿¡.,;:!?…«»"'`´\-—–()/\\[\]{}]/gu;

/** Letters that differ only by a diacritic (Spanish-focused). */
const DIACRITIC_STRIP_RE = /[\u0300-\u036f]/g;

export function normalizeForCompare(input: string): string {
  return input
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(PUNCTUATION_RE, '')
    .replace(/\s+/g, ' ');
}

/** Same as normalize, then fold accents (café → cafe). */
export function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(DIACRITIC_STRIP_RE, '').normalize('NFC');
}

export function normalizeWithoutDiacritics(input: string): string {
  return stripDiacritics(normalizeForCompare(input));
}

/** Classic Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    const aChar = a.charAt(i - 1);
    for (let j = 1; j <= b.length; j += 1) {
      const cost = aChar === b.charAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    for (let j = 0; j <= b.length; j += 1) {
      prev[j] = curr[j]!;
    }
  }

  return prev[b.length]!;
}

function expectedList(answer: string, accepted: readonly string[] | undefined): string[] {
  const list = [answer, ...(accepted ?? [])];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of list) {
    const key = normalizeForCompare(item);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

/**
 * Token-wise typo check: each word longer than 4 letters may differ by
 * Levenshtein ≤ 1; shorter words must match exactly (after normalize).
 * Compared on diacritic-stripped forms so accent issues are handled separately.
 */
export function isWithinTypoTolerance(userNorm: string, expectedNorm: string): boolean {
  const userWords = normalizeWithoutDiacritics(userNorm).split(' ').filter(Boolean);
  const expectedWords = normalizeWithoutDiacritics(expectedNorm).split(' ').filter(Boolean);

  if (userWords.length !== expectedWords.length) {
    return false;
  }

  for (let i = 0; i < expectedWords.length; i += 1) {
    const expected = expectedWords[i]!;
    const actual = userWords[i]!;

    if (actual === expected) continue;

    if (expected.length <= 4) {
      return false;
    }

    if (levenshtein(actual, expected) > 1) {
      return false;
    }
  }

  return true;
}

function differsOnlyByDiacritics(user: string, expected: string): boolean {
  const userNorm = normalizeForCompare(user);
  const expectedNorm = normalizeForCompare(expected);
  if (userNorm === expectedNorm) return false;
  return normalizeWithoutDiacritics(user) === normalizeWithoutDiacritics(expected);
}

/**
 * Local answer check: normalize → exact/accepted → missing accent → 1-typo → wrong.
 */
export function gradeAnswer({ userAnswer, answer, accepted }: GradeAnswerInput): GradeResult {
  const correctAnswer = answer;
  const candidates = expectedList(answer, accepted);
  const userNorm = normalizeForCompare(userAnswer);

  if (userNorm.length === 0) {
    return { status: 'wrong', correctAnswer };
  }

  for (const candidate of candidates) {
    if (userNorm === normalizeForCompare(candidate)) {
      return { status: 'correct', correctAnswer };
    }
  }

  for (const candidate of candidates) {
    if (differsOnlyByDiacritics(userAnswer, candidate)) {
      return { status: 'almost', correctAnswer, note: NOTE_MISSING_ACCENT };
    }
  }

  for (const candidate of candidates) {
    if (isWithinTypoTolerance(userAnswer, candidate)) {
      return { status: 'almost', correctAnswer, note: NOTE_TYPO };
    }
  }

  return { status: 'wrong', correctAnswer };
}
