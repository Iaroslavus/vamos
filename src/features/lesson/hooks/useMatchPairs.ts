import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';

import { motion } from '@/theme/tokens';

import { resolvePairAttempt, type PairProgress } from '../pairs';
import type { MatchPair, MatchPairsItem } from '../store';

export const MATCH_SHAKE_MS = motion.shake.duration * 5;

export type MatchPairsOutcome = {
  mistakes: number;
  wrongKeys: readonly string[];
};

type Side = 'left' | 'right';
export type MatchTileTone = 'idle' | 'selected' | 'success' | 'error';

type Flash = { left: string; right: string };

/**
 * Match pairs check themselves. A correct pair locks. A wrong pair shakes,
 * counts a mistake, and clears. The exercise ends when every pair is locked.
 */
export function useMatchPairs(
  exercise: MatchPairsItem,
  disabled: boolean,
  onSolved: (outcome: MatchPairsOutcome) => void,
) {
  const [locked, setLocked] = useState<MatchPair[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);

  const progress = useRef<PairProgress>({ locked: [], mistakes: 0, wrongKeys: [] });
  const solved = useRef(false);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => {
      setFlash(null);
      setSelectedLeft(null);
      setSelectedRight(null);
    }, MATCH_SHAKE_MS);
    return () => clearTimeout(timer);
  }, [flash]);

  const commit = (left: string, right: string) => {
    const next = resolvePairAttempt(exercise.pairs, progress.current, left, right);
    progress.current = {
      locked: next.locked,
      mistakes: next.mistakes,
      wrongKeys: next.wrongKeys,
    };

    if (next.outcome === 'correct') {
      setLocked([...next.locked]);
      setSelectedLeft(null);
      setSelectedRight(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (next.locked.length >= exercise.pairs.length && !solved.current) {
        solved.current = true;
        onSolved({ mistakes: next.mistakes, wrongKeys: next.wrongKeys });
      }
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setFlash(next.flash);
  };

  const select = (side: Side, value: string) => {
    if (disabled || flash || solved.current) return;
    const taken = progress.current.locked.some((pair) =>
      side === 'left' ? pair.left === value : pair.right === value,
    );
    if (taken) return;

    if (side === 'left') {
      const nextLeft = selectedLeft === value ? null : value;
      setSelectedLeft(nextLeft);
      if (nextLeft && selectedRight) commit(nextLeft, selectedRight);
      return;
    }

    const nextRight = selectedRight === value ? null : value;
    setSelectedRight(nextRight);
    if (selectedLeft && nextRight) commit(selectedLeft, nextRight);
  };

  const toneFor = (side: Side, value: string): MatchTileTone => {
    if (flash && (side === 'left' ? flash.left === value : flash.right === value)) return 'error';
    const pair = locked.find((item) =>
      side === 'left' ? item.left === value : item.right === value,
    );
    if (pair) return 'success';
    if (side === 'left' && selectedLeft === value) return 'selected';
    if (side === 'right' && selectedRight === value) return 'selected';
    return 'idle';
  };

  return { toneFor, select };
}
