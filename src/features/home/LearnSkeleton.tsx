import { StyleSheet, View } from 'react-native';

import { Bone } from '@/components/Bone';
import { colors, space } from '@/theme/tokens';

type LearnSkeletonProps = {
  label: string;
};

export function LearnSkeleton({ label }: LearnSkeletonProps) {
  return (
    <View accessibilityLabel={label} accessibilityState={{ busy: true }} style={styles.root}>
      <Bone height={96} rounded="card" />
      <Bone height={22} width="46%" />
      <Bone height={72} rounded="card" />
      <Bone height={72} rounded="card" />
      <Bone height={72} rounded="card" />
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
