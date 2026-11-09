import { useMemo, useRef, useState } from 'react';

import { stopLessonAudio } from '@/features/audio/playback';
import type { AnswerTextFieldHandle } from '@/features/lesson/components/AnswerTextField';
import { gradeAnswer, type GradeResult, type GradeStatus } from '@/features/lesson/grading';

import { isGradedStep } from '../exercise';
import {
  answerLearn,
  continueLearn,
  createLearnSession,
  learnProgress,
  learnStudyGrade,
  learnTask,
  sessionTally,
  type LearnAnswer,
  type LearnState,
} from '../learn';
import { planLearnStep, studyDirectionAt } from '../sessionPlan';
import type { StudySettings, StudyUnit } from '../types';
import type { StudyRecordInput } from './useStudyPlayer';

export function useLearnSession(input: {
  units: readonly StudyUnit[];
  settings: StudySettings;
  mic: boolean;
  onRecord: (record: StudyRecordInput) => Promise<void>;
}) {
  const { units, settings, mic, onRecord } = input;
  const [session, setSession] = useState<LearnState>(() =>
    createLearnSession(units.map((unit) => unit.id)),
  );
  const [nonce, setNonce] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rateError, setRateError] = useState(false);
  const [held, setHeld] = useState<LearnAnswer | null>(null);
  const inputRef = useRef<AnswerTextFieldHandle>(null);
  const lock = useRef(false);
  const open = useRef(false);
  const rng = useRef(() => Math.random());

  const currentId = session.phase === 'quiz' ? (session.queue[0] ?? null) : null;
  const card = currentId ? session.cards[currentId] : undefined;
  const unitIndex = currentId ? units.findIndex((unit) => unit.id === currentId) : -1;
  const unit = unitIndex >= 0 ? units[unitIndex] : undefined;
  const task = card ? learnTask(card.level, mic) : null;

  const step = useMemo(() => {
    if (!unit || task == null || unitIndex < 0) return null;
    return planLearnStep(unit, units, settings, task, `learn-${unit.id}-${nonce}`, unitIndex);
  }, [nonce, settings, task, unit, unitIndex, units]);

  const apply = async (next: LearnAnswer): Promise<void> => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const speaking = step?.type === 'speak_repeat';
    try {
      const learned = next.learned;
      if (learned) {
        const index = units.findIndex((item) => item.id === learned.id);
        try {
          await onRecord({
            itemId: learned.id,
            direction: studyDirectionAt(settings.direction, Math.max(0, index)),
            grade: learnStudyGrade(learned.misses),
            stepId: `learned-${learned.id}`,
          });
        } catch {
          setHeld(next);
          setRateError(true);
          if (!speaking) setSheet(true);
          return;
        }
      }
      setSession(next.state);
      setAnswer('');
      setResult(null);
      setSheet(false);
      setRateError(false);
      setHeld(null);
      setNonce((value) => value + 1);
      open.current = false;
      void stopLessonAudio();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const check = () => {
    if (open.current || lock.current || sheet) return;
    if (!step || !isGradedStep(step) || answer.trim().length === 0) return;
    void stopLessonAudio();
    const graded = gradeAnswer({ userAnswer: answer, answer: step.answer });
    const correct = graded.status === 'correct' || graded.status === 'almost';
    open.current = true;
    setResult(graded);
    setHeld(answerLearn(session, correct, rng.current));
    setRateError(false);
    setSheet(true);
  };

  const goOn = (): Promise<void> => {
    if (!held) return Promise.resolve();
    return apply(held);
  };

  const speak = (correct: boolean): Promise<void> => {
    if (open.current || lock.current || session.phase !== 'quiz') return Promise.resolve();
    open.current = true;
    return apply(answerLearn(session, correct, rng.current));
  };

  const graded = step ? isGradedStep(step) : false;

  return {
    phase: session.phase,
    step,
    progress: learnProgress(session),
    tally: sessionTally(session),
    answer,
    setAnswer,
    result,
    sheet,
    busy,
    rateError,
    showCheck: graded && !sheet && session.phase === 'quiz',
    canCheck: graded && !sheet && answer.trim().length > 0 && !busy,
    gradeStatus: (sheet && result ? result.status : null) as GradeStatus | null,
    inputRef,
    check,
    goOn,
    speakPass: () => speak(true),
    speakSkip: () => speak(false),
    continuePortion: () => {
      setSession((current) => continueLearn(current));
      setAnswer('');
      setResult(null);
      setSheet(false);
      setHeld(null);
      setRateError(false);
      setNonce((value) => value + 1);
      open.current = false;
      void stopLessonAudio();
    },
  };
}

export type LearnController = ReturnType<typeof useLearnSession>;
