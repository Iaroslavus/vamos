import { useState } from 'react';

import type { StudyRecordInput } from '../hooks/useStudyPlayer';
import { shuffleFrom } from '../order';
import {
  attemptsFromUnits,
  studyStepsForRepeat,
  summarizeScores,
  type ScoreAttempt,
} from '../sessionSummary';
import type {
  StudyExerciseStep,
  StudyMatchStep,
  StudySettings,
  StudyStep,
  StudyUnit,
} from '../types';
import { DictationSession } from './DictationSession';
import { SessionSummaryView } from './SessionSummary';
import { StudyPlayer } from './StudyPlayer';
import { TimedPairsSession } from './TimedPairsSession';

type LearnMixSessionProps = {
  steps: readonly StudyStep[];
  userId: string | null;
  folderId: string;
  onRecord: (record: StudyRecordInput) => Promise<void>;
  onClose: () => void;
  settings?: StudySettings;
  onChangeSettings?: (settings: StudySettings) => void;
};

export function LearnMixSession({
  steps,
  userId,
  folderId,
  onRecord,
  onClose,
  settings,
  onChangeSettings,
}: LearnMixSessionProps) {
  const [queue, setQueue] = useState(steps);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<ScoreAttempt[]>([]);
  const step = queue[index];
  const place = { current: index + 1, total: queue.length };
  const shuffleDisabled = queue.length - index < 2;
  const shuffle = () => setQueue((current) => shuffleFrom(current, index, Math.random));
  const advance = () => setIndex((current) => current + 1);
  const add = (attempt: ScoreAttempt) => setAttempts((current) => [...current, attempt]);

  if (!step) {
    const summary = summarizeScores(attempts);
    return (
      <SessionSummaryView
        summary={summary}
        onDone={onClose}
        onRepeat={() => {
          const next = studyStepsForRepeat(queue, summary.repeatIds);
          if (next.length === 0) return;
          setQueue(next);
          setAttempts([]);
          setIndex(0);
        }}
      />
    );
  }

  if (step.type === 'match_pairs') {
    return (
      <TimedPairsSession
        key={step.id}
        units={unitsFromPairs(step)}
        userId={userId}
        folderId={folderId}
        onClose={onClose}
        place={place}
        settings={settings}
        onChangeSettings={onChangeSettings}
        onFinished={(missed) => {
          for (const attempt of attemptsFromUnits(unitsFromPairs(step), missed, step.id)) {
            add(attempt);
          }
          advance();
        }}
      />
    );
  }

  if (step.type === 'type_translation' && step.playEs) {
    return (
      <DictationSession
        key={step.id}
        units={[unitFromExercise(step)]}
        onRecord={onRecord}
        onClose={onClose}
        onAttempt={add}
        onFinished={advance}
        place={place}
        onShuffle={shuffle}
        shuffleDisabled={shuffleDisabled}
        settings={settings}
        onChangeSettings={onChangeSettings}
      />
    );
  }

  return (
    <StudyPlayer
      key={step.id}
      steps={[step]}
      recordGrades
      onRecord={onRecord}
      onAttempt={add}
      onClose={onClose}
      onFinished={advance}
      place={place}
      onShuffle={shuffle}
      shuffleDisabled={shuffleDisabled}
      settings={settings}
      onChangeSettings={onChangeSettings}
    />
  );
}

function unitsFromPairs(step: StudyMatchStep): StudyUnit[] {
  return step.pairs.map((pair) => ({
    id: pair.itemId,
    es: pair.es,
    tr: pair.tr,
    audio: null,
    introduced: true,
    state: 2,
    due: false,
    hard: false,
    recall: false,
  }));
}

function unitFromExercise(step: StudyExerciseStep): StudyUnit {
  return {
    id: step.itemId,
    es: step.phraseEs,
    tr: step.phraseTr,
    audio: step.audio,
    introduced: true,
    state: 2,
    due: false,
    hard: false,
    recall: step.direction === 'ru_to_es',
  };
}
