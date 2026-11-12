import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { displayText } from '@/features/content/displayText';
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
  renderAudio?: () => ReactNode;
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
  renderAudio,
}: FlashCardProps) {
  const drag = useFlashDrag(cardKey, onMark);
  const flip = useCardFlip(cardKey, revealed);

  return (
    <GestureDetector gesture={drag.gesture}>
      <Animated.View style={drag.dragStyle} collapsable={false}>
        <Animated.View style={flip.enterStyle}>
          <View style={styles.stage}>
            <View style={styles.hit}>
              <Animated.View
                style={[styles.face, flip.frontStyle]}
                pointerEvents={revealed ? 'none' : 'auto'}
                accessibilityElementsHidden={revealed}
              >
                <Face
                  word={front}
                  flipLabel={flipLabel}
                  revealed={revealed}
                  onFlip={onFlip}
                  audio={renderAudio?.()}
                />
              </Animated.View>
              <Animated.View
                style={[styles.face, flip.backStyle]}
                pointerEvents={revealed ? 'auto' : 'none'}
                accessibilityElementsHidden={!revealed}
              >
                <Face
                  word={back}
                  flipLabel={flipLabel}
                  revealed={revealed}
                  onFlip={onFlip}
                  audio={renderAudio?.()}
                />
              </Animated.View>
            </View>
            <Tint label={againLabel} tone="again" style={drag.againStyle} />
            <Tint label={knowLabel} tone="know" style={drag.knowStyle} />
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function Face({
  word,
  flipLabel,
  revealed,
  onFlip,
  audio,
}: {
  word: string;
  flipLabel: string;
  revealed: boolean;
  onFlip: () => void;
  audio?: ReactNode;
}) {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={flipLabel}
        accessibilityState={{ expanded: revealed }}
        onPress={onFlip}
        style={styles.wordHit}
      >
        <Text variant="h1" style={styles.word}>
          {displayText(word)}
        </Text>
      </Pressable>
      {audio}
    </>
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
    minHeight: 320,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hit: {
    minHeight: 320,
  },
  face: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxl,
    paddingVertical: space.xl,
    gap: space.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    backfaceVisibility: 'hidden',
  },
  wordHit: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    minHeight: 44,
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
