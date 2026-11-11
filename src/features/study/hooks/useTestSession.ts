import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';

import { stopLessonAudio } from '@/features/audio/playback';

import type { StudyRecordInput } from './useStudyPlayer';
import {
  gradeTest,
  planMistakeTest,
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
}) {
  const { units, onChangeSettings, onRecord } = input;
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
  const [mistakeRound, setMistakeRound] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<TestAnswers>({});
  const [score, setScore] = useState<TestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [rateError, setRateError] = useState(false);

  const questions = useMemo(
    () => (mistakeRound ? planMistakeTest(pool, active) : planTest(pool, active)),
    [active, mistakeRound, pool],
  );
  const question = questions[index];
  const repeatPool = useMemo(
    () => (score ? testUnitsForMistakes(units, score.missedItemIds) : []),
    [score, units],
  );
  const canRepeat = planMistakeTest(repeatPool, active).length > 0;

  const begin = (nextPool: readonly StudyUnit[], nextSettings: TestSettings, mistakes: boolean) => {
    roundRef.current += 1;
    setRound(roundRef.current);
    setMistakeRound(mistakes);
    setActive(nextSettings);
    setPool(nextPool);
    setAnswers({});
    setIndex(0);
    setScore(null);
    setRateError(false);
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
    start: () => begin(units, draft, false),
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
    repeat: () => begin(repeatPool, active, true),
    rateError,
  };
}

export type TestSessionState = ReturnType<typeof useTestSession>;
