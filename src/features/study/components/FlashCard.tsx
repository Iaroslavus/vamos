import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import type { FlashMark } from '../flashcards';
import { useCardFlip } from '../hooks/useCardFlip';
import { useFlashDrag } from '../hooks/useFlashDrag';

type FlashCardProps = {
  cardKey: string;
  front: string;
  back: string;
  revealed: boolean;
  knowLabel: string;
  againLabel: string;
  flipLabel: string;
  onFlip: () => void;
  onMark: (mark: FlashMark) => void;
};

export function FlashCard({
  cardKey,
  front,
  back,
  revealed,
  knowLabel,
  againLabel,
  flipLabel,
  onFlip,
  onMark,
}: FlashCardProps) {
  const drag = useFlashDrag(cardKey, onMark);
  const flip = useCardFlip(cardKey, revealed);

  return (
    <GestureDetector gesture={drag.gesture}>
      <Animated.View style={drag.dragStyle} collapsable={false}>
        <Animated.View style={flip.enterStyle}>
          <View style={styles.stage}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={flipLabel}
              accessibilityState={{ expanded: revealed }}
              onPress={onFlip}
              style={styles.hit}
            >
              <Animated.View
                style={[styles.face, flip.frontStyle]}
                pointerEvents={revealed ? 'none' : 'auto'}
                accessibilityElementsHidden={revealed}
              >
                <Text variant="h1" style={styles.word}>
                  {front}
                </Text>
              </Animated.View>
              <Animated.View
                style={[styles.face, flip.backStyle]}
                pointerEvents={revealed ? 'auto' : 'none'}
                accessibilityElementsHidden={!revealed}
              >
                <Text variant="h1" style={styles.word}>
                  {back}
                </Text>
              </Animated.View>
            </Pressable>
            <Tint label={againLabel} tone="again" style={drag.againStyle} />
            <Tint label={knowLabel} tone="know" style={drag.knowStyle} />
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function Tint({
  label,
  tone,
  style,
}: {
  label: string;
  tone: 'know' | 'again';
  style: StyleProp<AnimatedStyle<ViewStyle>>;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.tint, tone === 'know' ? styles.know : styles.again, style]}
    >
      <Text variant="h3" color={tone === 'know' ? colors.teal : colors.errorInk}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    minHeight: 280,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hit: {
    minHeight: 280,
  },
  face: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxl,
    paddingVertical: space.xxxl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    backfaceVisibility: 'hidden',
  },
  word: {
    textAlign: 'center',
  },
  tint: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
  },
  know: {
    backgroundColor: colors.tealSoft,
  },
  again: {
    backgroundColor: colors.errorSoft,
  },
});
