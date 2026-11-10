import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import { formatRaceTime } from '../games/timedPairs';

type PairsFinishProps = {
  phase: 'between' | 'done';
  timeMs: number;
  recordMs: number | null;
  fresh: boolean;
  onNext: () => void;
  onClose: () => void;
};

export function PairsFinish({ phase, timeMs, recordMs, fresh, onNext, onClose }: PairsFinishProps) {
  const { t } = useTranslation();
  const time = formatRaceTime(timeMs);

  return (
    <View style={styles.root}>
      <Text variant="h2" style={styles.center}>
        {t(phase === 'done' ? 'study.games.pairsDone' : 'study.games.pairsBoardClear')}
      </Text>
      <Text
        variant="h3"
        style={styles.center}
        accessibilityLabel={t('study.games.pairsTime', { time })}
      >
        {time}
      </Text>
      {fresh ? (
        <Text variant="bodyBold" color={colors.saffronDeep} style={styles.center}>
          {t('study.games.pairsNewRecord')}
        </Text>
      ) : null}
      {recordMs == null ? (
        <Text variant="body" color={colors.inkMuted} style={styles.center}>
          {t('study.games.pairsNoRecord')}
        </Text>
      ) : (
        <Text variant="body" color={colors.inkMuted} style={styles.center}>
          {t('study.games.pairsRecord', { time: formatRaceTime(recordMs) })}
        </Text>
      )}
      <Button
        title={t(phase === 'done' ? 'study.backToFolder' : 'study.games.pairsNext')}
        onPress={phase === 'done' ? onClose : onNext}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
  center: {
    textAlign: 'center',
  },
});
