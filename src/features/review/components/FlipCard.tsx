import { Volume2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, radius, space } from '@/theme/tokens';

type Face = {
  text: string;
  speakLabel?: string;
  onSpeak?: () => void;
};

type FlipCardProps = {
  cardKey: string;
  revealed: boolean;
  front: Face;
  back: Face;
};

export function FlipCard({ cardKey, revealed, front, back }: FlipCardProps) {
  const reduceMotion = useReduceMotion();
  const spin = useSharedValue(0);
  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const target = revealed ? 180 : 0;
    if (reduceMotion || !revealed) {
      // Snap shut between cards. A spring back to the front would show the previous answer.
      spin.value = target;
      return;
    }
    spin.value = withSpring(target, motion.spring);
  }, [reduceMotion, revealed, spin]);

  useEffect(() => {
    if (reduceMotion) {
      offset.value = 0;
      opacity.value = withTiming(1, { duration: motion.press.duration });
      return;
    }
    offset.value = 12;
    opacity.value = 0;
    offset.value = withSpring(0, motion.spring);
    opacity.value = withTiming(1, { duration: motion.progress.duration });
  }, [cardKey, offset, opacity, reduceMotion]);

  const stageStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));

  const frontStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: spin.value >= 90 ? 0 : 1 };
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${spin.value}deg` }],
    };
  });

  const backStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: spin.value >= 90 ? 1 : 0 };
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${spin.value + 180}deg` }],
    };
  });

  return (
    <Animated.View style={stageStyle}>
      <View style={styles.stage} collapsable={false}>
        <Animated.View
          style={[styles.face, frontStyle]}
          pointerEvents={revealed ? 'none' : 'auto'}
          accessibilityElementsHidden={revealed}
        >
          <FaceBody face={front} />
        </Animated.View>
        <Animated.View
          style={[styles.face, backStyle]}
          pointerEvents={revealed ? 'auto' : 'none'}
          accessibilityElementsHidden={!revealed}
        >
          <FaceBody face={back} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function FaceBody({ face }: { face: Face }) {
  return (
    <>
      {face.onSpeak ? (
        <View style={styles.speak}>
          <IconButton accessibilityLabel={face.speakLabel ?? ''} onPress={face.onSpeak}>
            <Volume2 size={22} color={colors.ink} strokeWidth={2.2} />
          </IconButton>
        </View>
      ) : null}
      <Text variant="h1" style={styles.word}>
        {face.text}
      </Text>
    </>
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
  speak: {
    position: 'absolute',
    top: space.md,
    right: space.md,
  },
});
