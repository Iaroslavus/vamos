import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import { pairCount } from '../games/timedPairs';
import { usePairsRecord } from '../hooks/usePairsRecord';
import { useTimedPairs } from '../hooks/useTimedPairs';
import type { StudySettings, StudyUnit } from '../types';
import { PairsBoardStatus } from './PairsBoardStatus';
import { PairsFinish } from './PairsFinish';
import { SessionBar, type SessionPlace } from './SessionBar';
import { TimedPairGrid } from './TimedPairGrid';

type TimedPairsSessionProps = {
  units: readonly StudyUnit[];
  userId: string | null;
  folderId: string;
  onClose: () => void;
  /**
   * When set, a cleared board continues a mixed session instead of the finish screen.
   * The ids are the phrases that were paired wrong.
   */
  onFinished?: (missedItemIds: readonly string[]) => void;
  place?: SessionPlace;
  settings?: StudySettings;
  onChangeSettings?: (settings: StudySettings) => void;
};

export function TimedPairsSession({
  units,
  userId,
  folderId,
  onClose,
  onFinished,
  place,
  settings,
  onChangeSettings,
}: TimedPairsSessionProps) {
  const { t } = useTranslation();
  const record = usePairsRecord(userId, folderId);
  const showTimer = settings?.showTimer ?? false;
  const game = useTimedPairs(units, record, record.ready, showTimer);
  const reported = useRef(false);
  const finished = record.ready && game.phase === 'done';

  useEffect(() => {
    if (!finished || !onFinished || reported.current) return;
    reported.current = true;
    onFinished(game.missedIds);
  }, [finished, game.missedIds, onFinished]);

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
        <SessionBar current={0} total={0} onClose={onClose} />
      </View>
    );
  }

  const header = place ?? { current: game.index + 1, total: game.rounds.length };
  const pairs = pairCount(game.round);
  const playing = game.phase === 'play';

  return (
    <View style={styles.root}>
      <SessionBar
        current={header.current}
        total={header.total}
        onClose={onClose}
        onShuffle={playing ? game.shuffle : undefined}
        shuffleDisabled={!playing || pairs < 2}
        settings={settings}
        onChangeSettings={onChangeSettings}
      />
      {game.phase === 'play' ? (
        <>
          <PairsBoardStatus
            found={game.progress.matched.length}
            total={pairs}
            round={game.index + 1}
            rounds={game.rounds.length}
            timer={showTimer ? t('session.timer', { time: game.clock }) : null}
          />
          {game.progress.penalties > 0 ? (
            <Text variant="caption" color={colors.coral}>
              {t('study.games.pairsPenalties', { count: game.progress.penalties })}
            </Text>
          ) : null}
          <TimedPairGrid
            round={game.round}
            progress={game.progress}
            disabled={game.frozenMs != null}
            onPress={game.onPress}
            onRetired={game.onRetired}
          />
        </>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: space.md,
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
