import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';

import {
  EMPTY_TIMED,
  buildTimedRounds,
  formatRaceTime,
  nextPairsRecord,
  pairCount,
  raceTimeMs,
  roundCleared,
  tapTimedTile,
  type TimedProgress,
  type TimedTile,
} from '../games/timedPairs';
import type { StudyUnit } from '../types';

type Phase = 'play' | 'between' | 'done';

type RecordStore = {
  bestMs: number | null;
  save: (ms: number) => void;
};

export function useTimedPairs(units: readonly StudyUnit[], record: RecordStore, armed: boolean) {
  const [rounds] = useState(() => buildTimedRounds(units));
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState<TimedProgress>(EMPTY_TIMED);
  const [phase, setPhase] = useState<Phase>('play');
  const [frozenMs, setFrozenMs] = useState<number | null>(null);
  const [fresh, setFresh] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const now = useTickingClock(armed && phase === 'play' && frozenMs == null);
  const retired = useRef(new Set<string>());
  const finished = useRef(false);
  const latest = useRef({
    frozenMs,
    penalties: progress.penalties,
    bestMs: record.bestMs,
    index,
    pairs: 0,
    total: rounds.length,
    startedAt,
    save: record.save,
  });
  const round = rounds[index] ?? null;
  const pairs = round ? pairCount(round) : 0;

  useEffect(() => {
    latest.current = {
      frozenMs,
      penalties: progress.penalties,
      bestMs: record.bestMs,
      index,
      pairs,
      total: rounds.length,
      startedAt,
      save: record.save,
    };
  }, [
    frozenMs,
    index,
    pairs,
    progress.penalties,
    record.bestMs,
    record.save,
    rounds.length,
    startedAt,
  ]);

  const shown = frozenMs ?? raceTimeMs(startedAt, now, progress.penalties);

  const onPress = (tile: TimedTile) => {
    if (phase !== 'play' || frozenMs != null || !round) return;
    const tap = tapTimedTile(progress, tile);
    if (tap.kind === 'ignore') return;
    if (tap.kind === 'match') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (tap.kind === 'miss') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setProgress(tap.progress);
    if (tap.kind === 'match' && roundCleared(tap.progress, pairs)) {
      setFrozenMs(raceTimeMs(startedAt, Date.now(), tap.progress.penalties));
    }
  };

  const onRetired = (tileId: string) => {
    retired.current.add(tileId);
    const snap = latest.current;
    if (finished.current || retired.current.size < snap.pairs * 2) return;
    finished.current = true;
    const time = snap.frozenMs ?? raceTimeMs(snap.startedAt, Date.now(), snap.penalties);
    const updated = nextPairsRecord(snap.bestMs, time, snap.pairs);
    const improved = updated != null && updated !== snap.bestMs;
    setFresh(improved);
    if (improved && updated != null) snap.save(updated);
    setPhase(snap.index + 1 >= snap.total ? 'done' : 'between');
  };

  const onNext = () => {
    retired.current = new Set();
    finished.current = false;
    setProgress(EMPTY_TIMED);
    setFrozenMs(null);
    setFresh(false);
    setStartedAt(Date.now());
    setIndex((current) => current + 1);
    setPhase('play');
  };

  return {
    rounds,
    round,
    index,
    progress,
    phase,
    fresh,
    frozenMs,
    clock: formatRaceTime(shown),
    timeMs: frozenMs ?? shown,
    onPress,
    onRetired,
    onNext,
  };
}

function useTickingClock(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [running]);
  return now;
}
