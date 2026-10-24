import { Volume2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, radius, space } from '@/theme/tokens';

type DialogBubbleProps = {
  side: 'npc' | 'user';
  es: string;
  ru: string;
  revealed: boolean;
  onToggleTranslation?: () => void;
  onReplay?: () => void;
};

export function DialogBubble({
  side,
  es,
  ru,
  revealed,
  onToggleTranslation,
  onReplay,
}: DialogBubbleProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(reduceMotion || side === 'user' ? 0 : 12);
  const translateX = useSharedValue(reduceMotion || side === 'npc' ? 0 : 28);
  const scale = useSharedValue(reduceMotion || side === 'npc' ? 1 : motion.pop.from);
  const user = side === 'user';

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = withTiming(1, { duration: motion.press.duration });
      translateY.value = 0;
      translateX.value = 0;
      scale.value = 1;
      return;
    }
    opacity.value = withTiming(1, { duration: motion.pop.duration });
    if (user) {
      translateX.value = withSpring(0, motion.spring);
      const half = Math.round(motion.pop.duration / 2);
      scale.value = withSequence(
        withTiming(motion.pop.overshoot, { duration: half }),
        withTiming(1, { duration: half }),
      );
      return;
    }
    translateY.value = withSpring(0, motion.spring);
  }, [opacity, reduceMotion, scale, translateX, translateY, user]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const translationLabel = revealed
    ? t('lesson.dialogHideTranslation', { line: es })
    : t('lesson.dialogShowTranslation', { line: es });

  return (
    <Animated.View style={[styles.row, user ? styles.rowUser : styles.rowNpc, animated]}>
      <View style={[styles.bubble, user ? styles.userBubble : styles.npcBubble]}>
        {onReplay ? (
          <IconButton
            accessibilityLabel={t('lesson.dialogReplay', { line: es })}
            onPress={onReplay}
          >
            <Volume2 color={colors.blue} size={22} strokeWidth={2.2} />
          </IconButton>
        ) : null}
        {onToggleTranslation ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translationLabel}
            onPress={onToggleTranslation}
            style={styles.textHit}
          >
            <LineText es={es} ru={revealed ? ru : null} user={user} />
          </Pressable>
        ) : (
          <View
            accessible
            style={styles.textHit}
            accessibilityLabel={t('lesson.dialogYou', { line: es })}
          >
            <LineText es={es} ru={null} user={user} />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function LineText({ es, ru, user }: { es: string; ru: string | null; user: boolean }) {
  return (
    <View style={styles.copy}>
      <Text variant="bodyBold" color={user ? colors.teal : colors.ink}>
        {es}
      </Text>
      {ru ? (
        <Text variant="caption" color={colors.inkMuted}>
          {ru}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
  },
  rowNpc: {
    alignItems: 'flex-start',
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  npcBubble: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  userBubble: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal,
  },
  textHit: {
    flexShrink: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  copy: {
    gap: space.xs,
  },
});
