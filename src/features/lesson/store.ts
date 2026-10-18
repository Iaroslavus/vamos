import { create } from 'zustand';

import { gradeAnswer, type GradeResult } from './grading';

/** Soft life cap for free-tier lessons (DESIGN.md). */
export const DEFAULT_MAX_HEARTS = 5;

export const XP_CORRECT = 10;
export const XP_ALMOST = 8;

export type LessonExerciseItem = {
  id: string;
  answer: string;
  accepted?: readonly string[];
};

export type LessonSessionStatus = 'idle' | 'active' | 'feedback' | 'completed' | 'failed';

export type LessonProgress = {
  /** Successful checks (correct + almost). */
  solved: number;
  /** Original exercise count when the lesson started. */
  total: number;
  /** 0–1 ratio capped at 1 (retries beyond total do not exceed). */
  ratio: number;
};

type StartLessonInput = {
  lessonId: string;
  exercises: readonly LessonExerciseItem[];
  /** Override starting hearts (defaults to DEFAULT_MAX_HEARTS). */
  hearts?: number;
  maxHearts?: number;
  /** Injectable clock for tests. */
  now?: () => number;
};

type LessonStoreState = {
  status: LessonSessionStatus;
  lessonId: string | null;
  /** Snapshot of exercises for the active session (id → item). */
  exerciseById: Record<string, LessonExerciseItem>;
  /** Remaining work: head is current; wrongs are appended to the end. */
  queue: string[];
  /** Ids from the initial start (stable progress denominator). */
  initialIds: string[];
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
  getNow: () => number;
};

type LessonStoreActions = {
  startLesson: (input: StartLessonInput) => void;
  setAnswer: (value: string) => void;
  /** Grade current answer; moves session to `feedback` (or `failed` if hearts hit 0). */
  checkAnswer: () => GradeResult | null;
  /**
   * After feedback sheet: advance queue.
   * Wrongs were already enqueued at check time; correct/almost just shift.
   */
  continueAfterFeedback: () => void;
  reset: () => void;
  getCurrentExercise: () => LessonExerciseItem | null;
  getProgress: () => LessonProgress;
  getElapsedMs: () => number;
};

export type LessonStore = LessonStoreState & LessonStoreActions;

const idleState = (): LessonStoreState => ({
  status: 'idle',
  lessonId: null,
  exerciseById: {},
  queue: [],
  initialIds: [],
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
  getNow: Date.now,
});

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

export const useLessonStore = create<LessonStore>()((set, get) => ({
  ...idleState(),

  startLesson: ({ lessonId, exercises, hearts, maxHearts, now }) => {
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

    const currentId = state.queue[0];
    if (!currentId) return null;

    const exercise = state.exerciseById[currentId];
    if (!exercise) return null;

    const result = gradeAnswer({
      userAnswer: state.userAnswer,
      answer: exercise.answer,
      accepted: exercise.accepted,
    });

    if (result.status === 'correct') {
      set({
        status: 'feedback',
        lastGrade: result,
        correctCount: state.correctCount + 1,
        xpEarned: state.xpEarned + xpForStatus(result.status),
      });
      return result;
    }

    if (result.status === 'almost') {
      set({
        status: 'feedback',
        lastGrade: result,
        almostCount: state.almostCount + 1,
        xpEarned: state.xpEarned + xpForStatus(result.status),
      });
      return result;
    }

    const hearts = Math.max(0, state.hearts - 1);
    const queue = [...state.queue];
    // Keep current at head for feedback; append a retry copy at the end.
    queue.push(currentId);

    if (hearts === 0) {
      set({
        status: 'failed',
        lastGrade: result,
        wrongCount: state.wrongCount + 1,
        hearts,
        queue,
        finishedAt: state.getNow(),
      });
      return result;
    }

    set({
      status: 'feedback',
      lastGrade: result,
      wrongCount: state.wrongCount + 1,
      hearts,
      queue,
    });
    return result;
  },

  continueAfterFeedback: () => {
    const state = get();
    if (state.status === 'failed' || state.status === 'completed' || state.status === 'idle') {
      return;
    }
    if (state.status !== 'feedback') return;

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
        finishedAt: state.getNow(),
      });
      return;
    }

    set({
      status: 'active',
      queue,
      userAnswer: '',
      lastGrade: null,
    });
  },

  reset: () => set(idleState()),

  getCurrentExercise: () => {
    const { queue, exerciseById } = get();
    const id = queue[0];
    if (!id) return null;
    return exerciseById[id] ?? null;
  },

  getProgress: () => {
    const { correctCount, almostCount, initialIds } = get();
    const solved = correctCount + almostCount;
    const total = initialIds.length;
    const ratio = total === 0 ? 0 : Math.min(1, solved / total);
    return { solved, total, ratio };
  },

  getElapsedMs: () => {
    const { startedAt, finishedAt, getNow } = get();
    if (startedAt === null) return 0;
    const end = finishedAt ?? getNow();
    return Math.max(0, end - startedAt);
  },
}));
