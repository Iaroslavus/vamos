import type { LessonExerciseItem, MatchPair } from './store';

/** Learner-facing separator. Never `::` or `|`, those stay inside grading. */
export const PHRASE_DASH = ' — ';

const WRONG_MARK = ' ✗';

export type AnswerLine = {
  text: string;
  wrong: boolean;
};

export type FormattedAnswer = {
  lines: readonly AnswerLine[];
  /** Joined lines. Safe to show a learner. */
  text: string;
  phraseEs: string;
  phraseTr: string;
  itemIds: readonly string[];
  audio: string | null;
};

export function formatPairLine(left: string, right: string): string {
  return `${left}${PHRASE_DASH}${right}`;
}

/**
 * Human answer for the result sheet.
 * Match pairs become one line per pair. A wrong attempt is marked on that line.
 */
export function formatExerciseAnswer(
  exercise: LessonExerciseItem,
  wrongKeys: readonly string[] = [],
): FormattedAnswer {
  const phrase = phraseOf(exercise);
  const lines =
    exercise.type === 'match_pairs'
      ? pairLines(exercise.pairs, new Set(wrongKeys))
      : phraseLines(phrase.es, phrase.tr);

  return {
    lines,
    text: lines.map((line) => line.text).join('\n'),
    phraseEs: phrase.es,
    phraseTr: phrase.tr,
    itemIds: itemIdsOf(exercise),
    audio: audioOf(exercise),
  };
}

function pairLines(pairs: readonly MatchPair[], wrong: ReadonlySet<string>): AnswerLine[] {
  return pairs.map((pair) => {
    const missed = wrong.has(pair.left);
    const text = formatPairLine(pair.left, pair.right);
    return { text: missed ? `${text}${WRONG_MARK}` : text, wrong: missed };
  });
}

function phraseLines(es: string, tr: string): AnswerLine[] {
  if (!es && !tr) return [];
  const text = es && tr ? formatPairLine(es, tr) : es || tr;
  return [{ text, wrong: false }];
}

function phraseOf(exercise: LessonExerciseItem): { es: string; tr: string } {
  if (exercise.phraseEs || exercise.phraseTr) {
    return { es: exercise.phraseEs ?? '', tr: exercise.phraseTr ?? '' };
  }

  switch (exercise.type) {
    case 'select_translation':
      if (exercise.prompt === exercise.answer) return { es: exercise.prompt, tr: '' };
      return { es: exercise.prompt, tr: exercise.answer };
    case 'type_translation':
      return exercise.direction === 'es_to_ru'
        ? { es: exercise.prompt, tr: exercise.answer }
        : { es: exercise.answer, tr: exercise.prompt };
    case 'listen_select':
      return { es: exercise.speakText, tr: exercise.answer };
    case 'build_sentence':
      return { es: exercise.answer, tr: '' };
    case 'fill_gap':
      return { es: exercise.sentence_es.replace('___', exercise.answer), tr: '' };
    case 'match_pairs':
      return {
        es: exercise.pairs.map((pair) => pair.left).join('. '),
        tr: exercise.pairs.map((pair) => pair.right).join('. '),
      };
    default: {
      const exhaustive: never = exercise;
      return exhaustive;
    }
  }
}

function itemIdsOf(exercise: LessonExerciseItem): readonly string[] {
  if (exercise.itemIds && exercise.itemIds.length > 0) return exercise.itemIds;
  if (exercise.type === 'listen_select' && exercise.itemId) return [exercise.itemId];
  return [];
}

function audioOf(exercise: LessonExerciseItem): string | null {
  return exercise.audio ?? null;
}
