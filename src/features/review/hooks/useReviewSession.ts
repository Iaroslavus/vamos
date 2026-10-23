import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useSession } from '@/features/auth/useSession';
import { courseVocabulary, type CourseWord } from '@/features/lesson/reviewSources';
import { deviceTimeZone } from '@/features/progress/study';
import { useProgressRepository } from '@/features/progress/useProgress';

import { reviewRepository } from '../defaultRepository';
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
  | {
      status: 'study';
      index: number;
      revealed: boolean;
      ratings: ReviewRating[];
      queue: StudyCard[];
      rateError: boolean;
      busy: boolean;
    }
  | { status: 'summary'; reviewed: number; accuracy: number; xp: number };

function newId(): string {
  const id = globalThis.crypto?.randomUUID?.();
  if (id && id.length <= 100) return id;
  return `review-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function deckPhase(snapshot: ReviewSnapshot, now: Date, timeZone: string): ReviewPhase {
  const queue = buildReviewQueue({
    cards: snapshot.cards,
    logs: snapshot.logs,
    now,
    timeZone,
  });
  if (queue.cards.length === 0) {
    return { status: queue.capped ? 'limited' : 'empty' };
  }
  const words = courseVocabulary();
  return {
    status: 'study',
    index: 0,
    revealed: false,
    ratings: [],
    queue: queue.cards.map((card) => toCard(card, words, now)),
    rateError: false,
    busy: false,
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

export function useReviewSession() {
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
  const sessionId = useRef('');
  const ratingId = useRef<string | null>(null);
  const lock = useRef(false);
  const heldIndex = useRef<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setPhase({ status: 'loading' });
    try {
      const snapshot = await reviewRepository.read(userId);
      if (!mounted.current) return;
      sessionId.current = newId();
      ratingId.current = null;
      lock.current = false;
      heldIndex.current = null;
      setPhase(deckPhase(snapshot, new Date(), deviceTimeZone()));
    } catch {
      if (mounted.current) setPhase({ status: 'error' });
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const snapshot = await reviewRepository.read(userId);
        if (cancelled || !mounted.current) return;
        sessionId.current = newId();
        ratingId.current = null;
        lock.current = false;
        heldIndex.current = null;
        setPhase(deckPhase(snapshot, new Date(), deviceTimeZone()));
      } catch {
        if (!cancelled && mounted.current) setPhase({ status: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (phase.status !== 'study') {
      lock.current = false;
      heldIndex.current = null;
      return;
    }
    if (heldIndex.current !== null && phase.index === heldIndex.current) {
      lock.current = false;
      heldIndex.current = null;
    }
  }, [phase]);

  const reveal = useCallback(() => {
    setPhase((current) => (current.status === 'study' ? { ...current, revealed: true } : current));
  }, []);

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
          if (!mounted.current) return;
          setPhase({ ...current, busy: false, rateError: true });
        }
      })();
    },
    [phase, progress, queryClient, userId],
  );

  const visible: ReviewPhase = userId ? phase : { status: 'error' };
  return { phase: visible, reload: load, reveal, rate };
}
