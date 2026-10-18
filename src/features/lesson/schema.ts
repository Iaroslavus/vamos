import { z } from 'zod';

/** CEFR levels supported by the course. */
export const CefrLevelSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export type CefrLevel = z.infer<typeof CefrLevelSchema>;

/**
 * Spanish regional variant for vocabulary / audio.
 * `both` = neutral Spain + LatAm (default for A1 drafts).
 */
export const VariantSchema = z.enum(['es', 'latam', 'both']);
export type Variant = z.infer<typeof VariantSchema>;

export const PartOfSpeechSchema = z.enum([
  'noun',
  'verb',
  'adj',
  'adv',
  'phrase',
  'pronoun',
  'numeral',
  'interjection',
  'other',
]);
export type PartOfSpeech = z.infer<typeof PartOfSpeechSchema>;

export const VocabularyItemSchema = z.object({
  id: z.string().min(1),
  es: z.string().min(1),
  ru: z.string().min(1),
  pos: PartOfSpeechSchema,
  audio: z.string().min(1).optional(),
  variant: VariantSchema.default('both'),
});
export type VocabularyItem = z.infer<typeof VocabularyItemSchema>;

const explainRu = z.string().min(1).optional();
const promptRu = z.string().min(1);
const audioPath = z.string().min(1).optional();
const acceptedAnswers = z.array(z.string().min(1)).min(1).optional();

/** Pick the correct translation from options. */
export const SelectTranslationExerciseSchema = z.object({
  type: z.literal('select_translation'),
  prompt_ru: promptRu,
  /** Phrase or word shown to the learner (ES or RU depending on direction). */
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  answer: z.string().min(1),
  audio: audioPath,
  explain_ru: explainRu,
});

/** Build a sentence from word tiles. */
export const BuildSentenceExerciseSchema = z.object({
  type: z.literal('build_sentence'),
  prompt_ru: promptRu,
  answer: z.string().min(1),
  accepted: acceptedAnswers,
  tiles: z.array(z.string().min(1)).min(2),
  audio: audioPath,
  explain_ru: explainRu,
});

/** Type a translation (free text, local + optional AI grade). */
export const TypeTranslationExerciseSchema = z.object({
  type: z.literal('type_translation'),
  prompt_ru: promptRu,
  prompt: z.string().min(1),
  direction: z.enum(['ru_to_es', 'es_to_ru']),
  answer: z.string().min(1),
  accepted: acceptedAnswers,
  audio: audioPath,
  explain_ru: explainRu,
});

/** Listen to audio and select the matching option. */
export const ListenSelectExerciseSchema = z.object({
  type: z.literal('listen_select'),
  prompt_ru: promptRu,
  audio: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  answer: z.string().min(1),
  explain_ru: explainRu,
});

/** Listen and type what you hear (dictation). */
export const ListenTypeExerciseSchema = z.object({
  type: z.literal('listen_type'),
  prompt_ru: promptRu,
  audio: z.string().min(1),
  answer: z.string().min(1),
  accepted: acceptedAnswers,
  explain_ru: explainRu,
});

/** Speak and get pronunciation feedback. */
export const SpeakRepeatExerciseSchema = z.object({
  type: z.literal('speak_repeat'),
  prompt_ru: promptRu,
  prompt_es: z.string().min(1),
  audio: z.string().min(1),
  explain_ru: explainRu,
});

/** Match pairs (ES ↔ RU or similar). */
export const MatchPairsExerciseSchema = z.object({
  type: z.literal('match_pairs'),
  prompt_ru: promptRu,
  pairs: z
    .array(
      z.object({
        left: z.string().min(1),
        right: z.string().min(1),
      }),
    )
    .min(2),
  explain_ru: explainRu,
});

/** Fill a blank in a Spanish sentence. */
export const FillGapExerciseSchema = z.object({
  type: z.literal('fill_gap'),
  prompt_ru: promptRu,
  /** Spanish sentence with `___` marking the gap. */
  sentence_es: z
    .string()
    .min(1)
    .refine((s) => s.includes('___'), {
      message: 'sentence_es must contain a ___ gap marker',
    }),
  answer: z.string().min(1),
  accepted: acceptedAnswers,
  /** Optional multiple-choice options for the gap. */
  options: z.array(z.string().min(1)).min(2).optional(),
  audio: audioPath,
  explain_ru: explainRu,
});

/** Conjugate a verb form. */
export const ConjugateExerciseSchema = z.object({
  type: z.literal('conjugate'),
  prompt_ru: promptRu,
  verb: z.string().min(1),
  tense: z.string().min(1),
  person: z.string().min(1),
  answer: z.string().min(1),
  accepted: acceptedAnswers,
  explain_ru: explainRu,
});

const ReadingQuestionSchema = z.object({
  prompt_ru: promptRu,
  options: z.array(z.string().min(1)).min(2),
  answer: z.string().min(1),
});

/** Short reading passage with comprehension questions. */
export const ReadingComprehensionExerciseSchema = z.object({
  type: z.literal('reading_comprehension'),
  prompt_ru: promptRu,
  passage_es: z.string().min(1),
  passage_ru: z.string().min(1).optional(),
  questions: z.array(ReadingQuestionSchema).min(1),
  explain_ru: explainRu,
});

/** Free writing graded by AI (B1+). */
export const FreeWritingExerciseSchema = z.object({
  type: z.literal('free_writing'),
  prompt_ru: promptRu,
  prompt_es: z.string().min(1).optional(),
  min_words: z.number().int().positive().default(20),
  rubric_ru: z.string().min(1).optional(),
  explain_ru: explainRu,
});

/** AI roleplay dialogue scenario. */
export const RoleplayExerciseSchema = z.object({
  type: z.literal('roleplay'),
  prompt_ru: promptRu,
  scenario_ru: z.string().min(1),
  scenario_es: z.string().min(1).optional(),
  ai_role_ru: z.string().min(1),
  user_goal_ru: z.string().min(1),
  starter_es: z.string().min(1).optional(),
  suggested_phrases: z.array(z.string().min(1)).optional(),
  explain_ru: explainRu,
});

export const ExerciseSchema = z.discriminatedUnion('type', [
  SelectTranslationExerciseSchema,
  BuildSentenceExerciseSchema,
  TypeTranslationExerciseSchema,
  ListenSelectExerciseSchema,
  ListenTypeExerciseSchema,
  SpeakRepeatExerciseSchema,
  MatchPairsExerciseSchema,
  FillGapExerciseSchema,
  ConjugateExerciseSchema,
  ReadingComprehensionExerciseSchema,
  FreeWritingExerciseSchema,
  RoleplayExerciseSchema,
]);
export type Exercise = z.infer<typeof ExerciseSchema>;
export type ExerciseType = Exercise['type'];

export const LessonSchema = z.object({
  id: z.string().min(1),
  level: CefrLevelSchema,
  unit: z.number().int().positive(),
  title_ru: z.string().min(1),
  /** Draft lessons are not shown in production path until reviewed. */
  draft: z.boolean().default(false),
  new_items: z.array(VocabularyItemSchema).default([]),
  exercises: z.array(ExerciseSchema).min(1),
});
export type Lesson = z.infer<typeof LessonSchema>;

export function parseLesson(data: unknown): Lesson {
  return LessonSchema.parse(data);
}

export function safeParseLesson(data: unknown) {
  return LessonSchema.safeParse(data);
}
