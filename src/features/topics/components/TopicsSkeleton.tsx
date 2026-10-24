import { StyleSheet, View } from 'react-native';

import { Bone } from '@/components/Bone';
import { colors, space } from '@/theme/tokens';

type TopicsSkeletonProps = {
  label: string;
};

export function TopicsSkeleton({ label }: TopicsSkeletonProps) {
  return (
    <View accessibilityLabel={label} accessibilityState={{ busy: true }} style={styles.root}>
      <Bone height={22} width="42%" />
      <Bone height={88} rounded="card" />
      <Bone height={88} rounded="card" />
      <Bone height={88} rounded="card" />
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
});
