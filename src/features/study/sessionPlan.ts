import { normalizeForCompare } from '@/features/lesson/grading';
import type { ReviewDirection, StoredCard } from '@/features/review/types';

import { cardIsHard } from './fsrs';
import type { LearnTask } from './learn';
import { ACCENT_PASS_SCORE } from './modes';
import {
  MATCH_BOARD_SIZE,
  QUICK5_LIMIT,
  type StudyDirectionSetting,
  type StudyExerciseKind,
  type StudyExerciseStep,
  type StudyFilter,
  type StudyFlashcardStep,
  type StudyMatchStep,
  type StudyMode,
  type StudyPromptKey,
  type StudySettings,
  type StudySpeakStep,
  type StudyStep,
  type StudyUnit,
} from './types';

const CHOICES = 4;

const REVIEW_CYCLE = ['select_translation', 'listen_select', 'type_translation'] as const;
const TEST_CYCLE = ['type_translation', 'select_translation', 'listen_select'] as const;

type Gloss = { es: string; tr: string; audio: string | null };
type Side = 'es' | 'tr';

/**
 * Steps for one study session.
 * Only units the learner has already met in a lesson intro are included.
 * Choice steps fall back to typing when the folder has no other option.
 */
export function sessionPlan(
  mode: StudyMode,
  items: readonly StudyUnit[],
  settings: StudySettings,
): StudyStep[] {
  const known = items.filter((item) => item.introduced && hasText(item));
  const selected = selectUnits(known, settings, mode);
  if (selected.length === 0) return [];

  switch (mode) {
    case 'flashcards':
      return selected.map((unit, index) => flashcardStep(unit, index, settings));
    case 'match':
      return matchBoards(selected, settings);
    case 'speak':
      return selected.map((unit, index) => speakStep(unit, index, settings));
    case 'spell':
      return selected.map((unit, index) =>
        exerciseStep(unit, index, 'type_translation', known, settings, 'spell', `spell-${index}`),
      );
    case 'learn':
      return learnSteps(selected, known, settings);
    case 'test':
      return selected.map((unit, index) =>
        exerciseStep(
          unit,
          index,
          TEST_CYCLE[index % TEST_CYCLE.length] ?? 'type_translation',
          known,
          settings,
          'test',
          `test-${index}`,
        ),
      );
    case 'quick5':
      return selected.map((unit, index) =>
        exerciseStep(
          unit,
          index,
          REVIEW_CYCLE[index % REVIEW_CYCLE.length] ?? 'select_translation',
          known,
          settings,
          'quick5',
          `quick5-${index}`,
        ),
      );
    case 'review':
      return selected.map((unit, index) =>
        exerciseStep(
          unit,
          index,
          REVIEW_CYCLE[index % REVIEW_CYCLE.length] ?? 'select_translation',
          known,
          settings,
          'review',
          `review-${index}`,
        ),
      );
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}

/** Introduced units that match the filter and the mode's length cap. */
export function selectStudyUnits(
  items: readonly StudyUnit[],
  settings: StudySettings,
  mode: StudyMode,
): StudyUnit[] {
  const known = items.filter((item) => item.introduced && hasText(item));
  return selectUnits(known, settings, mode);
}

export function buildStudyUnits(input: {
  itemIds: readonly string[];
  cards: readonly StoredCard[];
  now: Date;
  gloss: (itemId: string) => Gloss;
}): StudyUnit[] {
  const byItem = new Map<string, { recognition?: StoredCard; recall?: StoredCard }>();
  for (const card of input.cards) {
    const slot = byItem.get(card.itemId) ?? {};
    if (card.direction === 'ru_to_es') slot.recall = card;
    else slot.recognition = card;
    byItem.set(card.itemId, slot);
  }

  const nowMs = input.now.getTime();
  const seen = new Set<string>();
  const units: StudyUnit[] = [];

  for (const raw of input.itemIds) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const gloss = input.gloss(id);
    const slot = byItem.get(id);
    const recognition = slot?.recognition;
    const recall = slot?.recall;
    const introduced = recognition != null;
    units.push({
      id,
      es: gloss.es,
      tr: gloss.tr,
      audio: gloss.audio,
      introduced,
      state: recognition ? asState(recognition.state) : null,
      due: [recognition, recall].some((card) => card != null && dueMs(card.due) <= nowMs),
      hard: [recognition, recall].some((card) => card != null && cardIsHard(card)),
      recall: recall != null,
    });
  }

  return units;
}

function selectUnits(
  known: readonly StudyUnit[],
  settings: StudySettings,
  mode: StudyMode,
): StudyUnit[] {
  const filtered = known.filter((unit) => matchesFilter(unit, settings.filter));
  const limit = mode === 'quick5' ? Math.min(QUICK5_LIMIT, settings.count) : settings.count;
  return filtered.slice(0, Math.max(0, limit));
}

function matchesFilter(unit: StudyUnit, filter: StudyFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'due':
      return unit.due;
    case 'hard':
      return unit.hard;
    case 'unlearned':
      return unit.state !== 2;
    default: {
      const exhaustive: never = filter;
      return exhaustive;
    }
  }
}

/**
 * One opening prompt per unit.
 * The learn screen does not walk this list. It runs the level queue.
 * The list only tells the launcher whether the folder has something to study.
 */
function learnSteps(
  selected: readonly StudyUnit[],
  pool: readonly StudyUnit[],
  settings: StudySettings,
): StudyStep[] {
  return selected.map((unit, index) =>
    planLearnStep(unit, pool, settings, 'select', `learn-${index}`, index),
  );
}

/** The prompt a learn unit shows at its current level. */
export function planLearnStep(
  unit: StudyUnit,
  pool: readonly StudyUnit[],
  settings: StudySettings,
  task: LearnTask,
  id: string,
  index: number,
): StudyStep {
  if (task === 'speak') {
    return { ...speakStep(unit, index, settings), id };
  }
  if (task === 'type_reverse') {
    const facing = studyDirectionAt(settings.direction, index);
    return typeStep(unit, facing === 'es_to_ru' ? 'ru_to_es' : 'es_to_ru', {
      id,
      autoplay: false,
      itemId: unit.id,
      phraseEs: unit.es,
      phraseTr: unit.tr,
      audio: unit.audio,
      playEs: false,
    });
  }
  return exerciseStep(
    unit,
    index,
    task === 'select' ? 'select_translation' : 'type_translation',
    pool,
    settings,
    'learn',
    id,
  );
}

function exerciseStep(
  unit: StudyUnit,
  index: number,
  ask: StudyExerciseKind,
  pool: readonly StudyUnit[],
  settings: StudySettings,
  mode: StudyMode,
  id: string,
): StudyExerciseStep {
  const direction = directionFor(settings.direction, index);
  let kind: StudyExerciseKind = ask;
  if (kind === 'listen_select' && direction === 'ru_to_es') kind = 'type_translation';

  const base = {
    id,
    autoplay: settings.autoplay,
    itemId: unit.id,
    phraseEs: unit.es,
    phraseTr: unit.tr,
    audio: unit.audio,
    playEs: mode === 'spell' && settings.autoplay,
  };

  if (kind === 'listen_select') {
    const options = choices(pool, unit.tr, 'tr', index, `${unit.id}:listen`);
    if (options.length >= 2) {
      return {
        ...base,
        type: 'listen_select',
        direction: 'es_to_ru',
        promptKey: 'listen',
        prompt: unit.es,
        options,
        answer: unit.tr,
      };
    }
    kind = 'type_translation';
  }

  if (kind === 'select_translation') {
    const side: Side = direction === 'es_to_ru' ? 'tr' : 'es';
    const answer = unit[side];
    const options = choices(pool, answer, side, index, `${unit.id}:select`);
    if (options.length >= 2) {
      return {
        ...base,
        type: 'select_translation',
        direction,
        promptKey: direction === 'es_to_ru' ? 'selectEs' : 'selectRu',
        prompt: direction === 'es_to_ru' ? unit.es : unit.tr,
        options,
        answer,
      };
    }
    kind = 'type_translation';
  }

  return typeStep(unit, direction, base);
}

function typeStep(
  unit: StudyUnit,
  direction: ReviewDirection,
  base: Omit<
    StudyExerciseStep,
    'type' | 'direction' | 'promptKey' | 'prompt' | 'options' | 'answer'
  >,
): StudyExerciseStep {
  const promptKey: StudyPromptKey = direction === 'es_to_ru' ? 'typeEs' : 'typeRu';
  return {
    ...base,
    type: 'type_translation',
    direction,
    promptKey,
    prompt: direction === 'es_to_ru' ? unit.es : unit.tr,
    options: [],
    answer: direction === 'es_to_ru' ? unit.tr : unit.es,
  };
}

function flashcardStep(
  unit: StudyUnit,
  index: number,
  settings: StudySettings,
): StudyFlashcardStep {
  const direction = directionFor(settings.direction, index);
  const front = direction === 'ru_to_es' ? unit.tr : unit.es;
  const back = direction === 'ru_to_es' ? unit.es : unit.tr;
  return {
    id: `flashcards-${index}`,
    type: 'flashcard',
    autoplay: settings.autoplay,
    itemId: unit.id,
    direction,
    front,
    back,
    phraseEs: unit.es,
    phraseTr: unit.tr,
    audio: unit.audio,
  };
}

function speakStep(unit: StudyUnit, index: number, settings: StudySettings): StudySpeakStep {
  return {
    id: `speak-${index}`,
    type: 'speak_repeat',
    autoplay: settings.autoplay,
    itemId: unit.id,
    direction: unit.recall ? 'ru_to_es' : 'es_to_ru',
    promptKey: 'speak',
    promptEs: unit.es,
    phraseTr: unit.tr,
    audio: unit.audio,
    accentStrictness: settings.accentStrictness,
    passScore: ACCENT_PASS_SCORE[settings.accentStrictness],
  };
}

/**
 * Boards of up to {@link MATCH_BOARD_SIZE} pairs.
 * Mixed direction keeps Spanish on the left so a board does not flip sides mid-way.
 * A single leftover item cannot make a board.
 */
function matchBoards(units: readonly StudyUnit[], settings: StudySettings): StudyMatchStep[] {
  const spanishOnLeft = settings.direction !== 'ru_to_es';
  const boards: StudyMatchStep[] = [];
  let cursor = 0;
  let board = 0;

  while (cursor < units.length) {
    const remaining = units.length - cursor;
    if (remaining < 2) break;
    const size = Math.min(MATCH_BOARD_SIZE, remaining);
    const chunk = units.slice(cursor, cursor + size);
    cursor += size;
    if (chunk.length < 2) break;
    boards.push({
      id: `match-${board}`,
      type: 'match_pairs',
      autoplay: settings.autoplay,
      promptKey: 'match',
      itemIds: chunk.map((unit) => unit.id),
      pairs: chunk.map((unit) => ({
        itemId: unit.id,
        es: unit.es,
        tr: unit.tr,
        left: spanishOnLeft ? unit.es : unit.tr,
        right: spanishOnLeft ? unit.tr : unit.es,
      })),
    });
    board += 1;
  }

  return boards;
}

/** Direction of unit `index`. Mixed alternates, starting with Spanish → translation. */
export function studyDirectionAt(setting: StudyDirectionSetting, index: number): ReviewDirection {
  if (setting === 'ru_to_es') return 'ru_to_es';
  if (setting === 'mixed') return index % 2 === 0 ? 'es_to_ru' : 'ru_to_es';
  return 'es_to_ru';
}

function directionFor(setting: StudyDirectionSetting, index: number): ReviewDirection {
  return studyDirectionAt(setting, index);
}

function choices(
  pool: readonly StudyUnit[],
  answer: string,
  side: Side,
  start: number,
  seed: string,
): string[] {
  const extras = distractors(pool, answer, side, start);
  if (extras.length === 0) return [];
  return withAnswer(answer, extras, seed);
}

function distractors(
  pool: readonly StudyUnit[],
  answer: string,
  side: Side,
  start: number,
): string[] {
  const answerKey = normalizeForCompare(answer);
  const seen = new Set<string>();
  const texts: string[] = [];

  for (const word of [...pool].sort((left, right) => left.id.localeCompare(right.id))) {
    const text = word[side];
    const key = normalizeForCompare(text);
    if (!key || key === answerKey || seen.has(key)) continue;
    seen.add(key);
    texts.push(text);
  }

  const take = Math.min(CHOICES - 1, texts.length);
  const picked: string[] = [];
  for (let step = 0; step < take; step += 1) {
    picked.push(texts[(start + step) % texts.length]!);
  }
  return picked;
}

function withAnswer(answer: string, extras: readonly string[], seed: string): string[] {
  const options = [...extras];
  options.splice(mix(seed) % (options.length + 1), 0, answer);
  return options;
}

function mix(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hasText(unit: StudyUnit): boolean {
  return unit.es.trim().length > 0 && unit.tr.trim().length > 0;
}

function asState(value: number): StudyUnit['state'] {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  return 0;
}

function dueMs(due: string): number {
  const parsed = Date.parse(due);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}
