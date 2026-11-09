import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors } from '@/theme/tokens';

import { useLearnMic } from '../learnMic';
import { useLearnSession } from '../hooks/useLearnSession';
import type { StudyRecordInput } from '../hooks/useStudyPlayer';
import type { StudySettings, StudyUnit } from '../types';
import { LearnPause } from './LearnPause';
import { LearnQuiz } from './LearnQuiz';

type LearnSessionProps = {
  units: readonly StudyUnit[];
  settings: StudySettings;
  onRecord: (record: StudyRecordInput) => Promise<void>;
  onClose: () => void;
  /** When set, the session does not ask the microphone itself. */
  mic?: boolean;
};

export function LearnSession({ units, settings, onRecord, onClose, mic }: LearnSessionProps) {
  const detected = useLearnMic();
  const ready = mic ?? detected;
  const { t } = useTranslation();

  if (ready == null) {
    return (
      <View style={styles.loading}>
        <Text variant="body" color={colors.inkMuted} style={styles.center}>
          {t('study.loading')}
        </Text>
      </View>
    );
  }

  return (
    <LearnRunning
      units={units}
      settings={settings}
      mic={ready}
      onRecord={onRecord}
      onClose={onClose}
    />
  );
}

function LearnRunning({
  units,
  settings,
  mic,
  onRecord,
  onClose,
}: LearnSessionProps & { mic: boolean }) {
  const player = useLearnSession({ units, settings, mic, onRecord });

  if (player.phase === 'break') {
    return (
      <LearnPause
        kind="break"
        learned={player.progress.learned}
        total={player.progress.total}
        misses={0}
        onContinue={player.continuePortion}
        onClose={onClose}
      />
    );
  }

  if (player.phase === 'done') {
    return (
      <LearnPause
        kind="done"
        learned={player.tally.learned}
        total={player.tally.total}
        misses={player.tally.misses}
        onContinue={onClose}
        onClose={onClose}
      />
    );
  }

  return <LearnQuiz player={player} onClose={onClose} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
});
