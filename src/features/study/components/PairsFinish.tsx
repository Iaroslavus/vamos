import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import { formatResultClock, resultDecimal } from '../games/timedPairs';

type PairsFinishProps = {
  phase: 'between' | 'done';
  timeMs: number;
  recordMs: number | null;
  fresh: boolean;
  onNext: () => void;
  onClose: () => void;
};

export function PairsFinish({ phase, timeMs, recordMs, fresh, onNext, onClose }: PairsFinishProps) {
  const { t, i18n } = useTranslation();
  const decimal = resultDecimal(i18n.language);
  const seconds = t('session.seconds', { time: formatResultClock(timeMs, decimal) });
  const headline = fresh ? t('session.timeRecord', { time: seconds }) : seconds;
  const record =
    recordMs == null
      ? t('session.noRecord')
      : t('session.record', {
          time: t('session.seconds', { time: formatResultClock(recordMs, decimal) }),
        });

  return (
    <View style={styles.root}>
      <Text variant="h2" style={styles.center}>
        {t(phase === 'done' ? 'study.games.pairsDone' : 'study.games.pairsBoardClear')}
      </Text>
      <Text variant="h3" style={styles.center}>
        {headline}
      </Text>
      {fresh ? null : (
        <Text variant="body" color={colors.inkMuted} style={styles.center}>
          {record}
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
