import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, radius, space } from '@/theme/tokens';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

const OFFSET = 520;

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const translateY = useSharedValue(OFFSET);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      translateY.value = OFFSET;
      opacity.value = 0;
      return;
    }
    if (reduceMotion) {
      translateY.value = 0;
      opacity.value = withTiming(0.45, { duration: motion.press.duration });
      return;
    }
    opacity.value = withTiming(0.45, { duration: motion.press.duration });
    translateY.value = withSpring(0, motion.spring);
  }, [opacity, reduceMotion, translateY, visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.shade, shadeStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={onClose}
          style={styles.shadePress}
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[styles.sheet, sheetStyle, { paddingBottom: Math.max(insets.bottom, space.lg) }]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.ink,
  },
  shadePress: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    gap: space.md,
    maxHeight: '80%',
  },
});
