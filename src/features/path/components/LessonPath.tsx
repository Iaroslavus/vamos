import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme/tokens';

import { buildPathNodes, type PathNode } from '../curriculum';
import type { Lesson } from '@/features/lesson/schema';
import { PathNodeView } from './PathNodeView';

type LessonPathProps = {
  lessons: readonly Lesson[];
  completedIds: readonly string[];
  onPressNode: (node: PathNode) => void;
};

export function LessonPath({ lessons, completedIds, onPressNode }: LessonPathProps) {
  const nodes = useMemo(() => buildPathNodes(lessons, completedIds), [completedIds, lessons]);

  return (
    <View style={styles.path} accessibilityRole="list">
      {nodes.map((node, index) => (
        <View key={node.lesson.id} style={styles.segment}>
          {index > 0 ? (
            <View
              style={[
                styles.connector,
                node.side === 'left' ? styles.connectorFromRight : styles.connectorFromLeft,
              ]}
            />
          ) : null}
          <PathNodeView node={node} onPress={() => onPressNode(node)} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  path: {
    width: '100%',
    paddingVertical: space.lg,
  },
  segment: {
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    top: -space.md,
    width: 3,
    height: space.xxl,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -1.5,
    zIndex: 0,
  },
  connectorFromRight: {
    // visual only; zigzag nodes carry the path feel
  },
  connectorFromLeft: {},
});
