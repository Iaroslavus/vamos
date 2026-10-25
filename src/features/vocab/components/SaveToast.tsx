import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

type SaveToastProps = {
  message: string | null;
  onHide: () => void;
};

const VISIBLE_MS = 2800;

export function SaveToast({ message, onHide }: SaveToastProps) {
  const insets = useSafeAreaInsets();
  const top = Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onHide, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, onHide]);

  if (!message) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.toast, { top: top + space.md }]}
    >
      <Text variant="bodyBold" color={colors.inkOnDark} style={styles.label}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: space.xl,
    right: space.xl,
    zIndex: 30,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  label: {
    textAlign: 'center',
  },
});
