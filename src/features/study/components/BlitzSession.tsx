import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { space } from '@/theme/tokens';

import { blitzRemainingMs, formatBlitzClock } from '../blitz';
import { studyStepsForRepeat, summarizeScores, type ScoreAttempt } from '../sessionSummary';
import type { StudyStep } from '../types';
import { SessionSummaryView } from './SessionSummary';
import { StudyPlayer } from './StudyPlayer';

type BlitzSessionProps = {
  steps: readonly StudyStep[];
  onClose: () => void;
};

export function BlitzSession({ steps, onClose }: BlitzSessionProps) {
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
      onAttempt={(attempt) => setAttempts((current) => [...current, attempt])}
      onStop={() => setStopped(true)}
      onClose={onClose}
    />
  );
}

function BlitzRun({
  steps,
  onAttempt,
  onStop,
  onClose,
}: {
  steps: readonly StudyStep[];
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
      setNow(next);
      if (blitzRemainingMs(startedAt, next) === 0) setStopped(true);
    }, 250);
    return () => clearInterval(timer);
  }, [startedAt, stopped]);

  useEffect(() => {
    if (stopped) onStop();
  }, [onStop, stopped]);

  return (
    <View style={styles.root}>
      <Text
        variant="h3"
        style={styles.clock}
        accessibilityLabel={t('study.blitz.timer', { time: clock })}
      >
        {clock}
      </Text>
      <StudyPlayer
        steps={steps}
        recordGrades={false}
        onRecord={() => Promise.resolve()}
        onAttempt={onAttempt}
        onClose={onClose}
        onFinished={() => setStopped(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: space.md,
  },
  clock: {
    textAlign: 'center',
  },
});
