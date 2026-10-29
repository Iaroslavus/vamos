import { z } from 'zod';

import { contentIssues, type ContentBundle } from '../integrity';
import { translationGaps } from '../translations';
import {
  blankAudio,
  CefrLevelSchema,
  ItemSchema,
  LessonSchema,
  SceneSchema,
  TopicCategorySchema,
  TopicSchema,
  type Item,
  type Lesson,
  type Scene,
  type Topic,
  type TopicCategory,
  type CefrLevel,
} from '../schema';

export const EMPTY_CONTENT: ContentBundle = {
  items: [],
  topics: [],
  lessons: [],
  scenes: [],
};

/** What the author passes in. The model fills units, lessons, and the scene. */
export type TopicSpec = {
  level: CefrLevel;
  category: TopicCategory;
  titleRu: string;
  icon: string;
  slug: string;
  canDoRu: string[];
  starterDay?: number;
};

export type TopicDraft = {
  items: Item[];
  topic: Topic;
  lessons: Lesson[];
  scene: Scene;
};

const RawDraftSchema = z.object({
  items: z.array(ItemSchema).min(1),
  topic: TopicSchema,
  lessons: z.array(LessonSchema).min(1).max(4),
  scene: SceneSchema,
});

export function topicIdFor(spec: TopicSpec): string {
  return `${spec.level.toLowerCase()}.${spec.slug}`;
}

/** Model output → schema, then every row is an unpublished draft with no invented audio. */
export function parseModelDraft(text: string): TopicDraft {
  let json: unknown;
  try {
    json = JSON.parse(stripFences(text)) as unknown;
  } catch {
    throw new Error('Model response is not JSON');
  }
  return forceDraft(RawDraftSchema.parse(json));
}

export function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return (fenced?.[1] ?? trimmed).trim();
}

export function forceDraft(draft: TopicDraft): TopicDraft {
  return {
    items: draft.items.map(canonicalItem),
    topic: { ...draft.topic, draft: true, draft_i18n: true },
    lessons: draft.lessons.map((lesson) => ({ ...lesson, draft: true, draft_i18n: true })),
    scene: { ...draft.scene, draft: true, draft_i18n: true },
  };
}

/**
 * Structural and link checks for one generated topic.
 * Issues already present in `existing` are ignored so a draft can reuse the library.
 */
export function draftIssues(
  draft: TopicDraft,
  spec: TopicSpec,
  existing: ContentBundle = EMPTY_CONTENT,
): string[] {
  const issues: string[] = [];
  const id = topicIdFor(spec);

  if (draft.topic.id !== id) issues.push(`topic id must be ${id}`);
  if (draft.topic.level !== spec.level) issues.push(`topic level must be ${spec.level}`);
  if (draft.topic.category !== spec.category) {
    issues.push(`topic category must be ${spec.category}`);
  }
  if (draft.topic.title.ru !== spec.titleRu) issues.push('topic title.ru must match the spec');
  if (draft.topic.icon !== spec.icon) issues.push('topic icon must match the spec');
  const canDoRu = draft.topic.can_do.map((goal) => goal.ru ?? '');
  if (canDoRu.join('\n') !== spec.canDoRu.join('\n')) {
    issues.push('topic can_do.ru must match the spec');
  }
  if ((draft.topic.starter_day ?? null) !== (spec.starterDay ?? null)) {
    issues.push('topic starter_day must match the spec');
  }
  if (draft.scene.id !== draft.topic.scene) {
    issues.push(`scene id must be ${draft.topic.scene}`);
  }
  if (draft.scene.topic !== draft.topic.id) {
    issues.push(`scene topic must be ${draft.topic.id}`);
  }

  const lessonIds = draft.lessons.map((lesson) => lesson.id);
  if (draft.topic.lessons.join('\n') !== lessonIds.join('\n')) {
    issues.push('topic.lessons must list the lesson ids in file order');
  }

  const lessonCount = spec.starterDay === undefined ? 4 : 2;
  if (draft.lessons.length !== lessonCount) {
    issues.push(`expected ${lessonCount} lessons, got ${draft.lessons.length}`);
  }
  if (spec.starterDay === undefined) {
    issues.push(...fullTopicSizeIssues(draft));
  }

  for (const lesson of draft.lessons) {
    if (lesson.topic !== draft.topic.id) {
      issues.push(`lesson ${lesson.id} topic must be ${draft.topic.id}`);
    }
    if (!lesson.id.startsWith(`${draft.topic.id}.`)) {
      issues.push(`lesson ${lesson.id} id must start with ${draft.topic.id}`);
    }
    if (lesson.speak.length < 2 || lesson.speak.length > 3) {
      issues.push(`lesson ${lesson.id} has ${lesson.speak.length} speak lines, expected 2–3`);
    }
    const lines = lesson.dialog.lines.length;
    if (lines < 4 || lines > 6) {
      issues.push(`lesson ${lesson.id} dialog has ${lines} lines, expected 4–6`);
    }
  }

  for (const item of draft.items) issues.push(...phrasePartIssues(item));
  for (const gap of translationGaps({
    items: draft.items,
    topics: [draft.topic],
    lessons: draft.lessons,
    scenes: [draft.scene],
  })) {
    issues.push(`missing ${gap.locale} translation: ${gap.ref}`);
  }

  const merged = mergeContent(existing, draft);
  const byId = new Map(merged.items.map((item) => [item.id, item]));
  for (const lesson of draft.lessons) issues.push(...phraseShareIssues(lesson, byId));

  const before = new Set(contentIssues(existing));
  for (const issue of contentIssues(merged)) {
    if (!before.has(issue)) issues.push(issue);
  }
  return issues;
}

export function topicPrompt(spec: TopicSpec): { system: string; user: string } {
  const id = topicIdFor(spec);
  const lessons = spec.starterDay === undefined ? 4 : 2;
  const day =
    spec.starterDay === undefined
      ? 'This topic is not in the starter week. Write exactly 4 lessons and 28 units (7 in each lesson, within 25–30). Put each unit in only one lesson.'
      : `starter_day is ${spec.starterDay}. Write exactly 2 lessons so the day stays about 10 minutes.`;

  return {
    system: [
      'You write draft Spanish course topics for learners who read Russian, Ukrainian, or English.',
      'Reply with one JSON object and no markdown.',
      'Spanish is neutral (Spain and Latin America). Mark real differences with variant "es" or "latam"; otherwise "both".',
      'About 60% of units are phrases. At most 3 words per lesson. Each lesson has 6–8 units.',
      'A phrase needs parts (at least 2). Join part.es with a single space and it must equal es. Each part has tr, not a bare ru string.',
      'parts[].tr is a literal gloss of that Spanish piece: the gender, number, and case of the piece itself. Never gloss a piece with the meaning of the whole phrase. buenos días → buenos "добрые/добрі/good", días "дни/дні/days", never "утро/ранок/morning".',
      'tr is the natural translation of the whole phrase ("доброе утро", "добрий ранок" or "доброго ранку", "good morning"), not a word-for-word calque.',
      'When that word-for-word reading differs from tr, add literal {"ru","uk","en"} with the word-for-word sentence, for example "добрые дни" / "добрі дні" / "good days". Omit literal when it would match tr.',
      'Every learner-facing string is an object {"ru","uk","en"}: tr, literal, say, note, why, title, can_do, lesson and scene titles, npc dialog lines (tr), and parts[].tr.',
      'Write all three languages in the same response. Do not leave uk or en empty.',
      "A1 and A2 units need say: a pronunciation hint in the learner's own letters. Russian and Ukrainian use Cyrillic. English uses a Latin respelling. Above A2, say is null.",
      'speak lists 2–3 unit ids from that lesson. dialog has 4–6 lines.',
      'User dialog options and the target must be ids from that lesson or an earlier lesson of the same topic.',
      'Set draft and draft_i18n to true. audio.es and audio.latam are null.',
      'Ids: topic ' +
        id +
        ', scene ' +
        id +
        '.scene, lessons ' +
        id +
        '.l1 onward, items ' +
        spec.slug +
        '.snake_case.',
    ].join('\n'),
    user: [
      `level: ${spec.level}`,
      `category: ${spec.category}`,
      `title.ru: ${spec.titleRu}`,
      `icon: ${spec.icon}`,
      `can_do.ru: ${spec.canDoRu.join(' | ')}`,
      'Copy those Russian strings exactly, then add uk and en for the title, every can_do, and every other gloss.',
      day,
      `Write exactly ${lessons} lessons plus a scene title.`,
      'Shape: {"items":[...],"topic":{...},"lessons":[...],"scene":{...}}',
    ].join('\n'),
  };
}

export function chatCompletionBody(model: string, system: string, user: string): string {
  return JSON.stringify({
    model,
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
}

const CompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      }),
    )
    .min(1),
});

export function readCompletion(payload: unknown): string {
  return CompletionSchema.parse(payload).choices[0]?.message.content ?? '';
}

export function mergeContent(existing: ContentBundle, draft: TopicDraft): ContentBundle {
  return {
    items: [...existing.items, ...draft.items],
    topics: [...existing.topics, draft.topic],
    lessons: [...existing.lessons, ...draft.lessons],
    scenes: [...existing.scenes, draft.scene],
  };
}

export const TopicSpecSchema = z.object({
  level: CefrLevelSchema,
  category: TopicCategorySchema,
  titleRu: z.string().min(1),
  icon: z.string().min(1),
  slug: z.string().regex(/^[a-z][a-z0-9]*$/),
  canDoRu: z.array(z.string().min(1)).min(1),
  starterDay: z.number().int().min(1).max(7).optional(),
});

function canonicalItem(item: Item): Item {
  return {
    id: item.id,
    type: item.type,
    es: item.es,
    tr: item.tr,
    literal: item.literal,
    parts: item.parts,
    say: item.say,
    note: item.note,
    why: item.why,
    level: item.level,
    variant: item.variant,
    audio: blankAudio(),
    tags: item.tags,
    draft: true,
    draft_i18n: true,
  };
}

const FULL_TOPIC_MIN_UNITS = 25;
const FULL_TOPIC_MAX_UNITS = 30;

/** A topic outside the starter week is a full situation: 25–30 units, each taught once. */
function fullTopicSizeIssues(draft: TopicDraft): string[] {
  const issues: string[] = [];
  if (draft.items.length < FULL_TOPIC_MIN_UNITS || draft.items.length > FULL_TOPIC_MAX_UNITS) {
    issues.push(`expected 25–30 units, got ${draft.items.length}`);
  }

  const placements = new Map<string, number>();
  for (const lesson of draft.lessons) {
    for (const id of lesson.items) {
      placements.set(id, (placements.get(id) ?? 0) + 1);
    }
  }
  for (const item of draft.items) {
    const count = placements.get(item.id) ?? 0;
    if (count !== 1) issues.push(`item ${item.id} must be in exactly one lesson`);
  }
  return issues;
}

function phrasePartIssues(item: Item): string[] {
  if (item.type !== 'phrase') return [];
  if (item.parts.length < 2) return [`item ${item.id} phrase needs at least 2 parts`];
  const rebuilt = item.parts.map((part) => part.es).join(' ');
  if (rebuilt !== item.es) return [`item ${item.id} parts do not rebuild es`];
  return [];
}

function phraseShareIssues(lesson: Lesson, items: ReadonlyMap<string, Item>): string[] {
  let phrases = 0;
  let known = 0;
  for (const id of lesson.items) {
    const item = items.get(id);
    if (!item) continue;
    known += 1;
    if (item.type === 'phrase') phrases += 1;
  }
  if (known === 0) return [];
  if (phrases / known < 0.5) {
    return [`lesson ${lesson.id} phrase share is below half`];
  }
  return [];
}
