import { create } from 'zustand';

import { gradeAnswer, type GradeResult } from './grading';
import type { VocabularyItem } from './schema';

/** Soft life cap for free-tier lessons (DESIGN.md). */
export const DEFAULT_MAX_HEARTS = 5;

export const XP_CORRECT = 10;
export const XP_ALMOST = 8;

type LessonExerciseBase = {
  id: string;
  answer: string;
  accepted?: readonly string[];
  prompt_ru: string;
  /** Spanish the result sheet shows and speaks. */
  phraseEs?: string;
  /** Gloss in the interface language. */
  phraseTr?: string;
  /** Vocabulary cards behind this exercise. */
  itemIds?: readonly string[];
  /** Normal-speed clip. Missing → device speech of `phraseEs`. */
  audio?: string | null;
};

export type SelectTranslationItem = LessonExerciseBase & {
  type: 'select_translation';
  prompt: string;
  options: readonly string[];
};

export type BuildSentenceItem = LessonExerciseBase & {
  type: 'build_sentence';
  tiles: readonly string[];
};

export type ListenSelectItem = LessonExerciseBase & {
  type: 'listen_select';
  options: readonly string[];
  /** Pre-rendered slow clip. Missing → device speech, not a stretched normal file. */
  slowAudio?: string;
  /** Catalog id used to pick the profile's Spanish variant at play time. */
  itemId?: string;
  speakText: string;
};

export type MatchPair = {
  left: string;
  right: string;
};

export type MatchPairsItem = LessonExerciseBase & {
  type: 'match_pairs';
  pairs: readonly MatchPair[];
};

export type TypeTranslationItem = LessonExerciseBase & {
  type: 'type_translation';
  prompt: string;
  direction: 'ru_to_es' | 'es_to_ru';
};

export type FillGapItem = LessonExerciseBase & {
  type: 'fill_gap';
  /** Spanish sentence with `___` gap marker. */
  sentence_es: string;
  options?: readonly string[];
};

/** Playable exercise payload for the lesson session (MVP types). */
export type LessonExerciseItem =
  | SelectTranslationItem
  | BuildSentenceItem
  | ListenSelectItem
  | MatchPairsItem
  | TypeTranslationItem
  | FillGapItem;

export type LessonSessionStatus =
  'idle' | 'active' | 'feedback' | 'mistakes_intro' | 'completed' | 'failed';

/** How the session advances. `script` walks generated steps; `queue` is the exercise list. */
export type LessonFlow = 'queue' | 'script';

export type ScriptKind = 'intro' | 'exercise' | 'speak' | 'dialog' | 'prompt';

export type ScriptEntry = {
  id: string;
  kind: ScriptKind;
};

export type LessonProgress = {
  /** Successful checks (correct + almost). */
  solved: number;
  /** Original exercise count when the lesson started. */
  total: number;
  /** 0–1 ratio capped at 1 (retries beyond total do not exceed). */
  ratio: number;
};

export type DialogLineRecord = {
  stepId: string;
  lineIndex: number;
  itemId: string;
  /** Spanish the learner should have sent. */
  answer: string;
  /** Spanish option labels, including the answer. */
  options: readonly string[];
  /** Russian meaning, shown as the retry prompt. */
  prompt: string;
  /** Caption above the retry exercise. */
  promptRu: string;
  /** True when the first tap was wrong. */
  missed: boolean;
};

export type DialogLineRecordResult = {
  applied: boolean;
  failed: boolean;
  hearts: number;
};

export function dialogRetryExerciseId(stepId: string, lineIndex: number): string {
  return `dialog-retry:${stepId}:${lineIndex}`;
}

type StartLessonInput = {
  lessonId: string;
  exercises: readonly LessonExerciseItem[];
  /** New vocabulary shown on the summary screen. */
  newItems?: readonly VocabularyItem[];
  /** Override starting hearts (defaults to DEFAULT_MAX_HEARTS). */
  hearts?: number;
  maxHearts?: number;
  /** Injectable clock for tests. */
  now?: () => number;
};

type StartScriptInput = {
  lessonId: string;
  /** Generated steps in teaching order. Exercise ids must exist in `exercises`. */
  script: readonly ScriptEntry[];
  exercises: readonly LessonExerciseItem[];
  /** Units from the lesson intro, shown on the summary and sent to FSRS. */
  newItems?: readonly VocabularyItem[];
  hearts?: number;
  maxHearts?: number;
  now?: () => number;
};

export type LessonSummary = {
  lessonId: string | null;
  status: LessonSessionStatus;
  xpEarned: number;
  /** 0–1 share of non-wrong checks. */
  accuracy: number;
  elapsedMs: number;
  newItems: VocabularyItem[];
  correctCount: number;
  almostCount: number;
  wrongCount: number;
};

type LessonStoreState = {
  status: LessonSessionStatus;
  /** `script` until the generated steps are done, then the mistake queue uses `queue`. */
  flow: LessonFlow;
  script: ScriptEntry[];
  scriptIndex: number;
  /** Generated step count. Zero for a queue-only session (review). */
  stepTotal: number;
  /** Steps already left. The lesson bar is `stepsCompleted / stepTotal`. */
  stepsCompleted: number;
  lessonId: string | null;
  /** Snapshot of exercises for the active session (id → item). */
  exerciseById: Record<string, LessonExerciseItem>;
  /** Remaining work: head is current; wrongs are appended to the end. */
  queue: string[];
  /** Ids from the initial start (stable progress denominator). */
  initialIds: string[];
  /**
   * How many main-pass exercises still need to be dismissed via continue.
   * Hits 0 when the original set is done; remaining queue items are retries.
   */
  mainPassesLeft: number;
  /** Mistakes intro is shown at most once per lesson session. */
  mistakesIntroShown: boolean;
  newItems: VocabularyItem[];
  userAnswer: string;
  lastGrade: GradeResult | null;
  hearts: number;
  maxHearts: number;
  xpEarned: number;
  correctCount: number;
  almostCount: number;
  wrongCount: number;
  startedAt: number | null;
  finishedAt: number | null;
  /** Frozen result for the summary screen. Null until `finishLesson`. */
  summary: LessonSummary | null;
  /** True after the first completion write has been claimed for this session. */
  completionSaved: boolean;
  /** `${stepId}:${lineIndex}` already written by `recordDialogLine`. */
  dialogLineKeys: string[];
  getNow: () => number;
};

type LessonStoreActions = {
  startLesson: (input: StartLessonInput) => void;
  /**
   * Start a generated lesson.
   * Intro, speak, and other ungated steps advance with `advanceStep` and do not
   * spend hearts. Graded steps use `checkAnswer`. Misses wait until the script ends.
   */
  startScript: (input: StartScriptInput) => void;
  setAnswer: (value: string) => void;
  /** Grade current answer; moves session to `feedback` (or `failed` if hearts hit 0). */
  checkAnswer: () => GradeResult | null;
  /**
   * Finish match_pairs once every correct pair is locked.
   * Zero mistakes is a correct answer. Any mistake is one wrong answer,
   * and `mistakes` is how many pairs were chosen wrong.
   */
  completeMatchPairs: (outcome: {
    mistakes: number;
    wrongKeys: readonly string[];
  }) => GradeResult | null;
  /**
   * After feedback sheet: advance queue.
   * Wrongs were already enqueued at check time; correct/almost just shift.
   * When the main pass ends with retries left → `mistakes_intro` (once).
   */
  continueAfterFeedback: () => void;
  /**
   * Leave an intro, speak, dialog, or other ungated step.
   * Does not change hearts, XP, or the correct/wrong counts.
   */
  advanceStep: () => void;
  /** Dismiss the mistakes intro and start the retry queue. */
  continueMistakesIntro: () => void;
  reset: () => void;
  /**
   * Freeze the summary once when the session is completed or failed.
   * Later calls return the same object.
   */
  finishLesson: () => LessonSummary | null;
  /**
   * Claim the single progress write for this session.
   * Returns false when the summary is missing or the write was already claimed.
   */
  claimCompletionSave: () => boolean;
  /**
   * Record one dialog user-line.
   * A first-try hit awards XP. A miss (wrong, even if the second chance lands)
   * spends a heart and appends a select-translation retry for the mistakes round.
   */
  recordDialogLine: (record: DialogLineRecord) => DialogLineRecordResult;
  getCurrentExercise: () => LessonExerciseItem | null;
  getProgress: () => LessonProgress;
  getElapsedMs: () => number;
  getSummary: () => LessonSummary;
};

export type LessonStore = LessonStoreState & LessonStoreActions;

const idleState = (): LessonStoreState => ({
  status: 'idle',
  flow: 'queue',
  script: [],
  scriptIndex: 0,
  stepTotal: 0,
  stepsCompleted: 0,
  lessonId: null,
  exerciseById: {},
  queue: [],
  initialIds: [],
  mainPassesLeft: 0,
  mistakesIntroShown: false,
  newItems: [],
  userAnswer: '',
  lastGrade: null,
  hearts: DEFAULT_MAX_HEARTS,
  maxHearts: DEFAULT_MAX_HEARTS,
  xpEarned: 0,
  correctCount: 0,
  almostCount: 0,
  wrongCount: 0,
  startedAt: null,
  finishedAt: null,
  summary: null,
  completionSaved: false,
  dialogLineKeys: [],
  getNow: Date.now,
});

function elapsedMs(state: Pick<LessonStoreState, 'startedAt' | 'finishedAt' | 'getNow'>): number {
  if (state.startedAt === null) return 0;
  const end = state.finishedAt ?? state.getNow();
  return Math.max(0, end - state.startedAt);
}

function buildSummary(state: LessonStoreState): LessonSummary {
  const attempts = state.correctCount + state.almostCount + state.wrongCount;
  const accuracy = attempts === 0 ? 0 : (state.correctCount + state.almostCount) / attempts;

  return {
    lessonId: state.lessonId,
    status: state.status,
    xpEarned: state.xpEarned,
    accuracy,
    elapsedMs: elapsedMs(state),
    newItems: state.newItems,
    correctCount: state.correctCount,
    almostCount: state.almostCount,
    wrongCount: state.wrongCount,
  };
}

function buildExerciseMap(
  exercises: readonly LessonExerciseItem[],
): Record<string, LessonExerciseItem> {
  const map: Record<string, LessonExerciseItem> = {};
  for (const exercise of exercises) {
    if (map[exercise.id]) {
      throw new Error(`Duplicate exercise id: ${exercise.id}`);
    }
    map[exercise.id] = exercise;
  }
  return map;
}

function xpForStatus(status: GradeResult['status']): number {
  if (status === 'correct') return XP_CORRECT;
  if (status === 'almost') return XP_ALMOST;
  return 0;
}

function scriptExerciseId(script: readonly ScriptEntry[], index: number): string | undefined {
  const entry = script[index];
  if (!entry || entry.kind !== 'exercise') return undefined;
  return entry.id;
}

function currentExerciseId(state: LessonStoreState): string | undefined {
  return state.flow === 'script'
    ? scriptExerciseId(state.script, state.scriptIndex)
    : state.queue[0];
}

/** Apply a grade the same way a «Проверить» tap does. */
function commitGrade(
  state: LessonStoreState,
  currentId: string,
  result: GradeResult,
): Partial<LessonStoreState> {
  if (result.status === 'correct') {
    return {
      status: 'feedback',
      lastGrade: result,
      correctCount: state.correctCount + 1,
      xpEarned: state.xpEarned + xpForStatus(result.status),
    };
  }

  if (result.status === 'almost') {
    return {
      status: 'feedback',
      lastGrade: result,
      almostCount: state.almostCount + 1,
      xpEarned: state.xpEarned + xpForStatus(result.status),
    };
  }

  const hearts = Math.max(0, state.hearts - 1);
  const queue = [...state.queue, currentId];

  if (hearts === 0) {
    return {
      status: 'failed',
      lastGrade: result,
      wrongCount: state.wrongCount + 1,
      hearts,
      queue,
      finishedAt: state.getNow(),
    };
  }

  return {
    status: 'feedback',
    lastGrade: result,
    wrongCount: state.wrongCount + 1,
    hearts,
    queue,
  };
}

/** Move past the current generated step. Hearts and scores stay as they are. */
function leaveScriptStep(state: LessonStoreState): Partial<LessonStoreState> {
  const scriptIndex = state.scriptIndex + 1;
  const stepsCompleted = state.stepsCompleted + 1;
  const cleared = {
    userAnswer: '',
    lastGrade: null,
    scriptIndex,
    stepsCompleted,
  };

  if (scriptIndex < state.script.length) {
    return { ...cleared, status: 'active' };
  }

  if (state.queue.length > 0) {
    return {
      ...cleared,
      flow: 'queue',
      status: 'mistakes_intro',
      mainPassesLeft: 0,
      mistakesIntroShown: true,
    };
  }

  return {
    ...cleared,
    flow: 'queue',
    status: 'completed',
    mainPassesLeft: 0,
    queue: [],
    finishedAt: state.getNow(),
  };
}

export const useLessonStore = create<LessonStore>()((set, get) => ({
  ...idleState(),

  startLesson: ({ lessonId, exercises, newItems, hearts, maxHearts, now }) => {
    if (exercises.length === 0) {
      throw new Error('Cannot start a lesson with no exercises');
    }

    const exerciseById = buildExerciseMap(exercises);
    const initialIds = exercises.map((item) => item.id);
    const max = maxHearts ?? DEFAULT_MAX_HEARTS;
    const startHearts = hearts ?? max;
    const getNow = now ?? Date.now;

    set({
      ...idleState(),
      status: 'active',
      lessonId,
      exerciseById,
      queue: [...initialIds],
      initialIds,
      mainPassesLeft: initialIds.length,
      mistakesIntroShown: false,
      newItems: [...(newItems ?? [])],
      hearts: startHearts,
      maxHearts: max,
      startedAt: getNow(),
      getNow,
    });
  },

  startScript: ({ lessonId, script, exercises, newItems, hearts, maxHearts, now }) => {
    if (script.length === 0) {
      throw new Error('Cannot start a lesson with no steps');
    }

    const exerciseById = buildExerciseMap(exercises);
    for (const entry of script) {
      if (entry.kind === 'exercise' && !exerciseById[entry.id]) {
        throw new Error(`Missing exercise for step ${entry.id}`);
      }
    }

    const max = maxHearts ?? DEFAULT_MAX_HEARTS;
    const startHearts = hearts ?? max;
    const getNow = now ?? Date.now;

    set({
      ...idleState(),
      status: 'active',
      flow: 'script',
      script: script.map((entry) => ({ id: entry.id, kind: entry.kind })),
      scriptIndex: 0,
      stepTotal: script.length,
      stepsCompleted: 0,
      lessonId,
      exerciseById,
      queue: [],
      initialIds: script.map((entry) => entry.id),
      mainPassesLeft: script.length,
      mistakesIntroShown: false,
      newItems: [...(newItems ?? [])],
      hearts: startHearts,
      maxHearts: max,
      startedAt: getNow(),
      getNow,
    });
  },

  setAnswer: (value) => {
    const { status } = get();
    if (status !== 'active') return;
    set({ userAnswer: value });
  },

  checkAnswer: () => {
    const state = get();
    if (state.status !== 'active') return null;

    const currentId = currentExerciseId(state);
    if (!currentId) return null;

    const exercise = state.exerciseById[currentId];
    if (!exercise) return null;

    const result = gradeAnswer({
      userAnswer: state.userAnswer,
      answer: exercise.answer,
      accepted: exercise.accepted,
    });

    set(commitGrade(state, currentId, result));
    return result;
  },

  completeMatchPairs: ({ mistakes, wrongKeys }) => {
    const state = get();
    if (state.status !== 'active') return null;

    const currentId = currentExerciseId(state);
    if (!currentId) return null;

    const exercise = state.exerciseById[currentId];
    if (!exercise || exercise.type !== 'match_pairs') return null;

    const result: GradeResult =
      mistakes > 0
        ? { status: 'wrong', correctAnswer: exercise.answer, mistakes, wrongKeys }
        : { status: 'correct', correctAnswer: exercise.answer, mistakes: 0, wrongKeys: [] };

    set(commitGrade(state, currentId, result));
    return result;
  },

  continueAfterFeedback: () => {
    const state = get();
    if (state.status === 'failed' || state.status === 'completed' || state.status === 'idle') {
      return;
    }
    if (state.status !== 'feedback') return;

    if (state.flow === 'script') {
      set(leaveScriptStep(state));
      return;
    }

    const grade = state.lastGrade;
    if (!grade) return;

    const queue = [...state.queue];
    // Drop the answered head (retry copy may still sit at the end if wrong).
    queue.shift();

    if (queue.length === 0) {
      set({
        status: 'completed',
        queue: [],
        userAnswer: '',
        lastGrade: null,
        mainPassesLeft: 0,
        finishedAt: state.getNow(),
      });
      return;
    }

    const mainPassesLeft = Math.max(0, state.mainPassesLeft - 1);
    const enteringRetries = mainPassesLeft === 0 && !state.mistakesIntroShown && queue.length > 0;

    if (enteringRetries) {
      set({
        status: 'mistakes_intro',
        queue,
        userAnswer: '',
        lastGrade: null,
        mainPassesLeft: 0,
        mistakesIntroShown: true,
      });
      return;
    }

    set({
      status: 'active',
      queue,
      userAnswer: '',
      lastGrade: null,
      mainPassesLeft,
    });
  },

  advanceStep: () => {
    const state = get();
    if (state.flow !== 'script' || state.status !== 'active') return;
    const entry = state.script[state.scriptIndex];
    if (!entry || entry.kind === 'exercise') return;
    set(leaveScriptStep(state));
  },

  continueMistakesIntro: () => {
    const state = get();
    if (state.status !== 'mistakes_intro') return;
    if (state.queue.length === 0) {
      set({
        status: 'completed',
        userAnswer: '',
        lastGrade: null,
        finishedAt: state.getNow(),
      });
      return;
    }
    set({
      status: 'active',
      userAnswer: '',
      lastGrade: null,
    });
  },

  recordDialogLine: (record) => {
    const state = get();
    if (state.status !== 'active') {
      return { applied: false, failed: state.status === 'failed', hearts: state.hearts };
    }

    const key = `${record.stepId}:${record.lineIndex}`;
    if (state.dialogLineKeys.includes(key)) {
      return { applied: false, failed: false, hearts: state.hearts };
    }

    const dialogLineKeys = [...state.dialogLineKeys, key];
    if (!record.missed) {
      set({
        dialogLineKeys,
        correctCount: state.correctCount + 1,
        xpEarned: state.xpEarned + XP_CORRECT,
      });
      return { applied: true, failed: false, hearts: state.hearts };
    }

    const id = dialogRetryExerciseId(record.stepId, record.lineIndex);
    if (state.exerciseById[id]) {
      throw new Error(`Duplicate exercise id: ${id}`);
    }

    const exercise: SelectTranslationItem = {
      id,
      type: 'select_translation',
      prompt_ru: record.promptRu,
      prompt: record.prompt,
      options: [...record.options],
      answer: record.answer,
      phraseEs: record.answer,
      phraseTr: record.prompt,
      itemIds: [record.itemId],
    };
    const hearts = Math.max(0, state.hearts - 1);
    const failed = hearts === 0;

    set({
      dialogLineKeys,
      exerciseById: { ...state.exerciseById, [id]: exercise },
      queue: [...state.queue, id],
      wrongCount: state.wrongCount + 1,
      hearts,
      status: failed ? 'failed' : state.status,
      finishedAt: failed ? state.getNow() : state.finishedAt,
    });
    return { applied: true, failed, hearts };
  },

  reset: () => set(idleState()),

  finishLesson: () => {
    const state = get();
    if (state.summary) return state.summary;
    if (state.status !== 'completed' && state.status !== 'failed') return null;
    const summary = buildSummary(state);
    set({ summary });
    return summary;
  },

  claimCompletionSave: () => {
    const state = get();
    if (state.completionSaved || !state.summary) return false;
    set({ completionSaved: true });
    return true;
  },

  getCurrentExercise: () => {
    const state = get();
    const id = currentExerciseId(state);
    if (!id) return null;
    return state.exerciseById[id] ?? null;
  },

  getProgress: () => {
    const { correctCount, almostCount, initialIds } = get();
    const solved = correctCount + almostCount;
    const total = initialIds.length;
    const ratio = total === 0 ? 0 : Math.min(1, solved / total);
    return { solved, total, ratio };
  },

  getElapsedMs: () => elapsedMs(get()),

  getSummary: () => get().summary ?? buildSummary(get()),
}));
