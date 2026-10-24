import { z } from 'zod';

/** CEFR levels. Same scale as the lesson player. */
export const CefrLevelSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export type CefrLevel = z.infer<typeof CefrLevelSchema>;

/** Spanish regional variant. `both` is neutral Spain + Latin America. */
export const VariantSchema = z.enum(['es', 'latam', 'both']);
export type Variant = z.infer<typeof VariantSchema>;

/**
 * Course sections from the curriculum. Slugs are stable; titles live in i18n.
 * first_steps · food · shopping · city · travel · health · home · social ·
 * relocation · work · culture · dele
 */
export const TopicCategorySchema = z.enum([
  'first_steps',
  'food',
  'shopping',
  'city',
  'travel',
  'health',
  'home',
  'social',
  'relocation',
  'work',
  'culture',
  'dele',
]);
export type TopicCategory = z.infer<typeof TopicCategorySchema>;

export const ItemTypeSchema = z.enum(['word', 'phrase']);
export type ItemType = z.infer<typeof ItemTypeSchema>;

/** Exercise kinds a hand-written override can name. The player still generates steps. */
export const ExerciseTypeSchema = z.enum([
  'select_translation',
  'build_sentence',
  'type_translation',
  'listen_select',
  'listen_type',
  'speak_repeat',
  'match_pairs',
  'fill_gap',
  'conjugate',
  'reading_comprehension',
  'free_writing',
  'roleplay',
]);
export type ExerciseType = z.infer<typeof ExerciseTypeSchema>;

const ContentIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[._][a-z0-9]+)*$/)
  .max(100);

const PartSchema = z.object({
  es: z.string().min(1),
  ru: z.string().min(1),
});

const AudioSchema = z.object({
  es: z.string().min(1).nullable(),
  latam: z.string().min(1).nullable(),
});

/**
 * One teachable unit in the shared library (`content/items/<level>/*.json`).
 * `say_ru` is the Cyrillic pronunciation hint and is required on A1–A2.
 */
export const ItemSchema = z
  .object({
    id: ContentIdSchema,
    type: ItemTypeSchema,
    es: z.string().min(1),
    ru: z.string().min(1),
    parts: z.array(PartSchema).default([]),
    say_ru: z.string().min(1).nullable().default(null),
    note_ru: z.string().min(1).nullable().default(null),
    why_ru: z.string().min(1).nullable().default(null),
    level: CefrLevelSchema,
    variant: VariantSchema.default('both'),
    audio: AudioSchema.default({ es: null, latam: null }),
    tags: z.array(z.string().min(1)).default([]),
    /** Draft units are not shown as published course material. */
    draft: z.boolean().default(false),
  })
  .superRefine((item, ctx) => {
    if ((item.level === 'A1' || item.level === 'A2') && !item.say_ru) {
      ctx.addIssue({
        code: 'custom',
        path: ['say_ru'],
        message: 'say_ru is required for A1–A2',
      });
    }
  });
export type Item = z.infer<typeof ItemSchema>;

const NpcLineSchema = z.object({
  who: z.literal('npc'),
  es: z.string().min(1),
  ru: z.string().min(1),
});

const UserLineSchema = z.object({
  who: z.literal('user'),
  target: ContentIdSchema,
  options: z.array(ContentIdSchema).min(2),
});

export const DialogLineSchema = z.discriminatedUnion('who', [NpcLineSchema, UserLineSchema]);
export type DialogLine = z.infer<typeof DialogLineSchema>;

export const DialogSchema = z.object({
  lines: z.array(DialogLineSchema).min(1),
});
export type Dialog = z.infer<typeof DialogSchema>;

/**
 * Hand-written step at `index`.
 * An index inside the generated lesson replaces that step; a later index appends one.
 */
export const LessonOverrideSchema = z.object({
  index: z.number().int().nonnegative(),
  type: ExerciseTypeSchema,
  prompt_ru: z.string().min(1),
  item: ContentIdSchema.optional(),
});
export type LessonOverride = z.infer<typeof LessonOverrideSchema>;

/** A lesson inside a topic. Steps are generated from items, speak, and dialog. */
export const LessonSchema = z.object({
  id: ContentIdSchema,
  topic: ContentIdSchema,
  title_ru: z.string().min(1),
  items: z.array(ContentIdSchema).min(6).max(8),
  speak: z.array(ContentIdSchema).default([]),
  dialog: DialogSchema,
  overrides: z.array(LessonOverrideSchema).default([]),
  draft: z.boolean().default(false),
});
export type Lesson = z.infer<typeof LessonSchema>;

/** A situation the learner can handle, made of several lessons and a scene. */
export const TopicSchema = z.object({
  id: ContentIdSchema,
  level: CefrLevelSchema,
  category: TopicCategorySchema,
  title_ru: z.string().min(1),
  icon: z.string().min(1),
  can_do_ru: z.array(z.string().min(1)).min(1),
  lessons: z.array(ContentIdSchema).min(1),
  scene: ContentIdSchema,
  /** Day 1–7 of the starter course. Omitted when the topic is not in that week. */
  starter_day: z.number().int().min(1).max(7).optional(),
  draft: z.boolean().default(false),
});
export type Topic = z.infer<typeof TopicSchema>;

/** Closing role-play of a topic. Referenced by `topic.scene`. */
export const SceneSchema = z.object({
  id: ContentIdSchema,
  topic: ContentIdSchema,
  title_ru: z.string().min(1),
  draft: z.boolean().default(false),
});
export type Scene = z.infer<typeof SceneSchema>;
