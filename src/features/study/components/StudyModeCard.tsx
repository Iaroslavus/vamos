import * as Haptics from 'expo-haptics';
import type { TFunction } from 'i18next';
import { BookOpen, ClipboardCheck, Layers, Mic, Zap, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, depth, motion, radius, space } from '@/theme/tokens';

import { isPlayableStudyMode } from '../modes';
import type { StudyMode } from '../types';

const ICONS: Record<StudyMode, LucideIcon> = {
  learn: BookOpen,
  flashcards: Layers,
  blitz: Zap,
  speak: Mic,
  test: ClipboardCheck,
};

const TINT: Record<StudyMode, { face: string; icon: string }> = {
  learn: { face: colors.errorSoft, icon: colors.coral },
  flashcards: { face: colors.saffronSoft, icon: colors.saffronDeep },
  blitz: { face: colors.saffronSoft, icon: colors.saffronDeep },
  speak: { face: colors.tealSoft, icon: colors.teal },
  test: { face: colors.tealSoft, icon: colors.blue },
};

type StudyModeCardProps = {
  mode: StudyMode;
  count: number;
  due: number;
  onStart: (mode: StudyMode) => void;
};

export function StudyModeCard({ mode, count, due, onStart }: StudyModeCardProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const ready = isPlayableStudyMode(mode);
  const enabled = ready && count > 0;
  const featured = mode === 'learn';
  const badge = featured
    ? due > 0
      ? t('studyModes.due', { due })
      : t('studyModes.recommended')
    : null;
  const Icon = ICONS[mode];
  const tint = TINT[mode];
  const title = t(`study.modes.${mode}.title`);
  const body = t(`study.modes.${mode}.body`);
  const soon = t('study.soon');
  const pressOffset = useSharedValue(0);
  const faceOpacity = useSharedValue(1);
  const soleHeight = depth.button;

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressOffset.value }],
    opacity: faceOpacity.value,
  }));

  const animatePress = (pressed: boolean) => {
    if (!enabled) return;

    if (reduceMotion) {
      // Reanimated shared values are intentionally mutated via `.value`.
      // eslint-disable-next-line react-hooks/immutability -- shared value write
      faceOpacity.value = withTiming(pressed ? 0.72 : 1, { duration: motion.press.duration });
      return;
    }

    // eslint-disable-next-line react-hooks/immutability -- shared value write
    pressOffset.value = withTiming(pressed ? soleHeight : 0, { duration: motion.press.duration });
  };

  return (
    <View style={[styles.wrap, !enabled && styles.off]}>
      <View pointerEvents="none" style={[styles.sole, { top: soleHeight }]} />
      <Animated.View style={[faceStyle, { marginBottom: soleHeight }]}>
        <Pressable
          testID={`study-mode-${mode}`}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel({
            featured,
            ready,
            title,
            body,
            soon,
            badge,
            due,
            t,
          })}
          accessibilityState={{ disabled: !enabled }}
          disabled={!enabled}
          onPressIn={() => animatePress(true)}
          onPressOut={() => animatePress(false)}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onStart(mode);
          }}
          style={({ pressed }) => studyModeCardStyle(featured, pressed && enabled)}
        >
          <View
            testID={`study-mode-${mode}-icon`}
            style={[styles.icon, { backgroundColor: tint.face }]}
          >
            <Icon size={22} color={tint.icon} strokeWidth={2.2} />
          </View>
          <View style={styles.copy}>
            <View style={styles.titleRow}>
              <Text variant="bodyBold" numberOfLines={1} style={styles.title}>
                {title}
              </Text>
              {badge ? (
                <View testID={`study-mode-${mode}-badge`} style={styles.badge}>
                  <Text variant="caption" color={colors.saffronDeep} numberOfLines={1}>
                    {badge}
                  </Text>
                </View>
              ) : ready ? null : (
                <Text variant="caption" color={colors.coral}>
                  {soon}
                </Text>
              )}
            </View>
            <Text variant="caption" color={colors.inkMuted} numberOfLines={1}>
              {body}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function studyModeCardStyle(featured: boolean, pressed: boolean) {
  return [
    styles.card,
    featured ? styles.cardFeatured : null,
    pressed ? styles.cardPressed : null,
    pressed && featured ? styles.cardPressedFeatured : null,
  ];
}

function accessibilityLabel({
  featured,
  ready,
  title,
  body,
  soon,
  badge,
  due,
  t,
}: {
  featured: boolean;
  ready: boolean;
  title: string;
  body: string;
  soon: string;
  badge: string | null;
  due: number;
  t: TFunction;
}) {
  if (!ready) return t('study.modeSoonLabel', { title, body, soon });
  if (featured && due > 0) return t('study.modeDueLabel', { title, body, due: badge ?? '' });
  if (featured && badge) return `${t('study.modeLabel', { title, body })}. ${badge}`;
  return t('study.modeLabel', { title, body });
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  off: {
    opacity: 0.55,
  },
  sole: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.lg,
    backgroundColor: colors.borderStrong,
  },
  card: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ground,
    backgroundColor: colors.ground,
  },
  cardFeatured: {
    borderColor: colors.coral,
  },
  cardPressed: {
    backgroundColor: colors.surfaceSunken,
    borderColor: colors.surfaceSunken,
  },
  cardPressedFeatured: {
    borderColor: colors.coral,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: space.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  title: {
    flexShrink: 1,
  },
  badge: {
    flexShrink: 0,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.saffronSoft,
  },
});
