import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { blitzRemainingMs, formatBlitzClock } from '../blitz';
import { studyStepsForRepeat, summarizeScores, type ScoreAttempt } from '../sessionSummary';
import type { StudySettings, StudyStep } from '../types';
import { SessionSummaryView } from './SessionSummary';
import { StudyPlayer } from './StudyPlayer';

type BlitzSessionProps = {
  steps: readonly StudyStep[];
  onClose: () => void;
  settings?: StudySettings;
  onChangeSettings?: (settings: StudySettings) => void;
};

export function BlitzSession({ steps, onClose, settings, onChangeSettings }: BlitzSessionProps) {
  const [queue, setQueue] = useState(steps);
  const [attempts, setAttempts] = useState<ScoreAttempt[]>([]);
  const [round, setRound] = useState(0);
  const [stopped, setStopped] = useState(false);

  if (stopped) {
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
          setRound((value) => value + 1);
          setStopped(false);
        }}
      />
    );
  }

  return (
    <BlitzRun
      key={round}
      steps={queue}
      showTimer={settings?.showTimer ?? false}
      settings={settings}
      onChangeSettings={onChangeSettings}
      onAttempt={(attempt) => setAttempts((current) => [...current, attempt])}
      onStop={() => setStopped(true)}
      onClose={onClose}
    />
  );
}

function BlitzRun({
  steps,
  showTimer,
  settings,
  onChangeSettings,
  onAttempt,
  onStop,
  onClose,
}: {
  steps: readonly StudyStep[];
  showTimer: boolean;
  settings?: StudySettings;
  onChangeSettings?: (settings: StudySettings) => void;
  onAttempt: (attempt: ScoreAttempt) => void;
  onStop: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  const [stopped, setStopped] = useState(false);
  const remaining = blitzRemainingMs(startedAt, now);
  const clock = formatBlitzClock(remaining);

  useEffect(() => {
    if (stopped) return undefined;
    const timer = setInterval(() => {
      const next = Date.now();
      if (showTimer) setNow(next);
      if (blitzRemainingMs(startedAt, next) === 0) setStopped(true);
    }, 250);
    return () => clearInterval(timer);
  }, [showTimer, startedAt, stopped]);

  useEffect(() => {
    if (stopped) onStop();
  }, [onStop, stopped]);

  return (
    <StudyPlayer
      steps={steps}
      recordGrades={false}
      timer={showTimer ? t('session.timer', { time: clock }) : null}
      settings={settings}
      onChangeSettings={onChangeSettings}
      onRecord={() => Promise.resolve()}
      onAttempt={onAttempt}
      onClose={onClose}
      onFinished={() => setStopped(true)}
    />
  );
}
