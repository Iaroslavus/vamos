import { X } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import { formatRaceTime } from '../games/timedPairs';
import { usePairsRecord } from '../hooks/usePairsRecord';
import { useTimedPairs } from '../hooks/useTimedPairs';
import type { StudyUnit } from '../types';
import { PairsFinish } from './PairsFinish';
import { TimedPairGrid } from './TimedPairGrid';

type TimedPairsSessionProps = {
  units: readonly StudyUnit[];
  userId: string | null;
  folderId: string;
  onClose: () => void;
  /** When set, a cleared board continues a mixed session instead of the finish screen. */
  onFinished?: () => void;
};

export function TimedPairsSession({
  units,
  userId,
  folderId,
  onClose,
  onFinished,
}: TimedPairsSessionProps) {
  const { t } = useTranslation();
  const record = usePairsRecord(userId, folderId);
  const game = useTimedPairs(units, record, record.ready);
  const reported = useRef(false);
  const finished = record.ready && game.phase === 'done';

  useEffect(() => {
    if (!finished || !onFinished || reported.current) return;
    reported.current = true;
    onFinished();
  }, [finished, onFinished]);

  if (!record.ready) {
    return (
      <View style={styles.center}>
        <Text variant="body" color={colors.inkMuted}>
          {t('study.loading')}
        </Text>
      </View>
    );
  }

  if (finished && onFinished) return null;

  if (!game.round) {
    return (
      <View style={styles.center}>
        <Text variant="h3" style={styles.centerText}>
          {t('study.emptyTitle')}
        </Text>
        <IconButton accessibilityLabel={t('study.close')} onPress={onClose}>
          <X size={22} color={colors.ink} strokeWidth={2.2} />
        </IconButton>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <IconButton accessibilityLabel={t('study.close')} onPress={onClose}>
          <X size={22} color={colors.ink} strokeWidth={2.2} />
        </IconButton>
        <View style={styles.headerBody}>
          <Text variant="caption" color={colors.inkMuted}>
            {t('study.games.pairsBoard', { current: game.index + 1, total: game.rounds.length })}
          </Text>
          <Text variant="h2" accessibilityLabel={t('study.games.pairsTime', { time: game.clock })}>
            {game.clock}
          </Text>
          <RecordLine bestMs={record.bestMs} />
          {game.progress.penalties > 0 ? (
            <Text variant="caption" color={colors.coral}>
              {t('study.games.pairsPenalties', { count: game.progress.penalties })}
            </Text>
          ) : null}
        </View>
      </View>
      {game.phase === 'play' ? (
        <TimedPairGrid
          round={game.round}
          progress={game.progress}
          disabled={game.frozenMs != null}
          onPress={game.onPress}
          onRetired={game.onRetired}
        />
      ) : (
        <PairsFinish
          phase={game.phase}
          timeMs={game.timeMs}
          recordMs={record.bestMs}
          fresh={game.fresh}
          onNext={game.onNext}
          onClose={onClose}
        />
      )}
    </View>
  );
}

function RecordLine({ bestMs }: { bestMs: number | null }) {
  const { t } = useTranslation();
  const label =
    bestMs == null
      ? t('study.games.pairsNoRecord')
      : t('study.games.pairsRecord', { time: formatRaceTime(bestMs) });
  return (
    <Text variant="caption" color={colors.inkMuted}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  headerBody: {
    flex: 1,
    gap: space.xs,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
  centerText: {
    textAlign: 'center',
  },
});
