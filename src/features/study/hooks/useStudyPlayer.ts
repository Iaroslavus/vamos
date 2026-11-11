import { useRef, useState } from 'react';

import { stopLessonAudio } from '@/features/audio/playback';
import type { AnswerTextFieldHandle } from '@/features/lesson/components/AnswerTextField';
import { gradeAnswer, type GradeResult, type GradeStatus } from '@/features/lesson/grading';
import type { MatchPairsOutcome } from '@/features/lesson/hooks/useMatchPairs';
import type { ReviewDirection } from '@/features/review/types';

import { isGradedStep, studyStepExercise } from '../exercise';
import { settleStudyCheck } from '../fsrs';
import { attemptsForStep, type ScoreAttempt } from '../sessionSummary';
import type { StudyGrade, StudyStep } from '../types';

export type StudyRecordInput = {
  itemId: string;
  direction: ReviewDirection;
  grade: StudyGrade;
  stepId: string;
};

type Pending =
  { kind: 'idle' } | { kind: 'retry' } | { kind: 'record'; grade: StudyGrade } | { kind: 'next' };

type CommitAction = Exclude<Pending, { kind: 'idle' }>;

export function useStudyPlayer(input: {
  steps: readonly StudyStep[];
  recordGrades: boolean;
  onRecord: (record: StudyRecordInput) => Promise<void>;
  onAttempt?: (attempt: ScoreAttempt) => void;
}) {
  const { steps, recordGrades, onRecord, onAttempt } = input;
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [grades, setGrades] = useState<GradeStatus[]>([]);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [pending, setPending] = useState<Pending>({ kind: 'idle' });
  const [sheet, setSheet] = useState(false);
  const [done, setDone] = useState(false);
  const [attempts, setAttempts] = useState<ScoreAttempt[]>([]);
  const [busy, setBusy] = useState(false);
  const [rateError, setRateError] = useState(false);
  const inputRef = useRef<AnswerTextFieldHandle>(null);
  const lock = useRef(false);

  const step = steps[index];
  const graded = step ? isGradedStep(step) : false;

  const finishStep = () => {
    setAnswer('');
    setGrades([]);
    setResult(null);
    setPending({ kind: 'idle' });
    setSheet(false);
    setRateError(false);
    void stopLessonAudio();
    if (index + 1 >= steps.length) setDone(true);
    else setIndex(index + 1);
  };

  const commit = async (action: CommitAction) => {
    if (!step || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      if (action.kind === 'retry') {
        setAnswer('');
        setResult(null);
        setPending({ kind: 'idle' });
        setSheet(false);
        setRateError(false);
        return;
      }

      if (action.kind === 'record' && recordGrades && hasDirection(step)) {
        try {
          await onRecord({
            itemId: step.itemId,
            direction: step.direction,
            grade: action.grade,
            stepId: step.id,
          });
        } catch {
          setRateError(true);
          if (step.type !== 'speak_repeat') setSheet(true);
          return;
        }
      }

      const produced = attemptsForStep(
        step,
        action.kind === 'next' ? { kind: 'next' } : { kind: 'record', grade: action.grade },
        answer,
        result?.wrongKeys ?? [],
        result?.mistakes ?? 0,
      );
      if (produced.length > 0) {
        setAttempts((current) => [...current, ...produced]);
        for (const attempt of produced) onAttempt?.(attempt);
      }
      finishStep();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const check = () => {
    if (!step || !isGradedStep(step) || pending.kind !== 'idle' || lock.current) return;
    if (answer.trim().length === 0) return;
    void stopLessonAudio();
    const gradedAnswer = gradeAnswer({ userAnswer: answer, answer: step.answer });
    const settled = settleStudyCheck(grades, gradedAnswer.status);
    setGrades(settled.grades);
    setResult(gradedAnswer);
    setRateError(false);
    setPending(settled.outcome ? { kind: 'record', grade: settled.outcome } : { kind: 'retry' });
    setSheet(true);
  };

  const matchSolved = (outcome: MatchPairsOutcome) => {
    if (!step || step.type !== 'match_pairs' || pending.kind !== 'idle') return;
    void stopLessonAudio();
    const exercise = studyStepExercise(step, '');
    setResult({
      status: outcome.mistakes === 0 ? 'correct' : 'wrong',
      correctAnswer: exercise?.answer ?? '',
      mistakes: outcome.mistakes,
      wrongKeys: outcome.wrongKeys,
    });
    setPending({ kind: 'next' });
    setSheet(true);
  };

  return {
    step,
    index,
    total: steps.length,
    done,
    attempts,
    answer,
    setAnswer,
    result,
    sheet,
    busy,
    rateError,
    retrying: pending.kind === 'retry',
    showCheck: graded && pending.kind === 'idle' && !done,
    canCheck: graded && pending.kind === 'idle' && answer.trim().length > 0 && !busy,
    gradeStatus: sheet && result ? result.status : null,
    inputRef,
    check,
    goOn: () => {
      if (pending.kind === 'idle') return;
      void commit(pending);
    },
    speakPass: () => {
      void commit({ kind: 'record', grade: 'correct_first' });
    },
    speakSkip: () => {
      void commit({ kind: 'record', grade: 'incorrect' });
    },
    matchSolved,
  };
}

function hasDirection(
  step: StudyStep,
): step is Extract<StudyStep, { itemId: string; direction: ReviewDirection }> {
  return step.type !== 'match_pairs' && step.type !== 'flashcard';
}
