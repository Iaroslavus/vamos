import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, space } from '@/theme/tokens';

type PhraseWaveProps = {
  reduceMotion: boolean;
};

/** Three bars that rise and fall while a phrase is playing. */
export function PhraseWave({ reduceMotion }: PhraseWaveProps) {
  const phase = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      phase.value = 1;
      return;
    }
    phase.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [phase, reduceMotion]);

  return (
    <View
      testID="phrase-wave"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.row}
    >
      <Bar phase={phase} lift={10} />
      <Bar phase={phase} lift={16} />
      <Bar phase={phase} lift={8} />
    </View>
  );
}

function Bar({ phase, lift }: { phase: { value: number }; lift: number }) {
  const style = useAnimatedStyle(() => ({
    height: 6 + phase.value * lift,
  }));
  return <Animated.View style={[styles.bar, style]} />;
}

const styles = StyleSheet.create({
  row: {
    width: 22,
    height: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bar: {
    width: 4,
    borderRadius: space.xs,
    backgroundColor: colors.blue,
  },
});
