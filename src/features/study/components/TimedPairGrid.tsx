import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';

import {
  columnTiles,
  tileShaking,
  type TimedProgress,
  type TimedRound,
  type TimedTile,
} from '../games/timedPairs';
import { TimedPairTile } from './TimedPairTile';

type TimedPairGridProps = {
  round: TimedRound;
  progress: TimedProgress;
  disabled: boolean;
  onPress: (tile: TimedTile) => void;
  onRetired: (tileId: string) => void;
};

export function TimedPairGrid({
  round,
  progress,
  disabled,
  onPress,
  onRetired,
}: TimedPairGridProps) {
  return (
    <View style={styles.columns}>
      <Column
        tiles={columnTiles(round, 'es')}
        progress={progress}
        disabled={disabled}
        onPress={onPress}
        onRetired={onRetired}
      />
      <Column
        tiles={columnTiles(round, 'tr')}
        progress={progress}
        disabled={disabled}
        onPress={onPress}
        onRetired={onRetired}
      />
    </View>
  );
}

function Column({
  tiles,
  progress,
  disabled,
  onPress,
  onRetired,
}: {
  tiles: readonly TimedTile[];
  progress: TimedProgress;
  disabled: boolean;
  onPress: (tile: TimedTile) => void;
  onRetired: (tileId: string) => void;
}) {
  return (
    <View style={styles.column}>
      {tiles.map((tile) => (
        <TimedPairTile
          key={tile.id}
          tile={tile}
          selected={progress.pick?.itemId === tile.itemId && progress.pick.side === tile.side}
          shaking={tileShaking(progress, tile)}
          gone={progress.matched.includes(tile.itemId)}
          disabled={disabled}
          onPress={onPress}
          onRetired={onRetired}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  columns: {
    flex: 1,
    flexDirection: 'row',
    gap: space.md,
  },
  column: {
    flex: 1,
    gap: space.sm,
  },
});
