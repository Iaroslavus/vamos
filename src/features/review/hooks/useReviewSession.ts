import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/features/auth/useSession';
import type { GradeStatus } from '@/features/lesson/grading';
import { courseVocabulary, type CourseWord } from '@/features/lesson/reviewSources';
import { useLessonStore } from '@/features/lesson/store';
import { deviceTimeZone } from '@/features/progress/study';
import { useProgressRepository } from '@/features/progress/useProgress';
import { vocabRepository } from '@/features/vocab/defaultRepository';

import { reviewRepository } from '../defaultRepository';
import {
  buildQuickReviewExercises,
  pendingExerciseRatings,
  type ReviewExerciseSource,
  type ReviewStudyMode,
} from '../exercises';
import type { ReviewRating } from '../fsrs';
import {
  buildReviewQueue,
  describeIntervals,
  faceText,
  reviewAccuracy,
  reviewSessionXp,
  type IntervalLabel,
} from '../session';
import type { ReviewDirection, ReviewSnapshot, StoredCard } from '../types';
import { reviewDueQueryKey } from './useReviewDueCount';

export type StudyCard = {
  key: string;
  itemId: string;
  direction: ReviewDirection;
  front: string;
  back: string;
  es: string;
  audio?: string;
  intervals: Record<ReviewRating, IntervalLabel>;
};

export type ReviewPhase =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'limited' }
  | { status: 'choose'; queue: StudyCard[] }
  | {
      status: 'study';
      index: number;
      revealed: boolean;
      ratings: ReviewRating[];
      queue: StudyCard[];
      rateError: boolean;
      busy: boolean;
    }
  | { status: 'practice'; busy: boolean; rateError: boolean }
  | { status: 'summary'; reviewed: number; accuracy: number; xp: number };

type PendingRating = {
  exerciseId: string;
  itemId: string;
  direction: ReviewDirection;
  rating: ReviewRating;
  clientId: string;
};

function newId(): string {
  const id = globalThis.crypto?.randomUUID?.();
  if (id && id.length <= 100) return id;
  return `review-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function deckPhase(
  snapshot: ReviewSnapshot,
  now: Date,
  timeZone: string,
  itemIds: ReadonlySet<string> | null,
): ReviewPhase {
  const cards = itemIds
    ? snapshot.cards.filter((card) => itemIds.has(card.itemId))
    : snapshot.cards;
  const queue = buildReviewQueue({
    cards,
    logs: snapshot.logs,
    now,
    timeZone,
  });
  if (queue.cards.length === 0) {
    return { status: queue.capped ? 'limited' : 'empty' };
  }
  const words = courseVocabulary();
  return {
    status: 'choose',
    queue: queue.cards.map((card) => toCard(card, words, now)),
  };
}

function toCard(card: StoredCard, words: readonly CourseWord[], now: Date): StudyCard {
  const word = words.find((entry) => entry.id === card.itemId) ?? {
    id: card.itemId,
    es: card.itemId,
    ru: card.itemId,
  };
  const faces = faceText(card.direction, word);
  return {
    key: `${card.itemId}:${card.direction}`,
    itemId: card.itemId,
    direction: card.direction,
    front: faces.front,
    back: faces.back,
    es: word.es,
    audio: word.audio,
    intervals: describeIntervals(card, now),
  };
}

function exerciseSource(card: StudyCard): ReviewExerciseSource {
  const recognition = card.direction === 'es_to_ru';
  return {
    itemId: card.itemId,
    direction: card.direction,
    es: recognition ? card.front : card.back,
    ru: recognition ? card.back : card.front,
    ...(card.audio ? { audio: card.audio } : {}),
  };
}

export function useReviewSession(folderId?: string) {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const progress = useProgressRepository();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<ReviewPhase>({ status: 'loading' });
  const [trackedUser, setTrackedUser] = useState(userId);
  if (userId !== trackedUser) {
    setTrackedUser(userId);
    setPhase({ status: 'loading' });
  }
  const phaseRef = useRef(phase);
  const sessionId = useRef('');
  const ratingId = useRef<string | null>(null);
  const lock = useRef(false);
  const heldIndex = useRef<number | null>(null);
  const mounted = useRef(true);
  const practiceStarted = useRef(false);
  const attemptsRef = useRef(new Map<string, GradeStatus[]>());
  const ratedRef = useRef(new Set<string>());
  const pendingRef = useRef<PendingRating[]>([]);
  const ratingsRef = useRef<ReviewRating[]>([]);
  const linksRef = useRef(new Map<string, { itemId: string; direction: ReviewDirection }>());

  const clearPractice = useCallback(() => {
    attemptsRef.current = new Map();
    ratedRef.current = new Set();
    pendingRef.current = [];
    ratingsRef.current = [];
    linksRef.current = new Map();
  }, []);

  const stopPractice = useCallback(() => {
    if (!practiceStarted.current) return;
    practiceStarted.current = false;
    useLessonStore.getState().reset();
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (practiceStarted.current) {
        practiceStarted.current = false;
        useLessonStore.getState().reset();
      }
    };
  }, []);

  const applySnapshot = useCallback(
    (snapshot: ReviewSnapshot, itemIds: ReadonlySet<string> | null) => {
      stopPractice();
      clearPractice();
      sessionId.current = newId();
      ratingId.current = null;
      lock.current = false;
      heldIndex.current = null;
      setPhase(deckPhase(snapshot, new Date(), deviceTimeZone(), itemIds));
    },
    [clearPractice, stopPractice],
  );

  const folderItems = useCallback(async (): Promise<ReadonlySet<string> | null> => {
    if (!folderId || !userId) return null;
    const folders = await vocabRepository.read(userId);
    const folder = folders.folders.find((entry) => entry.id === folderId);
    if (!folder) return new Set();
    return new Set(
      folders.items.filter((item) => item.folderId === folderId).map((item) => item.itemId),
    );
  }, [folderId, userId]);

  const load = useCallback(async () => {
    if (!userId) return;
    setPhase({ status: 'loading' });
    try {
      const [snapshot, itemIds] = await Promise.all([reviewRepository.read(userId), folderItems()]);
      if (!mounted.current) return;
      applySnapshot(snapshot, itemIds);
    } catch {
      if (mounted.current) setPhase({ status: 'error' });
    }
  }, [applySnapshot, folderItems, userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const [snapshot, itemIds] = await Promise.all([
          reviewRepository.read(userId),
          folderItems(),
        ]);
        if (cancelled || !mounted.current) return;
        applySnapshot(snapshot, itemIds);
      } catch {
        if (!cancelled && mounted.current) setPhase({ status: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySnapshot, folderItems, userId]);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase.status === 'summary') stopPractice();

    if (phase.status !== 'study') {
      if (phase.status !== 'practice') lock.current = false;
      heldIndex.current = null;
      return;
    }
    if (heldIndex.current !== null && phase.index === heldIndex.current) {
      lock.current = false;
      heldIndex.current = null;
    }
  }, [phase, stopPractice]);

  const reveal = useCallback(() => {
    setPhase((current) => (current.status === 'study' ? { ...current, revealed: true } : current));
  }, []);

  const begin = useCallback(
    (mode: ReviewStudyMode) => {
      const current = phaseRef.current;
      if (current.status !== 'choose') return;

      if (mode === 'cards') {
        setPhase({
          status: 'study',
          index: 0,
          revealed: false,
          ratings: [],
          queue: current.queue,
          rateError: false,
          busy: false,
        });
        return;
      }

      const drafts = buildQuickReviewExercises({
        cards: current.queue.map(exerciseSource),
        pool: courseVocabulary(),
        prompts: {
          select: t('review.exerciseSelect'),
          listen: t('review.exerciseListen'),
          type: t('review.exerciseType'),
        },
      });
      if (drafts.length === 0) return;

      clearPractice();
      linksRef.current = new Map(
        drafts.map((draft) => [
          draft.exercise.id,
          { itemId: draft.itemId, direction: draft.direction },
        ]),
      );
      useLessonStore.getState().startLesson({
        lessonId: 'review-quick',
        exercises: drafts.map((draft) => draft.exercise),
      });
      practiceStarted.current = true;
      setPhase({ status: 'practice', busy: false, rateError: false });
    },
    [clearPractice, t],
  );

  const noteChecked = useCallback(
    (exerciseId: string, status: GradeStatus, sessionFailed: boolean) => {
      const grades = [...(attemptsRef.current.get(exerciseId) ?? []), status];
      attemptsRef.current.set(exerciseId, grades);
      const queued = new Set(pendingRef.current.map((item) => item.exerciseId));
      const next = pendingExerciseRatings({
        attempts: attemptsRef.current,
        rated: ratedRef.current,
        queued,
        focusId: exerciseId,
        sessionFailed,
      });
      const additions: PendingRating[] = [];
      for (const item of next) {
        const link = linksRef.current.get(item.exerciseId);
        if (!link) continue;
        additions.push({
          exerciseId: item.exerciseId,
          itemId: link.itemId,
          direction: link.direction,
          rating: item.rating,
          clientId: `${sessionId.current}:${item.exerciseId}`,
        });
      }
      pendingRef.current = [...pendingRef.current, ...additions];
    },
    [],
  );

  const advancePractice = useCallback((): Promise<void> => {
    if (!userId || lock.current) return Promise.resolve();
    const store = useLessonStore.getState();
    if (store.status !== 'feedback' && store.status !== 'failed') return Promise.resolve();
    const finishing = store.status === 'failed' || store.queue.length <= 1;
    lock.current = true;
    setPhase((current) =>
      current.status === 'practice' ? { ...current, busy: true, rateError: false } : current,
    );

    return (async () => {
      try {
        let saved = false;
        for (const item of pendingRef.current) {
          if (ratedRef.current.has(item.exerciseId)) continue;
          await reviewRepository.recordRating(userId, {
            itemId: item.itemId,
            direction: item.direction,
            rating: item.rating,
            clientId: item.clientId,
          });
          ratedRef.current.add(item.exerciseId);
          ratingsRef.current = [...ratingsRef.current, item.rating];
          saved = true;
        }
        pendingRef.current = [];
        if (saved) {
          void queryClient.invalidateQueries({ queryKey: reviewDueQueryKey(userId) });
        }
        if (!mounted.current) return;

        if (!finishing) {
          useLessonStore.getState().continueAfterFeedback();
          lock.current = false;
          if (!mounted.current) return;
          setPhase((current) =>
            current.status === 'practice' ? { ...current, busy: false, rateError: false } : current,
          );
          return;
        }

        const ratings = ratingsRef.current;
        const xp = reviewSessionXp(ratings.length);
        if (xp > 0) {
          await progress.awardXp(userId, {
            amount: xp,
            source: 'review',
            refId: sessionId.current,
            clientId: sessionId.current,
          });
        }
        if (!mounted.current) return;
        lock.current = false;
        setPhase({
          status: 'summary',
          reviewed: ratings.length,
          accuracy: reviewAccuracy(ratings),
          xp,
        });
      } catch {
        lock.current = false;
        if (!mounted.current) return;
        setPhase((current) =>
          current.status === 'practice' ? { ...current, busy: false, rateError: true } : current,
        );
      }
    })();
  }, [progress, queryClient, userId]);

  const rate = useCallback(
    (rating: ReviewRating): Promise<void> => {
      if (!userId || lock.current) return Promise.resolve();
      const current = phase;
      if (current.status !== 'study' || current.busy) return Promise.resolve();
      const card = current.queue[current.index];
      if (!card) return Promise.resolve();

      const clientId = ratingId.current ?? newId();
      ratingId.current = clientId;
      lock.current = true;
      setPhase({ ...current, busy: true, rateError: false });

      return (async () => {
        try {
          await reviewRepository.recordRating(userId, {
            itemId: card.itemId,
            direction: card.direction,
            rating,
            clientId,
          });
          void queryClient.invalidateQueries({ queryKey: reviewDueQueryKey(userId) });
          if (!mounted.current) return;
          const ratings = [...current.ratings, rating];
          const next = current.index + 1;
          if (next < current.queue.length) {
            ratingId.current = null;
            heldIndex.current = next;
            setPhase({
              ...current,
              index: next,
              revealed: false,
              ratings,
              busy: false,
              rateError: false,
            });
            return;
          }

          const xp = reviewSessionXp(ratings.length);
          if (xp > 0) {
            await progress.awardXp(userId, {
              amount: xp,
              source: 'review',
              refId: sessionId.current,
              clientId: sessionId.current,
            });
          }
          if (!mounted.current) return;
          ratingId.current = null;
          setPhase({
            status: 'summary',
            reviewed: ratings.length,
            accuracy: reviewAccuracy(ratings),
            xp,
          });
        } catch {
          lock.current = false;
          if (mounted.current) setPhase({ ...current, busy: false, rateError: true });
        }
      })();
    },
    [phase, progress, queryClient, userId],
  );

  const visible: ReviewPhase = userId ? phase : { status: 'error' };
  return { phase: visible, reload: load, reveal, rate, begin, noteChecked, advancePractice };
}
