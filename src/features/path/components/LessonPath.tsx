import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Appear } from '@/features/auth/components/Appear';
import { colors, motion, space } from '@/theme/tokens';

import { buildPathNodes, type CurriculumLesson, type PathNode } from '../curriculum';
import { PathNodeView } from './PathNodeView';

type LessonPathProps = {
  lessons: readonly CurriculumLesson[];
  completedIds: readonly string[];
  onPressNode: (node: PathNode) => void;
};

export function LessonPath({ lessons, completedIds, onPressNode }: LessonPathProps) {
  const nodes = useMemo(() => buildPathNodes(lessons, completedIds), [completedIds, lessons]);

  return (
    <View accessibilityRole="list" style={styles.path}>
      {nodes.map((node, index) => (
        <View key={node.lesson.id} style={styles.segment}>
          {index > 0 ? <View style={styles.connector} /> : null}
          <Appear delay={index * motion.stagger}>
            <PathNodeView node={node} onPress={() => onPressNode(node)} />
          </Appear>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  path: {
    width: '100%',
    paddingVertical: space.md,
  },
  segment: {
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    top: 0,
    height: space.lg,
    width: 3,
    marginLeft: -1.5,
    left: '50%',
    backgroundColor: colors.borderStrong,
    zIndex: 0,
  },
});
