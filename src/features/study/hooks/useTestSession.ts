import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';

import { stopLessonAudio } from '@/features/audio/playback';

import type { StudyRecordInput } from './useStudyPlayer';
import {
  gradeTest,
  planTest,
  testUnitsForMistakes,
  type TestAnswerValue,
  type TestAnswers,
  type TestResult,
} from '../testMode';
import type { StudyUnit, TestSettings } from '../types';

type Phase = 'setup' | 'quiz' | 'result';

export function useTestSession(input: {
  units: readonly StudyUnit[];
  settings: TestSettings;
  onChangeSettings: (settings: TestSettings) => void;
  onRecord: (record: StudyRecordInput) => Promise<void>;
  onAddDifficult: (itemIds: readonly string[]) => Promise<void>;
}) {
  const { units, onChangeSettings, onRecord, onAddDifficult } = input;
  const roundRef = useRef(0);
  const lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [draft, setDraft] = useState(input.settings);
  const [active, setActive] = useState(input.settings);
  const [pool, setPool] = useState(units);
  const [phase, setPhase] = useState<Phase>('setup');
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<TestAnswers>({});
  const [score, setScore] = useState<TestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [rateError, setRateError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState(false);

  const questions = useMemo(() => planTest(pool, active), [active, pool]);
  const question = questions[index];
  const repeatPool = useMemo(
    () => (score ? testUnitsForMistakes(units, score.missedItemIds) : []),
    [score, units],
  );
  const canRepeat = planTest(repeatPool, active).length > 0;

  const begin = (nextPool: readonly StudyUnit[], nextSettings: TestSettings) => {
    roundRef.current += 1;
    setRound(roundRef.current);
    setActive(nextSettings);
    setPool(nextPool);
    setAnswers({});
    setIndex(0);
    setScore(null);
    setRateError(false);
    setAdded(false);
    setAddError(false);
    setPhase('quiz');
    void stopLessonAudio();
  };

  const answer = (value: TestAnswerValue) => {
    if (!question) return;
    setAnswers((current) => ({ ...current, [question.id]: value }));
  };

  const submit = () => {
    if (lock.current || questions.length === 0) return;
    const result = gradeTest(questions, answers, round);
    lock.current = true;
    setBusy(true);
    void (async () => {
      let failed = false;
      for (const item of result.grades) {
        try {
          await onRecord({
            itemId: item.itemId,
            direction: item.direction,
            grade: item.grade,
            stepId: item.clientId,
          });
        } catch {
          failed = true;
        }
      }
      lock.current = false;
      void stopLessonAudio();
      if (!alive.current) return;
      setRateError(failed);
      setScore(result);
      setPhase('result');
      setBusy(false);
      void Haptics.notificationAsync(
        result.percent === 100
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
    })();
  };

  const add = () => {
    if (!score || adding || added || score.missedItemIds.length === 0) return;
    setAdding(true);
    setAddError(false);
    void onAddDifficult(score.missedItemIds)
      .then(() => {
        if (alive.current) setAdded(true);
      })
      .catch(() => {
        if (alive.current) setAddError(true);
      })
      .finally(() => {
        if (alive.current) setAdding(false);
      });
  };

  const goBack = () => {
    setIndex((current) => Math.max(0, current - 1));
    void stopLessonAudio();
  };

  const goNext = () => {
    const last = index >= questions.length - 1;
    if (last) {
      submit();
      return;
    }
    setIndex((current) => current + 1);
    void stopLessonAudio();
  };

  return {
    phase,
    draft,
    changeDraft(next: TestSettings) {
      setDraft(next);
      onChangeSettings(next);
    },
    start: () => begin(units, draft),
    questions,
    question,
    index,
    answer: question ? answers[question.id] : undefined,
    setAnswer: answer,
    busy,
    last: index >= questions.length - 1,
    goBack,
    goNext,
    score,
    canRepeat,
    repeat: () => begin(repeatPool, active),
    adding,
    added,
    addError,
    rateError,
    add,
  };
}

export type TestSessionState = ReturnType<typeof useTestSession>;
