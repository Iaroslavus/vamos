import * as Haptics from 'expo-haptics';
import { Sun } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, radius, space } from '@/theme/tokens';

type MistakesIntroProps = {
  visible: boolean;
  remaining: number;
  onContinue: () => void;
};

const SHEET_OFFSET = 420;

export function MistakesIntro({ visible, remaining, onContinue }: MistakesIntroProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const translateY = useSharedValue(SHEET_OFFSET);
  const sheetOpacity = useSharedValue(0);
  const iconScale = useSharedValue<number>(motion.pop.from);

  useEffect(() => {
    if (!visible) {
      translateY.value = SHEET_OFFSET;
      sheetOpacity.value = 0;
      iconScale.value = motion.pop.from;
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (reduceMotion) {
      translateY.value = 0;
      sheetOpacity.value = withTiming(1, { duration: motion.press.duration });
      iconScale.value = 1;
      return;
    }

    sheetOpacity.value = withTiming(1, { duration: motion.press.duration });
    translateY.value = withSpring(0, motion.spring);

    const half = Math.round(motion.pop.duration / 2);
    iconScale.value = withSequence(
      withTiming(motion.pop.overshoot, { duration: half }),
      withTiming(1, { duration: half }),
    );
  }, [iconScale, reduceMotion, sheetOpacity, translateY, visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: sheetOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          sheetStyle,
          { paddingBottom: Math.max(insets.bottom, space.lg) + space.sm },
        ]}
      >
        <Animated.View style={[styles.iconWrap, iconStyle]}>
          <Sun size={36} color={colors.saffron} strokeWidth={2.2} />
        </Animated.View>

        <Text variant="h3" style={styles.title}>
          {t('lesson.mistakesIntroTitle')}
        </Text>
        <Text variant="body" color={colors.inkMuted} style={styles.subtitle}>
          {t('lesson.mistakesIntroSubtitle', { count: remaining })}
        </Text>

        <Button
          title={t('lesson.mistakesIntroCta')}
          variant="primary"
          onPress={onContinue}
          style={styles.button}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 4,
    borderTopColor: colors.coral,
    paddingHorizontal: space.xl,
    paddingTop: space.xxl,
    gap: space.md,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.saffronSoft,
    marginBottom: space.sm,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  button: {
    marginTop: space.md,
  },
});
