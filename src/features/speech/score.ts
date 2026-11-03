import { levenshtein, normalizeForCompare, stripDiacritics } from '@/features/lesson/grading';

/** Share of a perfect reading required before the phrase counts as understood. */
export const SPEECH_PASS_SCORE = 70;

const WORD_WEIGHT = {
  ok: 1,
  accent: 0.85,
  near: 0.5,
} as const;

const ALIGN_POINT = {
  ok: 2,
  close: 1,
  miss: 0,
} as const;

/** A word longer than this may be off by one edit and still count as close. */
const TYPO_MIN_LENGTH = 4;

/**
 * Best-hypothesis confidence required before an exact word counts as ok.
 * A negative value means the recognizer did not report a confidence.
 */
export const SPEECH_CONFIDENCE_MIN = 0.6;

/** A listed neighbor within this many edits belongs to that reference word. */
const CONFUSABLE_DISTANCE = 2;

/** One or two words are too short for the recognizer to separate from a neighbor. */
export function needsSelfCompare(phrase: string): boolean {
  const count = speechWords(phrase).length;
  return count >= 1 && count <= 2;
}

export type SpeechAlternative = {
  transcript: string;
  confidence: number;
};

/** N-best metadata. Omit it when the caller only has a plain transcript. */
export type SpeechScoreInput = {
  /** 0–1 from the best hypothesis. Negative or omitted when it was not reported. */
  confidence?: number;
  alternatives?: readonly SpeechAlternative[];
  confusables?: readonly string[];
};

const EDGE_PUNCTUATION = /[¿¡.,;:!?…«»"'`´\-—–()[\]{}]/u;

export type WordMark = 'ok' | 'close' | 'miss';
export type CloseReason = 'accent' | 'near' | 'uncertain' | 'confused';

export type ScoredWord = {
  /** Token from the reference, without surrounding punctuation. */
  expected: string;
  /** Aligned token from the recognizer, or null when the word was dropped. */
  heard: string | null;
  mark: WordMark;
  reason: CloseReason | null;
};

export type SpeechScore = {
  words: ScoredWord[];
  /** 0–100. ok = 1, accent-only = 0.85, one-edit near miss = 0.5, miss = 0. */
  score: number;
  /** First word that is not an exact match. Drives the hint. */
  problem: ScoredWord | null;
};

export type SpeechOption = {
  id: string;
  es: string;
};

type ComparedWord = {
  mark: WordMark;
  reason: CloseReason | null;
  points: number;
};

type AlignStep = 'pair' | 'drop-heard' | 'drop-expected';

function cleanToken(token: string): string {
  let start = 0;
  let end = token.length;
  while (start < end && EDGE_PUNCTUATION.test(token.charAt(start))) start += 1;
  while (end > start && EDGE_PUNCTUATION.test(token.charAt(end - 1))) end -= 1;
  return token.slice(start, end);
}

/** Reference words in order, keeping accents for display. */
export function speechWords(input: string): string[] {
  return input
    .trim()
    .split(/\s+/)
    .map(cleanToken)
    .filter((word) => normalizeForCompare(word).length > 0);
}

function compareWord(expected: string, heard: string): ComparedWord {
  const expectedNorm = normalizeForCompare(expected);
  const heardNorm = normalizeForCompare(heard);
  if (expectedNorm.length === 0 || heardNorm.length === 0) {
    return { mark: 'miss', reason: null, points: ALIGN_POINT.miss };
  }
  if (expectedNorm === heardNorm) {
    return { mark: 'ok', reason: null, points: ALIGN_POINT.ok };
  }

  const expectedPlain = stripDiacritics(expectedNorm);
  const heardPlain = stripDiacritics(heardNorm);
  if (expectedPlain === heardPlain) {
    return { mark: 'close', reason: 'accent', points: ALIGN_POINT.close };
  }
  if (expectedPlain.length > TYPO_MIN_LENGTH && levenshtein(expectedPlain, heardPlain) <= 1) {
    return { mark: 'close', reason: 'near', points: ALIGN_POINT.close };
  }
  return { mark: 'miss', reason: null, points: ALIGN_POINT.miss };
}

function wordWeight(word: ScoredWord): number {
  if (word.mark === 'ok') return WORD_WEIGHT.ok;
  if (word.reason === 'accent') return WORD_WEIGHT.accent;
  if (word.mark === 'close') return WORD_WEIGHT.near;
  return 0;
}

function toPercent(words: readonly ScoredWord[]): number {
  if (words.length === 0) return 0;
  const earned = words.reduce((sum, word) => sum + wordWeight(word), 0);
  return Math.round((earned / words.length) * 100);
}

/**
 * Align heard tokens to the reference. Extra heard words are skipped.
 * A monotonic alignment keeps order: a full swap cannot mark both words ok.
 */
function alignWords(expected: readonly string[], heard: readonly string[]): ScoredWord[] {
  const rowCount = expected.length + 1;
  const columnCount = heard.length + 1;
  const points = Array.from({ length: rowCount }, () => Array<number>(columnCount).fill(0));
  const choice = Array.from({ length: rowCount }, () =>
    Array<AlignStep>(columnCount).fill('drop-expected'),
  );

  for (let column = 1; column < columnCount; column += 1) {
    const header = choice[0];
    if (header) header[column] = 'drop-heard';
  }

  for (let row = 1; row < rowCount; row += 1) {
    for (let column = 0; column < columnCount; column += 1) {
      const previousRow = points[row - 1];
      const currentRow = points[row];
      if (!previousRow || !currentRow) continue;

      let best = previousRow[column] ?? 0;
      let picked: AlignStep = 'drop-expected';

      if (column > 0) {
        const dropped = currentRow[column - 1] ?? 0;
        if (dropped > best || (dropped === best && picked === 'drop-expected')) {
          best = dropped;
          picked = 'drop-heard';
        }
      }

      if (column > 0) {
        const compared = compareWord(expected[row - 1] ?? '', heard[column - 1] ?? '');
        const paired = (previousRow[column - 1] ?? 0) + compared.points;
        if (paired > best || (paired === best && compared.mark !== 'miss')) {
          best = paired;
          picked = 'pair';
        }
      }

      currentRow[column] = best;
      const choices = choice[row];
      if (choices) choices[column] = picked;
    }
  }

  const reversed: ScoredWord[] = [];
  let row = expected.length;
  let column = heard.length;
  let guard = expected.length + heard.length + 1;
  while ((row > 0 || column > 0) && guard > 0) {
    guard -= 1;
    const picked = row === 0 ? 'drop-heard' : (choice[row]?.[column] ?? 'drop-expected');
    if (picked === 'pair' && row > 0 && column > 0) {
      const compared = compareWord(expected[row - 1] ?? '', heard[column - 1] ?? '');
      reversed.push({
        expected: expected[row - 1] ?? '',
        heard: heard[column - 1] ?? '',
        mark: compared.mark,
        reason: compared.reason,
      });
      row -= 1;
      column -= 1;
      continue;
    }
    if (picked === 'drop-heard' && column > 0) {
      column -= 1;
      continue;
    }
    if (row > 0) {
      reversed.push({
        expected: expected[row - 1] ?? '',
        heard: null,
        mark: 'miss',
        reason: null,
      });
      row -= 1;
      continue;
    }
    column -= 1;
  }

  while (row > 0) {
    reversed.push({
      expected: expected[row - 1] ?? '',
      heard: null,
      mark: 'miss',
      reason: null,
    });
    row -= 1;
  }

  return reversed.reverse();
}

function plainWord(word: string): string {
  return stripDiacritics(normalizeForCompare(word));
}

/** True when an n-best line contains a listed neighbor of this reference word. */
function wordConfused(
  expected: string,
  alternatives: readonly SpeechAlternative[],
  confusables: readonly string[],
): boolean {
  const expectedPlain = plainWord(expected);
  if (!expectedPlain) return false;
  const neighbors = new Set(
    confusables.map(plainWord).filter((item) => item.length > 0 && item !== expectedPlain),
  );
  if (neighbors.size === 0) return false;

  for (const alternative of alternatives) {
    for (const token of speechWords(alternative.transcript)) {
      const heard = plainWord(token);
      if (!neighbors.has(heard)) continue;
      if (levenshtein(expectedPlain, heard) <= CONFUSABLE_DISTANCE) return true;
    }
  }
  return false;
}

/**
 * An exact word stays ok only when the best hypothesis is confident
 * and no alternative is a listed neighbor of that word.
 */
function applyRecognition(words: ScoredWord[], recognition?: SpeechScoreInput): ScoredWord[] {
  if (!recognition) return words;
  const confidence = recognition.confidence;
  const lowConfidence =
    confidence !== undefined &&
    Number.isFinite(confidence) &&
    confidence >= 0 &&
    confidence < SPEECH_CONFIDENCE_MIN;
  const alternatives = recognition.alternatives ?? [];
  const confusables = recognition.confusables ?? [];

  return words.map((word) => {
    if (word.mark !== 'ok') return word;
    if (wordConfused(word.expected, alternatives, confusables)) {
      return { ...word, mark: 'close', reason: 'confused' };
    }
    if (lowConfidence) return { ...word, mark: 'close', reason: 'uncertain' };
    return word;
  });
}

/**
 * Compare a recognition transcript with the reference, word by word.
 * Pass `recognition` when n-best lines and a confidence are available.
 */
export function scoreSpeech(
  expected: string,
  heard: string,
  recognition?: SpeechScoreInput,
): SpeechScore {
  const words = applyRecognition(
    alignWords(speechWords(expected), speechWords(heard)),
    recognition,
  );
  return {
    words,
    score: toPercent(words),
    problem: words.find((word) => word.mark !== 'ok') ?? null,
  };
}

/** Understood: nothing was missed, and the weighted score clears the bar. */
export function isSpeechPass(result: SpeechScore): boolean {
  if (result.words.length === 0) return false;
  if (result.words.some((word) => word.mark === 'miss')) return false;
  return result.score >= SPEECH_PASS_SCORE;
}

/**
 * Best option the learner seems to have said.
 * Returns null when none of the lines is understood.
 */
export function matchSpokenOption(
  heard: string,
  options: readonly SpeechOption[],
): { id: string; score: number } | null {
  let best: { id: string; score: number } | null = null;
  for (const option of options) {
    const result = scoreSpeech(option.es, heard);
    if (!isSpeechPass(result)) continue;
    if (!best || result.score > best.score) best = { id: option.id, score: result.score };
  }
  return best;
}

/** Russian gloss of a reference word, when the unit splits the phrase into parts. */
export function glossForWord(
  word: string,
  parts: readonly { es: string; ru: string }[],
): string | null {
  const key = normalizeForCompare(word);
  if (!key) return null;
  const part = parts.find((item) => normalizeForCompare(item.es) === key);
  return part?.ru ?? null;
}
