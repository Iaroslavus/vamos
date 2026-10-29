import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard } from 'react-native';

import { stopLessonAudio } from '@/features/audio/playback';
import { playGradeSound } from '@/features/audio/sounds';
import type { AnswerTextFieldHandle } from '@/features/lesson/components/AnswerTextField';
import { buildResultSheetModel } from '@/features/lesson/feedbackView';
import type { GradeStatus } from '@/features/lesson/grading';
import { useLessonStore } from '@/features/lesson/store';

type PlayerInput = {
  busy: boolean;
  onChecked: (exerciseId: string, status: GradeStatus, sessionFailed: boolean) => void;
};

export function useReviewExercisePlayer({ busy, onChecked }: PlayerInput) {
  const { t } = useTranslation();
  const inputRef = useRef<AnswerTextFieldHandle>(null);
  const status = useLessonStore((state) => state.status);
  const hearts = useLessonStore((state) => state.hearts);
  const maxHearts = useLessonStore((state) => state.maxHearts);
  const userAnswer = useLessonStore((state) => state.userAnswer);
  const lastGrade = useLessonStore((state) => state.lastGrade);
  const solved = useLessonStore((state) => state.correctCount + state.almostCount);
  const total = useLessonStore((state) => state.initialIds.length);
  const mistakesLeft = useLessonStore((state) => state.queue.length);
  const setAnswer = useLessonStore((state) => state.setAnswer);
  const checkAnswer = useLessonStore((state) => state.checkAnswer);
  const continueMistakesIntro = useLessonStore((state) => state.continueMistakesIntro);
  const exercise = useLessonStore((state) => {
    const id = state.queue[0];
    return id ? (state.exerciseById[id] ?? null) : null;
  });

  useEffect(() => {
    return () => {
      void stopLessonAudio();
    };
  }, []);

  const sheetVisible = status === 'feedback' || status === 'failed';
  const active = status === 'active' && !busy;

  const onCheck = () => {
    const current = useLessonStore.getState().getCurrentExercise();
    if (!current) return;
    Keyboard.dismiss();
    const grade = checkAnswer();
    if (!grade) return;
    playGradeSound(grade.status);
    onChecked(current.id, grade.status, useLessonStore.getState().status === 'failed');
  };

  return {
    inputRef,
    status,
    hearts,
    maxHearts,
    userAnswer,
    exercise,
    mistakesLeft,
    setAnswer,
    continueMistakesIntro,
    solved,
    total,
    progress: total === 0 ? 0 : Math.min(1, solved / total),
    sheetVisible,
    gradeStatus: sheetVisible ? (lastGrade?.status ?? null) : null,
    typing: exercise?.type === 'type_translation',
    canCheck: active && userAnswer.trim().length > 0,
    disabled: !active,
    sheet: buildResultSheetModel({
      t,
      exercise,
      grade: sheetVisible ? lastGrade : null,
      failed: status === 'failed',
    }),
    onCheck,
  };
}
