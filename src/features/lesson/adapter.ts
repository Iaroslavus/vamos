import { getItem, getLesson, getTopic } from '@/features/content/loader';
import type { Item } from '@/features/content/schema';

import type { Exercise, Lesson, VocabularyItem } from './schema';

/** Route ids from the pre-v2 lessons. Progress is stored under the v2 id. */
const LEGACY_LESSON_IDS: Record<string, string> = {
  'a1-u01-l01': 'a1.hola.l1',
  'a1-u01-l02': 'a1.hola.l2',
  'a1-u01-l03': 'a1.numbers.l1',
};

/**
 * Temporary bridge: a v2 lesson becomes the exercise lesson the current player renders.
 * The step generator replaces this.
 */
export function loadLesson(id: string): Lesson {
  const lesson = getLesson(LEGACY_LESSON_IDS[id] ?? id);
  const topic = getTopic(lesson.topic);
  const units = lesson.items.map((itemId) => getItem(itemId));

  return {
    id: lesson.id,
    level: topic.level,
    unit: 1,
    title_ru: lesson.title_ru,
    draft: lesson.draft,
    new_items: units.map(toVocabulary),
    exercises: exercisesFromItems(units),
  };
}

function toVocabulary(item: Item): VocabularyItem {
  const audio = item.audio.es ?? undefined;
  return {
    id: item.id,
    es: item.es,
    ru: item.ru,
    pos: item.type === 'phrase' ? 'phrase' : 'other',
    ...(audio ? { audio } : {}),
    variant: item.variant,
  };
}

function exercisesFromItems(items: readonly Item[]): Exercise[] {
  const first = items[0];
  if (!first) return [];

  const exercises: Exercise[] = [selectTranslation(first, items)];
  const pairs = items.slice(0, 4);
  if (pairs.length >= 2) {
    exercises.push({
      type: 'match_pairs',
      prompt_ru: 'Соедините фразы с переводом',
      pairs: pairs.map((item) => ({ left: item.es, right: item.ru })),
    });
  }

  const spoken = items.find((item) => item.audio.es);
  const audio = spoken?.audio.es;
  if (spoken && audio) {
    exercises.push({
      type: 'listen_select',
      prompt_ru: 'Что вы слышите?',
      audio,
      options: unique([spoken.es, ...others(items, spoken).map((item) => item.es)]).slice(0, 4),
      answer: spoken.es,
    });
  }

  const typed = items[1] ?? first;
  exercises.push({
    type: 'type_translation',
    prompt_ru: 'Напишите по-испански',
    prompt: typed.ru,
    direction: 'ru_to_es',
    answer: typed.es,
  });

  const gap = items.find((item) => item.parts.length >= 2);
  const head = gap?.parts[0];
  if (gap && head) {
    exercises.push({
      type: 'fill_gap',
      prompt_ru: 'Вставьте пропущенное слово',
      sentence_es: `___ ${gap.parts
        .slice(1)
        .map((part) => part.es)
        .join(' ')}`,
      answer: head.es,
    });
    const extra = others(items, gap)[0]?.es;
    exercises.push({
      type: 'build_sentence',
      prompt_ru: 'Составьте фразу',
      answer: gap.parts.map((part) => part.es).join(' '),
      tiles: extra
        ? [...gap.parts.map((part) => part.es), extra]
        : gap.parts.map((part) => part.es),
    });
  }

  return exercises;
}

function selectTranslation(item: Item, pool: readonly Item[]): Exercise {
  const options = unique([item.ru, ...others(pool, item).map((other) => other.ru)]).slice(0, 4);
  return {
    type: 'select_translation',
    prompt_ru: 'Выберите перевод',
    prompt: item.es,
    options: options.length >= 2 ? options : [item.ru, item.es],
    answer: item.ru,
  };
}

function others(items: readonly Item[], current: Item): Item[] {
  return items.filter((item) => item.id !== current.id);
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
