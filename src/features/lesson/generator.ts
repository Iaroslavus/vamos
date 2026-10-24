import type {
  DialogLine,
  ExerciseType,
  Item,
  Lesson,
  LessonOverride,
} from '@/features/content/schema';
import { normalizeForCompare } from '@/features/lesson/grading';

/** Screen count for a generated lesson, including one intro card per new unit. */
export const LESSON_STEP_MIN = 18;
export const LESSON_STEP_MAX = 26;

const LESSON_STEP_TARGET = 22;
/** Recognition + assembly steps kept even on the shortest lesson. */
const MIN_PRACTICE = 5;
const CHOICE_DISTRACTORS = 3;

const PROMPT = {
  listen: 'Что вы слышите?',
  match: 'Соедините пары',
  select: 'Выберите перевод',
  build: 'Составьте фразу',
  gap: 'Вставьте пропущенное слово',
  recall: 'Напишите по-испански',
  speak: 'Повторите вслух',
} as const;

export const LESSON_PHASES = ['intro', 'recognize', 'build', 'recall', 'speak', 'dialog'] as const;
export type LessonPhase = (typeof LESSON_PHASES)[number];

type StepRefs = {
  id: string;
  /** Units this step teaches or asks for. */
  itemIds: readonly string[];
  /** Other units shown as options or extra tiles. */
  distractorIds: readonly string[];
};

export type IntroStep = StepRefs & {
  type: 'intro';
  itemId: string;
};

export type ListenSelectStep = StepRefs & {
  type: 'listen_select';
  prompt_ru: string;
  /** Spanish played from `audio`, or spoken with TTS when audio is missing. */
  speakText: string;
  audio: string | null;
  options: readonly string[];
  answer: string;
};

export type MatchPairsStep = StepRefs & {
  type: 'match_pairs';
  prompt_ru: string;
  pairs: readonly { left: string; right: string }[];
};

export type SelectTranslationStep = StepRefs & {
  type: 'select_translation';
  prompt_ru: string;
  prompt: string;
  options: readonly string[];
  answer: string;
};

export type BuildSentenceStep = StepRefs & {
  type: 'build_sentence';
  prompt_ru: string;
  tiles: readonly string[];
  answer: string;
  accepted?: readonly string[];
};

export type FillGapStep = StepRefs & {
  type: 'fill_gap';
  prompt_ru: string;
  sentence_es: string;
  answer: string;
  options?: readonly string[];
};

export type TypeTranslationStep = StepRefs & {
  type: 'type_translation';
  prompt_ru: string;
  prompt: string;
  direction: 'ru_to_es';
  answer: string;
};

export type SpeakRepeatStep = StepRefs & {
  type: 'speak_repeat';
  prompt_ru: string;
  prompt_es: string;
  audio: string | null;
};

export type DialogStep = StepRefs & {
  type: 'dialog';
  lines: readonly DialogLine[];
};

export type ListenTypeStep = StepRefs & {
  type: 'listen_type';
  prompt_ru: string;
  speakText: string;
  audio: string | null;
  answer: string;
};

/** Override kinds that name an exercise without enough fields to build one. */
export type AuthoredStep = StepRefs & {
  type: 'conjugate' | 'reading_comprehension' | 'free_writing' | 'roleplay';
  prompt_ru: string;
  itemId?: string;
};

export type LessonStep =
  | IntroStep
  | ListenSelectStep
  | MatchPairsStep
  | SelectTranslationStep
  | BuildSentenceStep
  | FillGapStep
  | TypeTranslationStep
  | SpeakRepeatStep
  | DialogStep
  | ListenTypeStep
  | AuthoredStep;

export type GenerateLessonStepsInput = {
  lesson: Lesson;
  /** Lookup for every id the lesson, the dialog, or `seen` references. */
  items: readonly Item[];
  /** Units already taught in earlier lessons of this topic. */
  seen?: readonly Item[];
  /** Same seed always yields the same steps. Defaults to the lesson id. */
  seed?: string;
};

type Rng = {
  next: () => number;
  /** Integer in `[0, max)`. */
  int: (max: number) => number;
};

type Choice = {
  options: string[];
  distractorIds: string[];
};

/**
 * Lesson v2 → screens in teaching order.
 * Intro cards come first, so a new unit is never drilled before the learner has seen it.
 * Distractors are taken from this lesson and from `seen`.
 */
export function generateLessonSteps(input: GenerateLessonStepsInput): LessonStep[] {
  const lesson = input.lesson;
  const rng = createRng(input.seed ?? lesson.id);
  const byId = indexItems([...input.items, ...(input.seen ?? [])]);
  const lessonItems = lesson.items.map((id) => requiredItem(byId, id));
  const lessonIds = new Set(lesson.items);
  const seenItems = dedupe(input.seen ?? []).filter((item) => !lessonIds.has(item.id));
  const allowed = new Set<string>([...lesson.items, ...seenItems.map((item) => item.id)]);

  requireResolvable(lesson, byId);
  requireIntroduced(lesson, allowed);

  const pool = dedupe([...lessonItems, ...seenItems]).sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const drafted = assemble({ lesson, lessonItems, pool, byId, rng });
  const replaced = applyOverrides(drafted, lesson.overrides, { lessonItems, pool, byId, rng });
  return replaced.map((step, index) => ({ ...step, id: `s${index}` }));
}

/**
 * Items taught by earlier lessons in `orderedLessons`.
 * `orderedLessons` follows the topic's lesson list.
 */
export function seenItemsBeforeLesson(
  orderedLessons: readonly Lesson[],
  items: readonly Item[],
  lessonId: string,
): Item[] {
  const byId = indexItems(items);
  const seen: Item[] = [];
  const seenIds = new Set<string>();

  for (const lesson of orderedLessons) {
    if (lesson.id === lessonId) return seen;
    for (const itemId of lesson.items) {
      if (seenIds.has(itemId)) continue;
      seenIds.add(itemId);
      seen.push(requiredItem(byId, itemId));
    }
  }

  throw new Error(`Unknown lesson id: ${lessonId}`);
}

/** Phase of a generated step. Hand-written override kinds that are not in the arc return null. */
export function phaseOf(step: LessonStep): LessonPhase | null {
  switch (step.type) {
    case 'intro':
      return 'intro';
    case 'listen_select':
    case 'match_pairs':
    case 'select_translation':
      return 'recognize';
    case 'build_sentence':
    case 'fill_gap':
      return 'build';
    case 'type_translation':
      return 'recall';
    case 'speak_repeat':
      return 'speak';
    case 'dialog':
      return 'dialog';
    case 'listen_type':
    case 'conjugate':
    case 'reading_comprehension':
    case 'free_writing':
    case 'roleplay':
      return null;
  }
}

/** Every unit a step shows or asks for, including distractors. */
export function referencedItemIds(step: LessonStep): readonly string[] {
  return [...step.itemIds, ...step.distractorIds];
}

type AssembleInput = {
  lesson: Lesson;
  lessonItems: readonly Item[];
  pool: readonly Item[];
  byId: ReadonlyMap<string, Item>;
  rng: Rng;
};

function assemble(input: AssembleInput): LessonStep[] {
  const { lesson, lessonItems, pool, byId, rng } = input;
  const intros = lessonItems.map(introStep);
  const recognizeBank = recognizeSteps(lessonItems, pool, rng);
  const buildBank = buildSteps(lessonItems, pool, rng);
  const recallCount = chooseRecall(rng, lessonItems.length, lesson.speak.length);
  const recall = shuffle(lessonItems, rng).slice(0, recallCount).map(typeTranslationStep);
  const speak = lesson.speak.map((id) => speakStep(requiredItem(byId, id)));
  const dialog = dialogStep(lesson);

  const budget = practiceBudget(intros.length, speak.length, recall.length);
  const recognizeAvailable =
    recognizeBank.listen.length + recognizeBank.match.length + recognizeBank.select.length;
  const buildAvailable = buildBank.sentences.length + buildBank.gaps.length;
  const split = splitPractice(budget, recognizeAvailable, buildAvailable);

  const recognize = takeRoundRobin<LessonStep>(
    [recognizeBank.listen, recognizeBank.match, recognizeBank.select],
    split.recognize,
  );
  const build = takeRoundRobin<LessonStep>([buildBank.sentences, buildBank.gaps], split.build);

  return [...intros, ...recognize, ...build, ...recall, ...speak, dialog];
}

function recognizeSteps(lessonItems: readonly Item[], pool: readonly Item[], rng: Rng) {
  const order = shuffle(lessonItems, rng);
  const listen = order.flatMap((item) => {
    const step = listenSelectStep(item, pool, rng);
    return step ? [step] : [];
  });
  const match = matchGroups(lessonItems, rng).map(matchPairsStep);
  const select = order.flatMap((item) => {
    const step = selectTranslationStep(item, pool, rng);
    return step ? [step] : [];
  });
  return { listen, match, select };
}

function buildSteps(lessonItems: readonly Item[], pool: readonly Item[], rng: Rng) {
  const phrases = shuffle(
    lessonItems.filter((item) => phrasePieces(item) !== null),
    rng,
  );
  const sentences = phrases.flatMap((item) => {
    const step = buildSentenceStep(item, pool, rng);
    return step ? [step] : [];
  });
  const gaps = phrases.flatMap((item) => fillGapSteps(item, pool, rng));
  return { sentences, gaps };
}

function chooseRecall(rng: Rng, intro: number, speak: number): 2 | 3 {
  const preferred: 2 | 3 = rng.int(2) === 0 ? 2 : 3;
  const withPreferred = intro + speak + preferred + 1;
  if (withPreferred + MIN_PRACTICE <= LESSON_STEP_MAX) return preferred;
  return 2;
}

function practiceBudget(intro: number, speak: number, recall: number): number {
  const fixed = intro + speak + recall + 1;
  const max = LESSON_STEP_MAX - fixed;
  if (max <= 0) return 0;
  const min = Math.max(MIN_PRACTICE, LESSON_STEP_MIN - fixed);
  const target = LESSON_STEP_TARGET - fixed;
  if (min > max) return max;
  return clamp(target, min, max);
}

/**
 * Keep both practice phases when the banks are deep enough:
 * at least three recognition steps (listen, match, translate) and two assembly steps.
 */
function splitPractice(
  budget: number,
  recognizeAvailable: number,
  buildAvailable: number,
): { recognize: number; build: number } {
  if (budget <= 0) return { recognize: 0, build: 0 };

  const wantBoth = budget >= 5 && recognizeAvailable >= 3 && buildAvailable >= 2;
  let recognize = wantBoth
    ? Math.min(recognizeAvailable, budget - 2, Math.max(3, Math.round(budget * 0.6)))
    : Math.min(recognizeAvailable, Math.round(budget * 0.6));
  let build = Math.min(buildAvailable, budget - recognize);

  let spare = budget - recognize - build;
  if (spare > 0 && build < buildAvailable) {
    const extra = Math.min(spare, buildAvailable - build);
    build += extra;
    spare -= extra;
  }
  if (spare > 0 && recognize < recognizeAvailable) {
    recognize += Math.min(spare, recognizeAvailable - recognize);
  }

  return { recognize, build };
}

function takeRoundRobin<T>(groups: readonly (readonly T[])[], count: number): T[] {
  if (count <= 0) return [];
  const picked: T[] = [];
  let round = 0;
  while (picked.length < count) {
    let progressed = false;
    for (const group of groups) {
      const step = group[round];
      if (step === undefined) continue;
      picked.push(step);
      progressed = true;
      if (picked.length === count) return picked;
    }
    if (!progressed) break;
    round += 1;
  }
  return picked;
}

function introStep(item: Item): IntroStep {
  return {
    id: '',
    type: 'intro',
    itemId: item.id,
    itemIds: [item.id],
    distractorIds: [],
  };
}

function listenSelectStep(item: Item, pool: readonly Item[], rng: Rng): ListenSelectStep | null {
  const choice = chooseTranslations(item, pool, rng);
  if (!choice) return null;
  return {
    id: '',
    type: 'listen_select',
    prompt_ru: PROMPT.listen,
    speakText: item.es,
    audio: audioOf(item),
    options: choice.options,
    answer: item.ru,
    itemIds: [item.id],
    distractorIds: choice.distractorIds,
  };
}

function selectTranslationStep(
  item: Item,
  pool: readonly Item[],
  rng: Rng,
): SelectTranslationStep | null {
  const choice = chooseTranslations(item, pool, rng);
  if (!choice) return null;
  return {
    id: '',
    type: 'select_translation',
    prompt_ru: PROMPT.select,
    prompt: item.es,
    options: choice.options,
    answer: item.ru,
    itemIds: [item.id],
    distractorIds: choice.distractorIds,
  };
}

function matchGroups(items: readonly Item[], rng: Rng): Item[][] {
  const order = shuffle(items, rng);
  const groups: Item[][] = [];
  let index = 0;
  while (index < order.length) {
    const remaining = order.length - index;
    if (remaining < 2) {
      const last = groups[groups.length - 1];
      const leftover = order[index];
      if (last && leftover) last.push(leftover);
      break;
    }
    const size = Math.min(4, remaining);
    groups.push(order.slice(index, index + size));
    index += size;
  }
  return groups.filter((group) => group.length >= 2);
}

function matchPairsStep(group: readonly Item[]): MatchPairsStep {
  return {
    id: '',
    type: 'match_pairs',
    prompt_ru: PROMPT.match,
    pairs: group.map((item) => ({ left: item.es, right: item.ru })),
    itemIds: group.map((item) => item.id),
    distractorIds: [],
  };
}

function buildSentenceStep(item: Item, pool: readonly Item[], rng: Rng): BuildSentenceStep | null {
  const parts = phrasePieces(item);
  if (!parts) return null;
  const extras = extraTiles(item, parts, pool, 1 + rng.int(2), rng);
  const answer = parts.join(' ');
  const step: BuildSentenceStep = {
    id: '',
    type: 'build_sentence',
    prompt_ru: PROMPT.build,
    tiles: shuffle([...parts, ...extras.tiles], rng),
    answer,
    itemIds: [item.id],
    distractorIds: extras.ids,
  };
  if (normalizeForCompare(item.es) !== normalizeForCompare(answer)) {
    step.accepted = [item.es];
  }
  return step;
}

function fillGapSteps(item: Item, pool: readonly Item[], rng: Rng): FillGapStep[] {
  const parts = phrasePieces(item);
  if (!parts) return [];
  return parts.map((part, gapAt) => {
    const sentence = parts.map((piece, index) => (index === gapAt ? '___' : piece)).join(' ');
    const choice = chooseTiles(pool, item.id, part, CHOICE_DISTRACTORS, rng);
    const step: FillGapStep = {
      id: '',
      type: 'fill_gap',
      prompt_ru: PROMPT.gap,
      sentence_es: sentence,
      answer: part,
      itemIds: [item.id],
      distractorIds: choice.ids,
    };
    if (choice.tiles.length > 0) {
      step.options = placeAnswer(part, choice.tiles, rng);
    }
    return step;
  });
}

function typeTranslationStep(item: Item): TypeTranslationStep {
  return {
    id: '',
    type: 'type_translation',
    prompt_ru: PROMPT.recall,
    prompt: item.ru,
    direction: 'ru_to_es',
    answer: item.es,
    itemIds: [item.id],
    distractorIds: [],
  };
}

function speakStep(item: Item, promptRu: string = PROMPT.speak): SpeakRepeatStep {
  return {
    id: '',
    type: 'speak_repeat',
    prompt_ru: promptRu,
    prompt_es: item.es,
    audio: audioOf(item),
    itemIds: [item.id],
    distractorIds: [],
  };
}

function dialogStep(lesson: Lesson): DialogStep {
  const itemIds: string[] = [];
  const distractorIds: string[] = [];
  for (const line of lesson.dialog.lines) {
    if (line.who !== 'user') continue;
    itemIds.push(line.target);
    for (const option of line.options) {
      if (option !== line.target) distractorIds.push(option);
    }
  }
  return {
    id: '',
    type: 'dialog',
    lines: lesson.dialog.lines.map(cloneLine),
    itemIds: unique(itemIds),
    distractorIds: unique(distractorIds),
  };
}

type OverrideContext = {
  lessonItems: readonly Item[];
  pool: readonly Item[];
  byId: ReadonlyMap<string, Item>;
  rng: Rng;
};

function applyOverrides(
  steps: readonly LessonStep[],
  overrides: readonly LessonOverride[],
  ctx: OverrideContext,
): LessonStep[] {
  const next = [...steps];
  const ordered = [...overrides].sort((left, right) => left.index - right.index);
  for (const override of ordered) {
    if (!Number.isInteger(override.index) || override.index < 0) {
      throw new Error('Lesson override index must be a non-negative integer');
    }
    const step = stepFromOverride(override, ctx);
    if (override.index < next.length) next[override.index] = step;
    else next.push(step);
  }
  return next;
}

function stepFromOverride(override: LessonOverride, ctx: OverrideContext): LessonStep {
  if (isAuthoredType(override.type)) {
    return {
      id: '',
      type: override.type,
      prompt_ru: override.prompt_ru,
      ...(override.item ? { itemId: override.item } : {}),
      itemIds: override.item ? [override.item] : [],
      distractorIds: [],
    };
  }

  const focus = override.item ? requiredItem(ctx.byId, override.item) : ctx.lessonItems[0];
  if (!focus) throw new Error('Lesson has no items to build an override from');

  switch (override.type) {
    case 'listen_select': {
      const step = listenSelectStep(focus, ctx.pool, ctx.rng);
      if (!step) throw new Error(`Cannot build listen_select for ${focus.id}`);
      return { ...step, prompt_ru: override.prompt_ru };
    }
    case 'select_translation': {
      const step = selectTranslationStep(focus, ctx.pool, ctx.rng);
      if (!step) throw new Error(`Cannot build select_translation for ${focus.id}`);
      return { ...step, prompt_ru: override.prompt_ru };
    }
    case 'match_pairs':
      return {
        ...matchPairsStep(matchGroupIncluding(focus, ctx.lessonItems, ctx.rng)),
        prompt_ru: override.prompt_ru,
      };
    case 'build_sentence': {
      const step = buildSentenceStep(focus, ctx.pool, ctx.rng);
      if (!step) throw new Error(`Cannot build build_sentence for ${focus.id}`);
      return { ...step, prompt_ru: override.prompt_ru };
    }
    case 'fill_gap': {
      const step = fillGapSteps(focus, ctx.pool, ctx.rng)[0];
      if (!step) throw new Error(`Cannot build fill_gap for ${focus.id}`);
      return { ...step, prompt_ru: override.prompt_ru };
    }
    case 'type_translation':
      return { ...typeTranslationStep(focus), prompt_ru: override.prompt_ru };
    case 'speak_repeat':
      return speakStep(focus, override.prompt_ru);
    case 'listen_type':
      return {
        id: '',
        type: 'listen_type',
        prompt_ru: override.prompt_ru,
        speakText: focus.es,
        audio: audioOf(focus),
        answer: focus.es,
        itemIds: [focus.id],
        distractorIds: [],
      };
    default: {
      const exhaustive: never = override.type;
      return exhaustive;
    }
  }
}

function isAuthoredType(type: ExerciseType): type is AuthoredStep['type'] {
  return (
    type === 'conjugate' ||
    type === 'reading_comprehension' ||
    type === 'free_writing' ||
    type === 'roleplay'
  );
}

function matchGroupIncluding(focus: Item, lessonItems: readonly Item[], rng: Rng): Item[] {
  const others = shuffle(
    lessonItems.filter((item) => item.id !== focus.id),
    rng,
  );
  const group = shuffle([focus, ...others.slice(0, 3)], rng);
  if (group.length < 2) throw new Error(`Cannot build match_pairs for ${focus.id}`);
  return group;
}

/** Spanish pieces a phrase is assembled from. Words and single-token lines are not phrases. */
function phrasePieces(item: Item): string[] | null {
  if (item.type !== 'phrase') return null;
  if (item.parts.length >= 2) return item.parts.map((part) => part.es);
  const tokens = item.es.split(/\s+/).filter((token) => token.length > 0);
  return tokens.length >= 2 ? tokens : null;
}

function chooseTranslations(item: Item, pool: readonly Item[], rng: Rng): Choice | null {
  const picked = pickFromPool(pool, item.id, 'ru', item.ru, CHOICE_DISTRACTORS, rng);
  if (picked.texts.length === 0) return null;
  return {
    options: placeAnswer(item.ru, picked.texts, rng),
    distractorIds: picked.ids,
  };
}

function chooseTiles(
  pool: readonly Item[],
  currentId: string,
  answer: string,
  count: number,
  rng: Rng,
): { tiles: string[]; ids: string[] } {
  const picked = pickTiles(pool, currentId, answer, count, rng);
  return { tiles: picked.texts, ids: picked.ids };
}

function extraTiles(
  item: Item,
  parts: readonly string[],
  pool: readonly Item[],
  count: number,
  rng: Rng,
): { tiles: string[]; ids: string[] } {
  const blocked = new Set(parts.map((part) => normalizeForCompare(part)));
  blocked.add(normalizeForCompare(parts.join(' ')));
  const candidates = tileCandidates(pool, item.id, blocked);
  const picked = shuffle(candidates, rng).slice(0, count);
  return {
    tiles: picked.map((candidate) => candidate.text),
    ids: unique(picked.map((candidate) => candidate.id)),
  };
}

function pickFromPool(
  pool: readonly Item[],
  currentId: string,
  side: 'es' | 'ru',
  answer: string,
  count: number,
  rng: Rng,
): { texts: string[]; ids: string[] } {
  const answerKey = normalizeForCompare(answer);
  const eligible: Item[] = [];
  const seen = new Set<string>();
  for (const item of pool) {
    if (item.id === currentId) continue;
    const text = item[side];
    const key = normalizeForCompare(text);
    if (!key || key === answerKey || seen.has(key)) continue;
    seen.add(key);
    eligible.push(item);
  }
  const picked = shuffle(eligible, rng).slice(0, count);
  return { texts: picked.map((item) => item[side]), ids: picked.map((item) => item.id) };
}

type TileCandidate = { id: string; text: string };

function pickTiles(
  pool: readonly Item[],
  currentId: string,
  answer: string,
  count: number,
  rng: Rng,
): { texts: string[]; ids: string[] } {
  const blocked = new Set<string>([normalizeForCompare(answer)]);
  const picked = shuffle(tileCandidates(pool, currentId, blocked), rng).slice(0, count);
  return {
    texts: picked.map((candidate) => candidate.text),
    ids: unique(picked.map((candidate) => candidate.id)),
  };
}

function tileCandidates(
  pool: readonly Item[],
  currentId: string,
  blocked: ReadonlySet<string>,
): TileCandidate[] {
  const candidates: TileCandidate[] = [];
  const seen = new Set<string>();
  for (const item of pool) {
    if (item.id === currentId) continue;
    for (const text of looseTiles(item)) {
      const key = normalizeForCompare(text);
      if (!key || blocked.has(key) || seen.has(key)) continue;
      seen.add(key);
      candidates.push({ id: item.id, text });
    }
  }
  return candidates;
}

function looseTiles(item: Item): string[] {
  if (item.parts.length > 0) return item.parts.map((part) => part.es);
  return item.es.split(/\s+/).filter((token) => token.length > 0);
}

function placeAnswer(answer: string, extras: readonly string[], rng: Rng): string[] {
  const options = [...extras];
  options.splice(rng.int(options.length + 1), 0, answer);
  return options;
}

function audioOf(item: Item): string | null {
  return item.audio.es ?? item.audio.latam;
}

function cloneLine(line: DialogLine): DialogLine {
  if (line.who === 'npc') return { who: 'npc', es: line.es, ru: line.ru };
  return { who: 'user', target: line.target, options: [...line.options] };
}

function requireResolvable(lesson: Lesson, byId: ReadonlyMap<string, Item>): void {
  for (const id of lesson.items) requiredItem(byId, id);
  for (const id of lesson.speak) requiredItem(byId, id);
  for (const line of lesson.dialog.lines) {
    if (line.who !== 'user') continue;
    requiredItem(byId, line.target);
    for (const option of line.options) requiredItem(byId, option);
  }
  for (const override of lesson.overrides) {
    if (override.item) requiredItem(byId, override.item);
  }
}

function requireIntroduced(lesson: Lesson, allowed: ReadonlySet<string>): void {
  const used = [...lesson.speak];
  for (const line of lesson.dialog.lines) {
    if (line.who !== 'user') continue;
    used.push(line.target, ...line.options);
  }
  for (const id of used) {
    if (!allowed.has(id)) {
      throw new Error(`Lesson ${lesson.id} uses ${id} before it is introduced`);
    }
  }
}

function requiredItem(byId: ReadonlyMap<string, Item>, id: string): Item {
  const item = byId.get(id);
  if (!item) throw new Error(`Unknown item id: ${id}`);
  return item;
}

function indexItems(items: readonly Item[]): Map<string, Item> {
  const map = new Map<string, Item>();
  for (const item of items) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return map;
}

function dedupe(items: readonly Item[]): Item[] {
  return [...indexItems(items).values()];
}

function unique(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function shuffle<T>(values: readonly T[], rng: Rng): T[] {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = rng.int(index + 1);
    const current = next[index];
    const other = next[swap];
    if (current === undefined || other === undefined) continue;
    next[index] = other;
    next[swap] = current;
  }
  return next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createRng(seed: string): Rng {
  let state = fnv1a(seed);
  function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    int(max: number) {
      if (max <= 1) return 0;
      return Math.floor(next() * max);
    },
  };
}

/** FNV-1a, same mix the review deck uses to keep option order stable. */
function fnv1a(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
