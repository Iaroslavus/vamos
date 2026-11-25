import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard } from 'react-native';

import { useSession } from '@/features/auth/useSession';
import { playGradeSound } from '@/features/audio/sounds';
import { fallbackName } from '@/features/content/gender';
import { contentLocale } from '@/features/content/text';
import { useLearnerProfile } from '@/features/learner/useLearnerProfile';
import { gradeAnswer, type GradeStatus } from '@/features/lesson/grading';
import { progressQueryKey, useProgressRepository } from '@/features/progress/useProgress';
import { reviewRepository } from '@/features/review/defaultRepository';
import { reviewDueQueryKey } from '@/features/review/hooks/useReviewDueCount';
import { vocabRepository } from '@/features/vocab/defaultRepository';

import { applyTopicTest } from '../apply';
import { queueTopicCelebration } from '../celebration';
import { loadTopicTest } from '../load';
import { exerciseOf, feedbackAnswer, personalizeTask } from '../present';
import { settleTopicTest, type TopicTestAnswer, type TopicTestSettlement } from '../settle';
import { trackTopicTestFinish, trackTopicTestStart } from '../track';

type Phase = 'ask' | 'feedback' | 'result';

export function useTopicTestSession(topicId: string) {
  const { i18n } = useTranslation();
  const language = contentLocale(i18n.language);
  const router = useRouter();
  const queryClient = useQueryClient();
  const progress = useProgressRepository();
  const { session } = useSession();
  const learner = useLearnerProfile();
  const speaker = fallbackName(learner.data?.name, learner.data?.address ?? 'both');
  const userId = session?.user.id ?? null;
  const started = useRef(false);
  const finished = useRef(false);
  const completedAt = useRef<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ask');
  const [answer, setAnswer] = useState('');
  const [grade, setGrade] = useState<GradeStatus | null>(null);
  const [revealed, setRevealed] = useState('');
  const [answers, setAnswers] = useState<TopicTestAnswer[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const loaded = useMemo(
    () => loadTopicTest(topicId, `${topicId}:${attempt}`, language),
    [attempt, language, topicId],
  );
  const current = loaded?.tasks[index];
  const task = current ? personalizeTask(current, speaker) : null;
  const exercise = task ? exerciseOf(task) : null;
  const settlement = useMemo(() => {
    if (!loaded || phase !== 'result') return null;
    return settleTopicTest({ lessons: loaded.lessons, answers, itemIds: loaded.itemIds });
  }, [answers, loaded, phase]);

  useEffect(() => {
    if (!loaded || loaded.tasks.length === 0 || started.current) return;
    started.current = true;
    trackTopicTestStart(topicId);
  }, [loaded, topicId]);

  const persist = useCallback(
    async (next: TopicTestSettlement) => {
      if (!userId) {
        setSaveError(true);
        return;
      }
      const at = completedAt.current ?? new Date().toISOString();
      completedAt.current = at;
      setSaving(true);
      setSaveError(false);
      try {
        const snapshot = await applyTopicTest(
          { progress, review: reviewRepository, vocab: vocabRepository },
          userId,
          topicId,
          next,
          at,
        );
        if (snapshot) queryClient.setQueryData(progressQueryKey(userId), snapshot);
        void queryClient.invalidateQueries({ queryKey: reviewDueQueryKey(userId) });
        void queryClient.invalidateQueries({ queryKey: ['vocab', userId] });
      } catch {
        setSaveError(true);
      } finally {
        setSaving(false);
      }
    },
    [progress, queryClient, setSaveError, setSaving, topicId, userId],
  );

  const record = (itemId: string, correct: boolean, shown: string) => {
    setAnswers((current) => [...current, { itemId, correct }]);
    setGrade(correct ? 'correct' : 'wrong');
    setRevealed(shown);
    setPhase('feedback');
    playGradeSound(correct ? 'correct' : 'wrong');
  };

  const check = () => {
    if (!task || task.step.type === 'speak_repeat') return;
    Keyboard.dismiss();
    const result = gradeAnswer({
      userAnswer: answer,
      answer: task.step.answer,
      accepted: task.step.type === 'build_sentence' ? task.step.accepted : undefined,
    });
    record(task.itemId, result.status !== 'wrong', feedbackAnswer(task, result.correctAnswer));
  };

  const speak = (passed: boolean) => {
    if (!task || phase !== 'ask' || task.step.type !== 'speak_repeat') return;
    record(task.itemId, passed, feedbackAnswer(task, task.step.prompt_es));
  };

  const forward = () => {
    if (!task || !loaded) return;
    if (index + 1 >= loaded.tasks.length) {
      const next = settleTopicTest({
        lessons: loaded.lessons,
        answers,
        itemIds: loaded.itemIds,
      });
      if (!finished.current) {
        finished.current = true;
        trackTopicTestFinish({ topicId, score: next.score, passed: next.passed });
      }
      setPhase('result');
      void persist(next);
      return;
    }
    setIndex((value) => value + 1);
    setPhase('ask');
    setAnswer('');
    setGrade(null);
    setRevealed('');
  };

  const retake = () => {
    finished.current = false;
    started.current = false;
    completedAt.current = null;
    setAnswers([]);
    setIndex(0);
    setPhase('ask');
    setAnswer('');
    setGrade(null);
    setRevealed('');
    setSaveError(false);
    setAttempt((value) => value + 1);
  };

  const finishPassed = () => {
    queueTopicCelebration(topicId);
    router.replace('/(tabs)');
  };

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return {
    language,
    loaded,
    task,
    exercise,
    phase,
    index,
    answer,
    grade,
    revealed,
    settlement,
    saving,
    saveError,
    setAnswer,
    check,
    speak,
    forward,
    retake,
    finishPassed,
    retrySave: () => {
      if (settlement) void persist(settlement);
    },
    leave,
  };
}
