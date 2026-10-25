import { useEffect, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
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
const DISMISS_DISTANCE = 72;

/**
 * Renders in a native modal so screen footers (higher zIndex siblings)
 * cannot cover the sheet or steal its taps.
 */
export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const translateY = useSharedValue(OFFSET);
  const drag = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Reanimated shared values are intentionally mutated via `.value`.

    drag.value = 0;
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
  }, [drag, opacity, reduceMotion, translateY, visible]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          // eslint-disable-next-line react-hooks/immutability -- shared value write
          drag.value = Math.max(0, gesture.dy);
        },
        onPanResponderRelease: (_event, gesture) => {
          const close = gesture.dy > DISMISS_DISTANCE || gesture.vy > 0.8;
          // eslint-disable-next-line react-hooks/immutability -- shared value write
          drag.value = close || reduceMotion ? 0 : withSpring(0, motion.spring);
          if (close) onClose();
        },
        onPanResponderTerminate: () => {
          // eslint-disable-next-line react-hooks/immutability -- shared value write
          drag.value = reduceMotion ? 0 : withSpring(0, motion.spring);
        },
      }),
    [drag, onClose, reduceMotion],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + drag.value }],
  }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.fill}
      >
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
            testID="bottom-sheet"
            accessibilityViewIsModal
            style={[styles.sheet, sheetStyle, { paddingBottom: Math.max(insets.bottom, space.lg) }]}
          >
            <View {...pan.panHandlers} accessible={false} style={styles.handleHit}>
              <View style={styles.handle} />
            </View>
            {children}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  overlay: {
    flex: 1,
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
    gap: space.md,
    maxHeight: '88%',
  },
  handleHit: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
});
