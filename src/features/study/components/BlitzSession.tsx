import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { space } from '@/theme/tokens';

import { blitzRemainingMs, formatBlitzClock } from '../blitz';
import type { StudyStep } from '../types';
import { StudyPlayer } from './StudyPlayer';

type BlitzSessionProps = {
  steps: readonly StudyStep[];
  onClose: () => void;
};

export function BlitzSession({ steps, onClose }: BlitzSessionProps) {
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

  if (stopped) {
    return (
      <View style={styles.done}>
        <Text variant="h2" style={styles.center}>
          {t('study.blitz.done')}
        </Text>
        <Button title={t('study.backToFolder')} onPress={onClose} />
      </View>
    );
  }

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
  done: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
  center: {
    textAlign: 'center',
  },
});
