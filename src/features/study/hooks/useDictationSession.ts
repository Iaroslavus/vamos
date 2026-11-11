import { useRef, useState } from 'react';

import { stopLessonAudio } from '@/features/audio/playback';
import type { AnswerTextFieldHandle } from '@/features/lesson/components/AnswerTextField';
import { gradeAnswer, type GradeResult, type GradeStatus } from '@/features/lesson/grading';

import { dictationGrade, dictationPoints, nextReveal } from '../games/dictation';
import { settleStudyCheck } from '../fsrs';
import { attemptFromDictation, type ScoreAttempt } from '../sessionSummary';
import type { StudyRecordInput } from './useStudyPlayer';
import type { StudyUnit } from '../types';

type Pending =
  | { kind: 'idle' }
  | { kind: 'retry' }
  | { kind: 'record'; grade: NonNullable<ReturnType<typeof dictationGrade>>; points: number };

type DictationSessionInput = {
  units: readonly StudyUnit[];
  onRecord: (record: StudyRecordInput) => Promise<void>;
  onAttempt?: (attempt: ScoreAttempt) => void;
};

export function useDictationSession({ units, onRecord, onAttempt }: DictationSessionInput) {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [reveals, setReveals] = useState(0);
  const [grades, setGrades] = useState<GradeStatus[]>([]);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [pending, setPending] = useState<Pending>({ kind: 'idle' });
  const [sheet, setSheet] = useState(false);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rateError, setRateError] = useState(false);
  const inputRef = useRef<AnswerTextFieldHandle>(null);
  const lock = useRef(false);
  const unit = units[index] ?? null;

  const advance = () => {
    setValue('');
    setReveals(0);
    setGrades([]);
    setResult(null);
    setPending({ kind: 'idle' });
    setSheet(false);
    setRateError(false);
    void stopLessonAudio();
    if (index + 1 >= units.length) setDone(true);
    else setIndex(index + 1);
  };

  const commit = async () => {
    if (!unit || lock.current || pending.kind === 'idle') return;
    lock.current = true;
    setBusy(true);
    try {
      if (pending.kind === 'retry') {
        setValue('');
        setResult(null);
        setPending({ kind: 'idle' });
        setSheet(false);
        setRateError(false);
        return;
      }
      try {
        await onRecord({
          itemId: unit.id,
          direction: 'es_to_ru',
          grade: pending.grade,
          stepId: `dictation-${unit.id}`,
        });
      } catch {
        setRateError(true);
        return;
      }
      setTotal((current) => current + pending.points);
      onAttempt?.(attemptFromDictation(unit, pending.grade, value));
      advance();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const reveal = () => {
    if (!unit || sheet || busy) return;
    setReveals((current) => nextReveal(unit.es, current));
  };

  const check = () => {
    if (!unit || pending.kind !== 'idle' || lock.current || value.trim().length === 0) return;
    void stopLessonAudio();
    const graded = gradeAnswer({ userAnswer: value, answer: unit.es });
    const settled = settleStudyCheck(grades, graded.status);
    const outcome = dictationGrade(settled.outcome, graded.status, reveals);
    setGrades(settled.grades);
    setResult(graded);
    setRateError(false);
    setPending(
      outcome
        ? { kind: 'record', grade: outcome, points: dictationPoints(graded.status, reveals) }
        : { kind: 'retry' },
    );
    setSheet(true);
  };

  return {
    unit,
    index,
    totalUnits: units.length,
    value,
    setValue,
    reveals,
    result,
    sheet,
    total,
    done,
    busy,
    rateError,
    retrying: pending.kind === 'retry',
    canCheck: pending.kind === 'idle' && value.trim().length > 0 && !busy,
    inputRef,
    reveal,
    check,
    goOn: () => {
      void commit();
    },
  };
}
