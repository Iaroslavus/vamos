import { useCallback, useEffect, useRef, useState } from 'react';

import type { ReviewRating } from '../fsrs';
import { flightCaughtUp, flightDirection, reviewTiming, type ReviewFlight } from '../flight';
import { ratingForMemory, type MemoryChoice } from '../memoryRating';
import type { StudyCard } from './useReviewSession';

type FlightInput = {
  card: StudyCard;
  nextCard: StudyCard | null;
  revealed: boolean;
  busy: boolean;
  rateError: boolean;
  onReveal: () => void;
  onRate: (rating: ReviewRating) => void;
  /** Runs in the render that retires the flight, before the next card is the front face. */
  onSettle: () => void;
};

export function useReviewFlight({
  card,
  nextCard,
  revealed,
  busy,
  rateError,
  onReveal,
  onRate,
  onSettle,
}: FlightInput) {
  const [flight, setFlight] = useState<ReviewFlight<StudyCard> | null>(null);
  const flippedAt = useRef<number | null>(null);
  const lock = useRef(false);

  const retiring =
    flight != null && (rateError || (flight.phase === 'done' && flightCaughtUp(card, flight)));
  if (retiring) {
    onSettle();
    setFlight(null);
  }

  useEffect(() => {
    flippedAt.current = null;
  }, [card.key]);

  useEffect(() => {
    if (!flight) lock.current = false;
  }, [flight]);

  useEffect(() => {
    if (!flight || flight.phase !== 'fly') return;
    const id = setTimeout(() => {
      setFlight((current) => (current?.phase === 'fly' ? { ...current, phase: 'enter' } : current));
    }, reviewTiming.captionMs);
    return () => clearTimeout(id);
  }, [flight]);

  useEffect(() => {
    if (!flight || flight.phase !== 'enter') return;
    const id = setTimeout(() => {
      setFlight((current) =>
        current?.phase === 'enter' ? { ...current, phase: 'done' } : current,
      );
    }, reviewTiming.enterMs);
    return () => clearTimeout(id);
  }, [flight]);

  const grade = useCallback(
    (rating: ReviewRating) => {
      if (lock.current || busy || flight || !revealed) return;
      lock.current = true;
      setFlight({
        leaving: card,
        arriving: nextCard,
        direction: flightDirection(rating),
        rating,
        phase: 'fly',
      });
      onRate(rating);
    },
    [busy, card, flight, nextCard, onRate, revealed],
  );

  const elapsedMs = useCallback(() => {
    if (flippedAt.current == null) return Number.POSITIVE_INFINITY;
    return Date.now() - flippedAt.current;
  }, []);

  const gradeMemory = useCallback(
    (choice: MemoryChoice) => {
      grade(ratingForMemory(choice, elapsedMs()));
    },
    [elapsedMs, grade],
  );

  const reveal = useCallback(() => {
    if (busy || flight || lock.current) return;
    flippedAt.current = Date.now();
    onReveal();
  }, [busy, flight, onReveal]);

  return { flight, grade, gradeMemory, reveal, elapsedMs };
}
