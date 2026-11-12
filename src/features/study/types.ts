import type { ReviewDirection } from '@/features/review/types';

export const STUDY_MODES = ['learn', 'flashcards', 'blitz', 'speak', 'test'] as const;

export type StudyMode = (typeof STUDY_MODES)[number];

export const STUDY_FILTERS = ['all', 'due', 'hard', 'unlearned'] as const;
export type StudyFilter = (typeof STUDY_FILTERS)[number];

/** `mixed` alternates recognition and recall. A step itself is one direction. */
export const STUDY_DIRECTIONS = ['es_to_ru', 'ru_to_es', 'mixed'] as const;
export type StudyDirectionSetting = (typeof STUDY_DIRECTIONS)[number];

export const ACCENT_LEVELS = ['relaxed', 'standard', 'strict'] as const;
export type AccentStrictness = (typeof ACCENT_LEVELS)[number];

export const STUDY_COUNTS = [5, 10, 20] as const;
export type StudyCount = (typeof STUDY_COUNTS)[number];

export const DEFAULT_STUDY_COUNT: StudyCount = 10;

/** Questions in one test. Separate from the shared session length. */
export const TEST_COUNTS = [10, 20, 30] as const;
export type TestCount = (typeof TEST_COUNTS)[number];

export const DEFAULT_TEST_COUNT: TestCount = 10;

/** Choice, typing, true/false, and matching. At least one stays on. */
export const TEST_KINDS = ['choice', 'input', 'true_false', 'pairs'] as const;
export type TestKind = (typeof TEST_KINDS)[number];

export type TestSettings = {
  count: TestCount;
  kinds: readonly TestKind[];
  direction: StudyDirectionSetting;
};

export const DEFAULT_TEST_SETTINGS: TestSettings = {
  count: DEFAULT_TEST_COUNT,
  kinds: TEST_KINDS,
  direction: 'es_to_ru',
};

/** Pairs on one match board. A leftover single item is left out. */
export const MATCH_BOARD_SIZE = 4;

export type StudySettings = {
  direction: StudyDirectionSetting;
  filter: StudyFilter;
  count: StudyCount;
  autoplay: boolean;
  accentStrictness: AccentStrictness;
  /** Live clock during blitz and pairs. Off until the learner asks for it. */
  showTimer: boolean;
};

export const DEFAULT_STUDY_SETTINGS: StudySettings = {
  direction: 'es_to_ru',
  filter: 'all',
  count: DEFAULT_STUDY_COUNT,
  autoplay: true,
  accentStrictness: 'standard',
  showTimer: false,
};

export type StudyPrefs = {
  settings: StudySettings;
  test: TestSettings;
  lastMode: StudyMode | null;
};

export const DEFAULT_STUDY_PREFS: StudyPrefs = {
  settings: DEFAULT_STUDY_SETTINGS,
  test: DEFAULT_TEST_SETTINGS,
  lastMode: null,
};

/**
 * One folder unit, plus the deck facts the planner needs.
 * `introduced` is true only after a lesson intro created the recognition card.
 */
export type StudyUnit = {
  id: string;
  es: string;
  tr: string;
  audio: string | null;
  introduced: boolean;
  /** Recognition-card state. Null when the unit has not been introduced. */
  state: 0 | 1 | 2 | 3 | null;
  due: boolean;
  hard: boolean;
  /** Recall card (translation → Spanish) already exists. */
  recall: boolean;
};

export type StudyPromptKey =
  'selectEs' | 'selectRu' | 'listen' | 'typeEs' | 'typeRu' | 'match' | 'speak';

export type StudyExerciseKind = 'select_translation' | 'listen_select' | 'type_translation';

type StepBase = {
  id: string;
  autoplay: boolean;
};

/** A step the lesson exercise components already know how to render. */
export type StudyExerciseStep = StepBase & {
  type: StudyExerciseKind;
  itemId: string;
  direction: ReviewDirection;
  promptKey: StudyPromptKey;
  prompt: string;
  options: readonly string[];
  answer: string;
  phraseEs: string;
  phraseTr: string;
  audio: string | null;
  /** Spell plays the Spanish clip before the learner types. */
  playEs: boolean;
};

export type StudyMatchPair = {
  left: string;
  right: string;
  itemId: string;
  es: string;
  tr: string;
};

export type StudyMatchStep = StepBase & {
  type: 'match_pairs';
  itemIds: readonly string[];
  promptKey: 'match';
  pairs: readonly StudyMatchPair[];
};

export type StudySpeakStep = StepBase & {
  type: 'speak_repeat';
  itemId: string;
  direction: ReviewDirection;
  promptKey: 'speak';
  promptEs: string;
  phraseTr: string;
  audio: string | null;
  accentStrictness: AccentStrictness;
  /** Score line the speaker should use for this strictness. */
  passScore: number;
};

/** One card in the flip deck. A swipe does not grade the FSRS schedule. */
export type StudyFlashcardStep = StepBase & {
  type: 'flashcard';
  itemId: string;
  direction: ReviewDirection;
  front: string;
  back: string;
  phraseEs: string;
  phraseTr: string;
  audio: string | null;
};

export type StudyStep = StudyExerciseStep | StudyMatchStep | StudySpeakStep | StudyFlashcardStep;

export type MasteryBand = 'new' | 'learning' | 'known';

export type MasteryCounts = Record<MasteryBand, number>;

export type StudyGrade = 'correct_first' | 'correct_after_error' | 'incorrect';
