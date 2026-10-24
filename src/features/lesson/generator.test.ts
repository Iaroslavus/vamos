import { getLesson, getTopic, listItems, listLessons } from '@/features/content/loader';
import type { Item, Lesson } from '@/features/content/schema';

import {
  generateLessonSteps,
  phaseOf,
  referencedItemIds,
  seenItemsBeforeLesson,
  type LessonStep,
} from './generator';

const SEEDS = ['alpha', 'omega', '42'];

function bundledSteps(lessonId: string, seed?: string): LessonStep[] {
  const lesson = getLesson(lessonId);
  const topic = getTopic(lesson.topic);
  const ordered = topic.lessons.map((id) => getLesson(id));
  const items = listItems();
  return generateLessonSteps({
    lesson,
    items,
    seen: seenItemsBeforeLesson(ordered, items, lesson.id),
    seed,
  });
}

function allowedIds(lesson: Lesson, seen: readonly Item[]): Set<string> {
  return new Set([...lesson.items, ...seen.map((item) => item.id)]);
}

function expectIntroducedBeforeUse(
  steps: readonly LessonStep[],
  seenIds: ReadonlySet<string>,
): void {
  const introduced = new Set<string>();
  const early: string[] = [];

  for (const step of steps) {
    if (step.type !== 'intro') {
      for (const id of referencedItemIds(step)) {
        if (!introduced.has(id) && !seenIds.has(id)) early.push(`${step.id}:${step.type}:${id}`);
      }
    }
    if (step.type === 'intro') introduced.add(step.itemId);
  }

  expect(early).toEqual([]);
}

function collapsedPhases(steps: readonly LessonStep[]): string {
  const phases: string[] = [];
  for (const step of steps) {
    const phase = phaseOf(step);
    if (!phase) throw new Error(`step ${step.id} has no phase`);
    if (phases[phases.length - 1] !== phase) phases.push(phase);
  }
  return phases.join('>');
}

function itemMap(): Map<string, Item> {
  return new Map(listItems().map((item) => [item.id, item]));
}

describe('generateLessonSteps', () => {
  it('builds every bundled lesson inside 18–26 steps', () => {
    for (const lesson of listLessons()) {
      for (const seed of [lesson.id, ...SEEDS]) {
        const steps = bundledSteps(lesson.id, seed);
        expect(steps.length).toBeGreaterThanOrEqual(18);
        expect(steps.length).toBeLessThanOrEqual(26);
      }
    }
  });

  it('returns the same steps for the same seed', () => {
    const lesson = getLesson('a1.hola.l1');
    const items = listItems();
    const first = generateLessonSteps({ lesson, items, seed: 'repeat' });
    const second = generateLessonSteps({ lesson, items, seed: 'repeat' });
    expect(first).toEqual(second);
    expect(generateLessonSteps({ lesson, items })).toEqual(
      generateLessonSteps({ lesson, items, seed: lesson.id }),
    );
    expect(generateLessonSteps({ lesson, items, seed: 'alpha' })).not.toEqual(
      generateLessonSteps({ lesson, items, seed: 'omega' }),
    );
  });

  it('teaches, then drills, in one pass per phase', () => {
    for (const lesson of listLessons()) {
      const steps = bundledSteps(lesson.id, 'alpha');
      expect(collapsedPhases(steps)).toBe('intro>recognize>build>recall>speak>dialog');
      expect(steps.map((step) => step.id)).toEqual(steps.map((_, index) => `s${index}`));
    }
  });

  it('opens with one intro card per new unit, in lesson order', () => {
    for (const lesson of listLessons()) {
      const steps = bundledSteps(lesson.id);
      const intros = steps.filter((step) => step.type === 'intro');
      expect(intros.map((step) => step.itemId)).toEqual([...lesson.items]);
    }
  });

  it('does not use a unit before its intro', () => {
    for (const lesson of listLessons()) {
      const topic = getTopic(lesson.topic);
      const ordered = topic.lessons.map((id) => getLesson(id));
      const seen = new Set(
        seenItemsBeforeLesson(ordered, listItems(), lesson.id).map((item) => item.id),
      );
      for (const seed of [lesson.id, ...SEEDS]) {
        expectIntroducedBeforeUse(bundledSteps(lesson.id, seed), seen);
      }
    }
  });

  it('takes distractors only from this lesson and earlier units of the topic', () => {
    const firstLesson = getLesson('a1.hola.l1');
    for (const lesson of listLessons()) {
      const topic = getTopic(lesson.topic);
      const ordered = topic.lessons.map((id) => getLesson(id));
      const seenItems = seenItemsBeforeLesson(ordered, listItems(), lesson.id);
      const allowed = allowedIds(lesson, seenItems);
      const steps = bundledSteps(lesson.id, 'alpha');

      for (const step of steps) {
        for (const id of referencedItemIds(step)) expect(allowed.has(id)).toBe(true);
      }
    }

    const referenced = bundledSteps(firstLesson.id, 'alpha').flatMap((step) => [
      ...referencedItemIds(step),
    ]);
    expect(referenced.some((id) => id.startsWith('numbers.'))).toBe(false);
    expect(referenced.some((id) => !firstLesson.items.includes(id))).toBe(false);
  });

  it('recognizes with listen, pairs, and translation before assembling phrases', () => {
    const items = itemMap();
    for (const lesson of listLessons()) {
      const steps = bundledSteps(lesson.id, 'alpha');
      expect(steps.some((step) => step.type === 'listen_select')).toBe(true);
      expect(steps.some((step) => step.type === 'match_pairs')).toBe(true);
      expect(steps.some((step) => step.type === 'select_translation')).toBe(true);
      expect(steps.some((step) => step.type === 'build_sentence')).toBe(true);
      expect(steps.some((step) => step.type === 'fill_gap')).toBe(true);

      for (const step of steps) {
        if (step.type === 'listen_select' || step.type === 'select_translation') {
          expect(step.options).toContain(step.answer);
          expect(step.options.filter((option) => option === step.answer)).toHaveLength(1);
          expect(step.options.length).toBeGreaterThanOrEqual(2);
          expect(step.options.length).toBeLessThanOrEqual(4);
          const unit = items.get(step.itemIds[0] ?? '');
          expect(unit?.ru).toBe(step.answer);
          if (step.type === 'listen_select') expect(step.speakText).toBe(unit?.es);
          if (step.type === 'select_translation') expect(step.prompt).toBe(unit?.es);
        }

        if (step.type === 'match_pairs') {
          expect(step.pairs.length).toBeGreaterThanOrEqual(2);
          expect(step.pairs.length).toBeLessThanOrEqual(4);
          expect(step.itemIds).toHaveLength(step.pairs.length);
        }

        if (step.type === 'build_sentence' || step.type === 'fill_gap') {
          const unit = items.get(step.itemIds[0] ?? '');
          expect(unit?.type).toBe('phrase');
          const parts = unit?.parts.map((part) => part.es) ?? [];
          expect(parts.length).toBeGreaterThanOrEqual(2);
          if (step.type === 'build_sentence') {
            for (const part of parts) expect(step.tiles).toContain(part);
            const extras = step.tiles.length - parts.length;
            expect(extras).toBeGreaterThanOrEqual(1);
            expect(extras).toBeLessThanOrEqual(2);
            expect(step.answer).toBe(parts.join(' '));
          }
          if (step.type === 'fill_gap') {
            expect(step.sentence_es.split(' ').filter((token) => token === '___')).toHaveLength(1);
            expect(step.sentence_es.replace('___', step.answer)).toBe(parts.join(' '));
          }
        }
      }
    }
  });

  it('asks for two or three written translations, then the speak lines and the dialog', () => {
    for (const lesson of listLessons()) {
      const steps = bundledSteps(lesson.id, 'alpha');
      const recall = steps.filter((step) => step.type === 'type_translation');
      expect(recall.length).toBeGreaterThanOrEqual(2);
      expect(recall.length).toBeLessThanOrEqual(3);
      for (const step of recall) {
        expect(step.direction).toBe('ru_to_es');
        expect(lesson.items).toContain(step.itemIds[0]);
      }

      const spoken = steps.filter((step) => step.type === 'speak_repeat');
      expect(spoken.map((step) => step.itemIds[0])).toEqual([...lesson.speak]);
      for (const step of spoken) {
        const unit = itemMap().get(step.itemIds[0] ?? '');
        expect(step.prompt_es).toBe(unit?.es);
        expect(step.audio).toBe(unit?.audio.es ?? unit?.audio.latam ?? null);
      }

      const dialog = steps[steps.length - 1];
      expect(dialog?.type).toBe('dialog');
      if (dialog?.type === 'dialog') expect(dialog.lines).toEqual(lesson.dialog.lines);
    }
  });

  it('uses earlier topic units when the lesson itself has no distinct translations', () => {
    const lessonItems = [
      phrase('demo.p1', 'alfa uno', 'одно'),
      phrase('demo.p2', 'alfa dos', 'одно'),
      phrase('demo.p3', 'alfa tres', 'одно'),
      phrase('demo.p4', 'alfa cuatro', 'одно'),
      word('demo.w1', 'beta', 'одно'),
      word('demo.w2', 'gamma', 'одно'),
    ];
    const seen = [word('seen.hola', 'hola', 'привет'), word('seen.adios', 'adiós', 'пока')];
    const foreign = word('foreign.zzz', 'zzz', 'чужой');
    const lesson = lessonOf(
      'a1.demo.l1',
      lessonItems.map((item) => item.id),
      ['demo.p1', 'demo.p2'],
    );

    const steps = generateLessonSteps({
      lesson,
      items: [...lessonItems, ...seen, foreign],
      seen,
      seed: 'seen',
    });

    const choice = steps.filter(
      (step) => step.type === 'listen_select' || step.type === 'select_translation',
    );
    expect(choice.length).toBeGreaterThan(0);
    for (const step of choice) {
      expect(step.distractorIds.every((id) => id.startsWith('seen.'))).toBe(true);
      expect(referencedItemIds(step)).not.toContain(foreign.id);
    }
    expect(steps.flatMap((step) => [...referencedItemIds(step)])).not.toContain(foreign.id);
  });

  it('refuses a dialog that names a unit from a later lesson', () => {
    const lesson = getLesson('a1.hola.l1');
    expect(() =>
      generateLessonSteps({
        lesson: {
          ...lesson,
          dialog: {
            lines: [
              {
                who: 'user',
                target: 'numbers.uno',
                options: ['numbers.uno', 'hola.hola'],
              },
            ],
          },
        },
        items: listItems(),
        seen: [],
      }),
    ).toThrow(/numbers\.uno/);
  });

  it('replaces a step at an existing index and appends one past the end', () => {
    const lesson = getLesson('a1.hola.l2');
    const items = listItems();
    const seen = seenItemsBeforeLesson(
      getTopic(lesson.topic).lessons.map((id) => getLesson(id)),
      items,
      lesson.id,
    );
    const input = { lesson, items, seen, seed: 'override' };
    const clean = generateLessonSteps(input);
    const index = lesson.items.length;
    const overridden = generateLessonSteps({
      ...input,
      lesson: {
        ...lesson,
        overrides: [
          {
            index,
            type: 'speak_repeat',
            prompt_ru: 'Скажите медленнее',
            item: lesson.items[0],
          },
          {
            index: clean.length + 5,
            type: 'roleplay',
            prompt_ru: 'Сыграйте сцену',
            item: lesson.items[1],
          },
        ],
      },
    });

    expect(overridden).toHaveLength(clean.length + 1);
    expect(overridden.slice(0, index)).toEqual(clean.slice(0, index));
    expect(overridden[index]).toMatchObject({
      type: 'speak_repeat',
      prompt_ru: 'Скажите медленнее',
      itemIds: [lesson.items[0]],
    });
    expect(overridden[index + 1]).toEqual(clean[index + 1]);
    expect(overridden[overridden.length - 1]).toMatchObject({
      type: 'roleplay',
      prompt_ru: 'Сыграйте сцену',
      itemId: lesson.items[1],
    });
    expectIntroducedBeforeUse(overridden, new Set(seen.map((item) => item.id)));
  });
});

describe('seenItemsBeforeLesson', () => {
  it('returns units from earlier lessons of the topic, in teaching order', () => {
    const topic = getTopic('a1.hola');
    const ordered = topic.lessons.map((id) => getLesson(id));
    const items = listItems();

    expect(seenItemsBeforeLesson(ordered, items, 'a1.hola.l1')).toEqual([]);
    expect(seenItemsBeforeLesson(ordered, items, 'a1.hola.l2').map((item) => item.id)).toEqual([
      ...getLesson('a1.hola.l1').items,
    ]);

    const numbers = getTopic('a1.numbers').lessons.map((id) => getLesson(id));
    expect(seenItemsBeforeLesson(numbers, items, 'a1.numbers.l1')).toEqual([]);
    expect(() => seenItemsBeforeLesson(ordered, items, 'a1.numbers.l1')).toThrow(
      /Unknown lesson id/,
    );
  });
});

function word(id: string, es: string, ru: string): Item {
  return unit(id, 'word', es, ru, []);
}

function phrase(id: string, es: string, ru: string): Item {
  const tokens = es.split(' ');
  return unit(
    id,
    'phrase',
    es,
    ru,
    tokens.map((token) => ({ es: token, ru: token })),
  );
}

function unit(id: string, type: Item['type'], es: string, ru: string, parts: Item['parts']): Item {
  return {
    id,
    type,
    es,
    ru,
    parts,
    say_ru: 'тест',
    note_ru: null,
    why_ru: null,
    level: 'A1',
    variant: 'both',
    audio: { es: `${id}.mp3`, latam: null },
    tags: [],
    draft: true,
  };
}

function lessonOf(id: string, items: string[], speak: string[]): Lesson {
  return {
    id,
    topic: 'a1.demo',
    title_ru: 'Демо',
    items,
    speak,
    dialog: {
      lines: [
        { who: 'npc', es: 'Hola', ru: 'Привет' },
        { who: 'user', target: items[0] ?? id, options: [items[0] ?? id, items[1] ?? id] },
      ],
    },
    overrides: [],
    draft: true,
  };
}
