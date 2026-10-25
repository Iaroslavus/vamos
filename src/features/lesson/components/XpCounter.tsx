import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, space } from '@/theme/tokens';

type XpCounterProps = {
  xp: number;
  label: string;
};

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function XpValue({ label, value, xp }: { label: string; value: number; xp: number }) {
  return (
    <View style={styles.wrap} accessibilityRole="text" accessibilityLabel={`${label} ${xp}`}>
      <Text variant="caption" color={colors.inkMuted}>
        {label}
      </Text>
      <Text variant="h1" color={colors.saffron} style={styles.value}>
        +{value}
      </Text>
    </View>
  );
}

function AnimatedXpCounter({ xp, label }: XpCounterProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = Date.now();
    const duration = motion.progress.duration;

    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setDisplay(Math.round(easeOutCubic(t) * xp));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [xp]);

  return <XpValue label={label} value={display} xp={xp} />;
}

export function XpCounter({ xp, label }: XpCounterProps) {
  const reduceMotion = useReduceMotion();
  if (reduceMotion) {
    return <XpValue label={label} value={xp} xp={xp} />;
  }
  return <AnimatedXpCounter xp={xp} label={label} />;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    overflow: 'visible',
  },
  value: {
    letterSpacing: -0.5,
    lineHeight: 52,
  },
});
