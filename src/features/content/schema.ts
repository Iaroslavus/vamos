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

/**
 * Learner-facing copy in Russian, Ukrainian, and English.
 * A missing language is allowed here; the loader falls back to English,
 * and the content report lists the gap.
 */
export const LocalizedTextSchema = z
  .object({
    ru: z.string().min(1).optional(),
    uk: z.string().min(1).optional(),
    en: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.ru || value.uk || value.en), {
    message: 'at least one language is required',
  });
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

const PartSchema = z.object({
  es: z.string().min(1),
  tr: LocalizedTextSchema,
});

const nullablePath = z.string().min(1).nullable();

const SpeedPairSchema = z.object({
  es: nullablePath.default(null),
  latam: nullablePath.default(null),
});

/** One phrase or one part: Spain and Latin America, each at normal and slow speed. */
export const AudioTrackSchema = z.object({
  es: nullablePath.default(null),
  latam: nullablePath.default(null),
  slow: SpeedPairSchema.default({ es: null, latam: null }),
});
export type AudioTrack = z.infer<typeof AudioTrackSchema>;

/**
 * Recordings for a unit.
 * `source: "human"` is a narrator file and is never replaced by TTS.
 * A string in `es` / `latam` is the normal-speed clip (older content stays valid).
 */
export const AudioSchema = z.object({
  source: z.enum(['tts', 'human']).default('tts'),
  es: nullablePath.default(null),
  latam: nullablePath.default(null),
  slow: SpeedPairSchema.default({ es: null, latam: null }),
  parts: z.array(AudioTrackSchema).default([]),
});
export type Audio = z.infer<typeof AudioSchema>;

const EMPTY_SPEED = { es: null, latam: null } as const;

/** A fresh audio object. Use this in fixtures so every clip slot exists. */
export function blankAudio(
  overrides: {
    source?: Audio['source'];
    es?: string | null;
    latam?: string | null;
    slow?: { es?: string | null; latam?: string | null };
    parts?: Audio['parts'];
  } = {},
): Audio {
  return {
    source: overrides.source ?? 'tts',
    es: overrides.es ?? null,
    latam: overrides.latam ?? null,
    slow: {
      es: overrides.slow?.es ?? null,
      latam: overrides.slow?.latam ?? null,
    },
    parts: overrides.parts ?? [],
  };
}

export function blankTrack(
  overrides: {
    es?: string | null;
    latam?: string | null;
    slow?: { es?: string | null; latam?: string | null };
  } = {},
): AudioTrack {
  return {
    es: overrides.es ?? null,
    latam: overrides.latam ?? null,
    slow: {
      es: overrides.slow?.es ?? EMPTY_SPEED.es,
      latam: overrides.slow?.latam ?? EMPTY_SPEED.latam,
    },
  };
}

/**
 * One teachable unit in the shared library (`content/items/<level>/*.json`).
 * `say` is the pronunciation hint in the learner's own letters and is required on A1–A2.
 * `draft_i18n` marks Ukrainian and English that a native speaker has not checked yet.
 */
export const ItemSchema = z
  .object({
    id: ContentIdSchema,
    type: ItemTypeSchema,
    es: z.string().min(1),
    tr: LocalizedTextSchema,
    parts: z.array(PartSchema).default([]),
    say: LocalizedTextSchema.nullable().default(null),
    note: LocalizedTextSchema.nullable().default(null),
    why: LocalizedTextSchema.nullable().default(null),
    level: CefrLevelSchema,
    variant: VariantSchema.default('both'),
    audio: AudioSchema.default({
      source: 'tts',
      es: null,
      latam: null,
      slow: { es: null, latam: null },
      parts: [],
    }),
    tags: z.array(z.string().min(1)).default([]),
    /** Draft units are not shown as published course material. */
    draft: z.boolean().default(false),
    /** Ukrainian and English glosses are an unreviewed draft. */
    draft_i18n: z.boolean().default(false),
  })
  .superRefine((item, ctx) => {
    if ((item.level === 'A1' || item.level === 'A2') && !item.say) {
      ctx.addIssue({
        code: 'custom',
        path: ['say'],
        message: 'say is required for A1–A2',
      });
    }
  });
export type Item = z.infer<typeof ItemSchema>;

const NpcLineSchema = z.object({
  who: z.literal('npc'),
  es: z.string().min(1),
  tr: LocalizedTextSchema,
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
  prompt: LocalizedTextSchema,
  item: ContentIdSchema.optional(),
});
export type LessonOverride = z.infer<typeof LessonOverrideSchema>;

/** A lesson inside a topic. Steps are generated from items, speak, and dialog. */
export const LessonSchema = z.object({
  id: ContentIdSchema,
  topic: ContentIdSchema,
  title: LocalizedTextSchema,
  items: z.array(ContentIdSchema).min(6).max(8),
  speak: z.array(ContentIdSchema).default([]),
  dialog: DialogSchema,
  overrides: z.array(LessonOverrideSchema).default([]),
  draft: z.boolean().default(false),
  draft_i18n: z.boolean().default(false),
});
export type Lesson = z.infer<typeof LessonSchema>;

/** A situation the learner can handle, made of several lessons and a scene. */
export const TopicSchema = z.object({
  id: ContentIdSchema,
  level: CefrLevelSchema,
  category: TopicCategorySchema,
  title: LocalizedTextSchema,
  icon: z.string().min(1),
  can_do: z.array(LocalizedTextSchema).min(1),
  lessons: z.array(ContentIdSchema).min(1),
  scene: ContentIdSchema,
  /** Day 1–7 of the starter course. Omitted when the topic is not in that week. */
  starter_day: z.number().int().min(1).max(7).optional(),
  draft: z.boolean().default(false),
  draft_i18n: z.boolean().default(false),
});
export type Topic = z.infer<typeof TopicSchema>;

/** Closing role-play of a topic. Referenced by `topic.scene`. */
export const SceneSchema = z.object({
  id: ContentIdSchema,
  topic: ContentIdSchema,
  title: LocalizedTextSchema,
  draft: z.boolean().default(false),
  draft_i18n: z.boolean().default(false),
});
export type Scene = z.infer<typeof SceneSchema>;
