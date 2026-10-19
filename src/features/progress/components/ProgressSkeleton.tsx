import { StyleSheet, View } from 'react-native';

import { Bone } from '@/components/Bone';
import { colors, space } from '@/theme/tokens';

type ProgressSkeletonProps = {
  label: string;
};

export function ProgressSkeleton({ label }: ProgressSkeletonProps) {
  return (
    <View accessibilityLabel={label} accessibilityState={{ busy: true }} style={styles.root}>
      <View style={styles.row}>
        <Bone height={88} rounded="card" style={styles.half} />
        <Bone height={88} rounded="card" style={styles.half} />
      </View>
      <Bone height={180} rounded="card" />
      <Bone height={180} rounded="card" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    gap: space.lg,
  },
  row: {
    flexDirection: 'row',
    gap: space.md,
  },
  half: {
    flex: 1,
  },
});
