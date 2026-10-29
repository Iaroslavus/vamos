import { contentLanguage, getLesson, getTopic, listItems } from '@/features/content/loader';
import type { Item } from '@/features/content/schema';
import { contentLocale, textOf, type ContentLocale } from '@/features/content/text';

import { generateLessonSteps, seenItemsBeforeLesson, type LessonStep } from './generator';
import { itemAudioPath } from './intro';
import { serializePairs } from './pairs';
import type { VocabularyItem } from './schema';
import type { LessonExerciseItem, ScriptEntry, ScriptKind } from './store';

export type StepSurface = 'intro' | 'speak' | 'dialog' | 'exercise' | 'prompt';

export type LoadedLesson = {
  lessonId: string;
  topicIcon: string;
  steps: LessonStep[];
  script: ScriptEntry[];
  exercises: LessonExerciseItem[];
  /** Every unit of the lesson. The intro presents them; the summary saves them. */
  newItems: VocabularyItem[];
  items: Item[];
};

const EXERCISE_TYPES = new Set<LessonStep['type']>([
  'select_translation',
  'build_sentence',
  'listen_select',
  'match_pairs',
  'type_translation',
  'fill_gap',
]);

/** Where a generated step belongs on the lesson screen. */
export function stepSurface(step: LessonStep): StepSurface {
  switch (step.type) {
    case 'intro':
      return 'intro';
    case 'speak_repeat':
      return 'speak';
    case 'dialog':
      return 'dialog';
    case 'select_translation':
    case 'build_sentence':
    case 'listen_select':
    case 'match_pairs':
    case 'type_translation':
    case 'fill_gap':
      return 'exercise';
    default:
      return 'prompt';
  }
}

/** 1-based place of an intro step among the lesson's intro cards. */
export function introPlace(
  steps: readonly LessonStep[],
  index: number,
): { position: number; total: number } {
  let total = 0;
  let position = 1;
  for (let cursor = 0; cursor < steps.length; cursor += 1) {
    if (steps[cursor]?.type !== 'intro') continue;
    total += 1;
    if (cursor === index) position = total;
  }
  return { position, total };
}

export function isTypingExercise(
  exercise: LessonExerciseItem,
): exercise is Extract<LessonExerciseItem, { type: 'type_translation' | 'fill_gap' }> {
  return exercise.type === 'type_translation' || exercise.type === 'fill_gap';
}

/**
 * Turn a v2 lesson into the steps the player renders.
 * Distractors may come from earlier lessons of the same topic.
 */
export function loadLessonSession(
  lessonId: string,
  language: ContentLocale = contentLanguage(),
): LoadedLesson {
  const lesson = getLesson(lessonId);
  const topic = getTopic(lesson.topic);
  const catalog = listItems();
  const ordered = topic.lessons.map((id) => getLesson(id));
  const seen = seenItemsBeforeLesson(ordered, catalog, lesson.id);
  const gloss = contentLocale(language);
  const steps = generateLessonSteps({ lesson, items: catalog, seen, language: gloss });
  const byId = new Map(catalog.map((item) => [item.id, item]));
  const exercises = steps.flatMap((step) => {
    const exercise = exerciseFromStep(step, byId, gloss);
    return exercise ? [exercise] : [];
  });

  return {
    lessonId: lesson.id,
    topicIcon: topic.icon,
    steps,
    script: steps.map((step) => ({ id: step.id, kind: scriptKind(step) })),
    exercises,
    newItems: lesson.items.map((id) => toVocabulary(requiredItem(byId, id), gloss)),
    items: catalog,
  };
}

function scriptKind(step: LessonStep): ScriptKind {
  const surface = stepSurface(step);
  if (surface === 'exercise') return 'exercise';
  if (surface === 'intro' || surface === 'speak' || surface === 'dialog') return surface;
  return 'prompt';
}

function exerciseFromStep(
  step: LessonStep,
  byId: ReadonlyMap<string, Item>,
  language: ContentLocale,
): LessonExerciseItem | null {
  if (!EXERCISE_TYPES.has(step.type)) return null;

  switch (step.type) {
    case 'select_translation':
      return {
        id: step.id,
        type: 'select_translation',
        prompt_ru: step.prompt_ru,
        prompt: step.prompt,
        options: step.options,
        answer: step.answer,
        ...glossFor(step.itemIds, byId, language),
      };
    case 'build_sentence':
      return {
        id: step.id,
        type: 'build_sentence',
        prompt_ru: step.prompt_ru,
        tiles: step.tiles,
        answer: step.answer,
        ...(step.accepted ? { accepted: step.accepted } : {}),
        ...glossFor(step.itemIds, byId, language),
      };
    case 'listen_select':
      return {
        id: step.id,
        type: 'listen_select',
        prompt_ru: step.prompt_ru,
        options: step.options,
        answer: step.answer,
        speakText: step.speakText,
        ...(step.itemIds[0] ? { itemId: step.itemIds[0] } : {}),
        ...(step.audio ? { audio: step.audio } : {}),
        ...glossFor(step.itemIds, byId, language),
      };
    case 'match_pairs':
      return {
        id: step.id,
        type: 'match_pairs',
        prompt_ru: step.prompt_ru,
        pairs: step.pairs,
        answer: serializePairs(step.pairs),
        phraseEs: step.pairs.map((pair) => pair.left).join('. '),
        phraseTr: step.pairs.map((pair) => pair.right).join('. '),
        itemIds: step.itemIds,
        audio: firstClip(step.itemIds, byId),
      };
    case 'type_translation':
      return {
        id: step.id,
        type: 'type_translation',
        prompt_ru: step.prompt_ru,
        prompt: step.prompt,
        direction: step.direction,
        answer: step.answer,
        ...glossFor(step.itemIds, byId, language),
      };
    case 'fill_gap':
      return {
        id: step.id,
        type: 'fill_gap',
        prompt_ru: step.prompt_ru,
        sentence_es: step.sentence_es,
        answer: step.answer,
        ...(step.options ? { options: step.options } : {}),
        ...glossFor(step.itemIds, byId, language),
      };
    default:
      return null;
  }
}

function glossFor(
  itemIds: readonly string[],
  byId: ReadonlyMap<string, Item>,
  language: ContentLocale,
) {
  const item = focusItem(itemIds, byId);
  if (!item) return {};
  return {
    phraseEs: item.es,
    phraseTr: textOf(item.tr, language),
    itemIds: [item.id],
    audio: itemAudioPath(item),
  };
}

function firstClip(itemIds: readonly string[], byId: ReadonlyMap<string, Item>): string | null {
  const item = focusItem(itemIds, byId);
  return item ? itemAudioPath(item) : null;
}

function focusItem(itemIds: readonly string[], byId: ReadonlyMap<string, Item>): Item | null {
  const id = itemIds[0];
  if (!id) return null;
  return byId.get(id) ?? null;
}

function toVocabulary(item: Item, language: ContentLocale): VocabularyItem {
  const audio = itemAudioPath(item);
  return {
    id: item.id,
    es: item.es,
    ru: textOf(item.tr, language),
    pos: item.type === 'phrase' ? 'phrase' : 'other',
    variant: item.variant,
    ...(audio ? { audio } : {}),
  };
}

function requiredItem(byId: ReadonlyMap<string, Item>, id: string): Item {
  const item = byId.get(id);
  if (!item) throw new Error(`Unknown item id: ${id}`);
  return item;
}
