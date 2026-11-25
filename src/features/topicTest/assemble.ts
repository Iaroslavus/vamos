import i18n from '@/i18n';

import type { Item } from '@/features/content/schema';
import { displayText } from '@/features/content/displayText';
import { contentLocale, textOf, type ContentLocale } from '@/features/content/text';
import { itemAudioPath } from '@/features/lesson/intro';
import { normalizeForCompare } from '@/features/lesson/grading';
import type {
  BuildSentenceStep,
  ListenSelectStep,
  SelectTranslationStep,
  SpeakRepeatStep,
  TypeTranslationStep,
} from '@/features/lesson/generator';
import { phraseTileLabels } from '@/features/lesson/tiles';

/** A topic test stays inside this length, including the two speaking tasks. */
export const TOPIC_TEST_MIN = 10;
export const TOPIC_TEST_MAX = 12;
export const TOPIC_TEST_SPEAK = 2;

export const TOPIC_TEST_KINDS = ['recognize', 'build', 'recall', 'listen', 'speak'] as const;
export type TopicTestKind = (typeof TOPIC_TEST_KINDS)[number];

export type TopicTestLessonInput = {
  id: string;
  items: readonly Item[];
};

export type TopicTestTask = {
  id: string;
  kind: TopicTestKind;
  itemId: string;
  lessonId: string;
  step:
    | SelectTranslationStep
    | BuildSentenceStep
    | TypeTranslationStep
    | ListenSelectStep
    | SpeakRepeatStep;
};

type Source = {
  item: Item;
  lessonId: string;
};

type Rng = {
  next: () => number;
  int: (max: number) => number;
};

type Prompts = {
  recognize: string;
  build: string;
  recall: string;
  listen: string;
  speak: string;
};

const CHOICE_DISTRACTORS = 3;
const BUILD_COUNT = 2;
const RECOGNIZE_COUNT = 3;
const LISTEN_COUNT = 3;
const RECALL_COUNT = 2;

/**
 * 10–12 tasks drawn from every item of the topic.
 * Recognize, assemble, recall, and listen are always present when the pool can build them.
 * Exactly two tasks ask the learner to say a phrase.
 * The same seed always returns the same test.
 */
export function assembleTopicTest(input: {
  lessons: readonly TopicTestLessonInput[];
  seed: string;
  language?: string | null;
}): TopicTestTask[] {
  const language = contentLocale(input.language);
  const sources = sourcesOf(input.lessons);
  if (sources.length === 0) return [];

  const rng = createRng(`${input.seed}:${language}`);
  const prompts = promptCopy(language);
  const phrases = sources.filter((source) => phrasePieces(source.item) !== null);
  const buildCount = phrases.length > 0 ? BUILD_COUNT : 0;

  const recognize = fill('recognize', RECOGNIZE_COUNT, sources, rng, language, prompts);
  const listen = fill('listen', LISTEN_COUNT, sources, rng, language, prompts);
  const build = fill('build', buildCount, phrases, rng, language, prompts);
  const recall = fill('recall', RECALL_COUNT, sources, rng, language, prompts);
  const speak = fill('speak', TOPIC_TEST_SPEAK, sources, rng, language, prompts);

  const mixed = leadWith(shuffle([...recognize, ...listen, ...build, ...recall], rng), 'recognize');
  const drafted = insertSpeak(mixed, speak);
  const topped = topUp(drafted, sources, rng, language, prompts);
  return topped.slice(0, TOPIC_TEST_MAX).map((task, index) => ({ ...task, id: `t${index}` }));
}

function sourcesOf(lessons: readonly TopicTestLessonInput[]): Source[] {
  const sources: Source[] = [];
  const seen = new Set<string>();
  for (const lesson of lessons) {
    for (const item of lesson.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      sources.push({ item, lessonId: lesson.id });
    }
  }
  return sources;
}

function promptCopy(language: ContentLocale): Prompts {
  const lng = language;
  return {
    recognize: i18n.t('topicTest.prompt.recognize', { lng }),
    build: i18n.t('topicTest.prompt.build', { lng }),
    recall: i18n.t('topicTest.prompt.recall', { lng }),
    listen: i18n.t('topicTest.prompt.listen', { lng }),
    speak: i18n.t('topicTest.prompt.speak', { lng }),
  };
}

function fill(
  kind: TopicTestKind,
  count: number,
  sources: readonly Source[],
  rng: Rng,
  language: ContentLocale,
  prompts: Prompts,
): TopicTestTask[] {
  if (count <= 0 || sources.length === 0) return [];
  const order = spread(sources, count, rng);
  const tasks: TopicTestTask[] = [];
  let guard = 0;
  while (tasks.length < count && guard < count * order.length) {
    const source = order[guard % order.length];
    guard += 1;
    if (!source) break;
    const task = makeTask(kind, source, sources, rng, language, prompts, tasks.length);
    if (task) tasks.push(task);
  }
  return tasks;
}

/** Round-robin across lessons so a test is not stuck inside the first lesson. */
function spread(sources: readonly Source[], count: number, rng: Rng): Source[] {
  const lanes = new Map<string, Source[]>();
  for (const source of sources) {
    const lane = lanes.get(source.lessonId) ?? [];
    lane.push(source);
    lanes.set(source.lessonId, lane);
  }
  const columns = [...lanes.values()].map((lane) => shuffle(lane, rng));
  const picked: Source[] = [];
  let round = 0;
  while (picked.length < count) {
    let progressed = false;
    for (const lane of columns) {
      const source = lane[round % lane.length];
      if (!source) continue;
      picked.push(source);
      progressed = true;
      if (picked.length === count) return picked;
    }
    if (!progressed) break;
    round += 1;
  }
  return picked;
}

/** Recognition is the way in: the first task is never a blank page to type. */
function leadWith(tasks: TopicTestTask[], kind: TopicTestKind): TopicTestTask[] {
  const index = tasks.findIndex((task) => task.kind === kind);
  if (index <= 0) return tasks;
  const picked = tasks[index];
  if (!picked) return tasks;
  return [picked, ...tasks.slice(0, index), ...tasks.slice(index + 1)];
}

function insertSpeak(mixed: TopicTestTask[], speak: TopicTestTask[]): TopicTestTask[] {
  if (speak.length === 0) return mixed;
  const mid = Math.floor(mixed.length / 2);
  const first = speak[0];
  const second = speak[1];
  const withFirst = first ? [...mixed.slice(0, mid), first, ...mixed.slice(mid)] : mixed;
  return second ? [...withFirst, second] : withFirst;
}

/** Recall can always be built, so a thin pool still reaches the minimum length. */
function topUp(
  tasks: TopicTestTask[],
  sources: readonly Source[],
  rng: Rng,
  language: ContentLocale,
  prompts: Prompts,
): TopicTestTask[] {
  const next = [...tasks];
  let guard = 0;
  while (next.length < TOPIC_TEST_MIN && guard < sources.length * 2) {
    const source = sources[guard % sources.length];
    guard += 1;
    if (!source) break;
    const task = makeTask('recall', source, sources, rng, language, prompts, next.length);
    if (task) next.push(task);
  }
  return next;
}

function makeTask(
  kind: TopicTestKind,
  source: Source,
  pool: readonly Source[],
  rng: Rng,
  language: ContentLocale,
  prompts: Prompts,
  index: number,
): TopicTestTask | null {
  const step = stepFor(kind, source, pool, rng, language, prompts);
  if (!step) return null;
  return {
    id: `draft-${index}`,
    kind,
    itemId: source.item.id,
    lessonId: source.lessonId,
    step,
  };
}

function stepFor(
  kind: TopicTestKind,
  source: Source,
  pool: readonly Source[],
  rng: Rng,
  language: ContentLocale,
  prompts: Prompts,
): TopicTestTask['step'] | null {
  const items = pool.map((entry) => entry.item);
  if (kind === 'recognize') return selectStep(source.item, items, rng, language, prompts.recognize);
  if (kind === 'listen') return listenStep(source.item, items, rng, language, prompts.listen);
  if (kind === 'build') return buildStep(source.item, items, rng, language, prompts.build);
  if (kind === 'recall') return recallStep(source.item, language, prompts.recall);
  return speakStep(source.item, prompts.speak);
}

function selectStep(
  item: Item,
  pool: readonly Item[],
  rng: Rng,
  language: ContentLocale,
  prompt: string,
): SelectTranslationStep | null {
  const choice = chooseTranslations(item, pool, rng, language);
  if (!choice) return null;
  return {
    id: '',
    type: 'select_translation',
    prompt_ru: prompt,
    prompt: item.es,
    options: choice.options,
    answer: choice.answer,
    itemIds: [item.id],
    distractorIds: choice.distractorIds,
  };
}

function listenStep(
  item: Item,
  pool: readonly Item[],
  rng: Rng,
  language: ContentLocale,
  prompt: string,
): ListenSelectStep | null {
  const choice = chooseTranslations(item, pool, rng, language);
  if (!choice) return null;
  return {
    id: '',
    type: 'listen_select',
    prompt_ru: prompt,
    speakText: item.es,
    audio: itemAudioPath(item),
    options: choice.options,
    answer: choice.answer,
    itemIds: [item.id],
    distractorIds: choice.distractorIds,
  };
}

function buildStep(
  item: Item,
  pool: readonly Item[],
  rng: Rng,
  language: ContentLocale,
  prompt: string,
): BuildSentenceStep | null {
  const parts = phrasePieces(item);
  if (!parts) return null;
  const extras = extraTiles(item, parts, pool, rng);
  const answer = parts.join(' ');
  const gloss = displayText(textOf(item.tr, language));
  const step: BuildSentenceStep = {
    id: '',
    type: 'build_sentence',
    prompt_ru: i18n.t('topicTest.prompt.buildNamed', { lng: language, text: gloss || item.es }),
    tiles: shuffle([...phraseTileLabels(parts), ...extras.tiles], rng),
    answer,
    itemIds: [item.id],
    distractorIds: extras.ids,
  };
  if (prompt.length === 0) return null;
  if (normalizeForCompare(item.es) !== normalizeForCompare(answer)) {
    step.accepted = [item.es];
  }
  return step;
}

function recallStep(item: Item, language: ContentLocale, prompt: string): TypeTranslationStep {
  return {
    id: '',
    type: 'type_translation',
    prompt_ru: prompt,
    prompt: textOf(item.tr, language) || item.es,
    direction: 'ru_to_es',
    answer: item.es,
    itemIds: [item.id],
    distractorIds: [],
  };
}

function speakStep(item: Item, prompt: string): SpeakRepeatStep {
  return {
    id: '',
    type: 'speak_repeat',
    prompt_ru: prompt,
    prompt_es: item.es,
    audio: itemAudioPath(item),
    itemIds: [item.id],
    distractorIds: [],
  };
}

function chooseTranslations(
  item: Item,
  pool: readonly Item[],
  rng: Rng,
  language: ContentLocale,
): { answer: string; options: string[]; distractorIds: string[] } | null {
  const answer = textOf(item.tr, language);
  if (!answer) return null;
  const answerKey = normalizeForCompare(answer);
  const eligible: { id: string; text: string }[] = [];
  const seen = new Set<string>();
  for (const other of pool) {
    if (other.id === item.id) continue;
    const text = textOf(other.tr, language);
    const key = normalizeForCompare(text);
    if (!key || key === answerKey || seen.has(key)) continue;
    seen.add(key);
    eligible.push({ id: other.id, text });
  }
  const picked = shuffle(eligible, rng).slice(0, CHOICE_DISTRACTORS);
  if (picked.length === 0) return null;
  return {
    answer,
    options: placeAnswer(
      answer,
      picked.map((entry) => entry.text),
      rng,
    ),
    distractorIds: picked.map((entry) => entry.id),
  };
}

function extraTiles(
  item: Item,
  parts: readonly string[],
  pool: readonly Item[],
  rng: Rng,
): { tiles: string[]; ids: string[] } {
  const blocked = new Set(parts.map((part) => normalizeForCompare(part)));
  const candidates: { id: string; text: string }[] = [];
  const seen = new Set<string>();
  for (const other of pool) {
    if (other.id === item.id) continue;
    const token = other.es.split(/\s+/).find((piece) => piece.length > 0) ?? '';
    const label = phraseTileLabels([token])[0] ?? '';
    const key = normalizeForCompare(label);
    if (!key || blocked.has(key) || seen.has(key)) continue;
    seen.add(key);
    candidates.push({ id: other.id, text: label });
  }
  const picked = shuffle(candidates, rng).slice(0, 1 + rng.int(2));
  return {
    tiles: picked.map((entry) => entry.text),
    ids: picked.map((entry) => entry.id),
  };
}

/** Words and one-token lines are not assembled. Phrases use their parts, then the words. */
function phrasePieces(item: Item): string[] | null {
  if (item.type !== 'phrase') return null;
  if (item.parts.length >= 2) return item.parts.map((part) => part.es);
  const tokens = item.es.split(/\s+/).filter((token) => token.length > 0);
  return tokens.length >= 2 ? tokens : null;
}

function placeAnswer(answer: string, extras: readonly string[], rng: Rng): string[] {
  const options = [...extras];
  options.splice(rng.int(options.length + 1), 0, answer);
  return options;
}

function shuffle<T>(values: readonly T[], rng: Rng): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = rng.int(index + 1);
    const current = copy[index];
    const other = copy[swap];
    if (current === undefined || other === undefined) continue;
    copy[index] = other;
    copy[swap] = current;
  }
  return copy;
}

function createRng(seed: string): Rng {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(max: number) {
      return Math.floor(next() * max);
    },
  };
}
