import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Text } from '@/components/Text';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, radius, space } from '@/theme/tokens';

import type { DialogOption } from '../dialog';

type DialogChoicesProps = {
  options: readonly DialogOption[];
  rejectedIds: readonly string[];
  hint: string | null;
  shake: number;
  /** `speak` hides the chips and leaves only «Сказать вслух». */
  responseMode: 'choose' | 'speak';
  listening?: boolean;
  speakDisabled?: boolean;
  onChoose: (optionId: string) => void;
  onSpeakAloud?: () => void;
};

export function DialogChoices({
  options,
  rejectedIds,
  hint,
  shake,
  responseMode,
  listening = false,
  speakDisabled = false,
  onChoose,
  onSpeakAloud,
}: DialogChoicesProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (shake === 0) return;
    if (reduceMotion) {
      opacity.value = withSequence(
        withTiming(0.45, { duration: motion.press.duration }),
        withTiming(1, { duration: motion.press.duration }),
      );
      return;
    }
    const distance = motion.shake.distance;
    const step = motion.shake.duration;
    offset.value = withSequence(
      withTiming(-distance, { duration: step }),
      withTiming(distance, { duration: step }),
      withTiming(-distance, { duration: step }),
      withTiming(distance, { duration: step }),
      withTiming(0, { duration: step }),
    );
  }, [offset, opacity, reduceMotion, shake]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: offset.value }],
  }));

  const speakButton = (
    <Button
      title={listening ? t('speech.listening') : t('lesson.dialogSpeak')}
      variant="secondary"
      disabled={speakDisabled}
      onPress={() => onSpeakAloud?.()}
    />
  );

  return (
    <View style={styles.root}>
      {hint ? (
        <Text
          variant="bodyBold"
          color={colors.ink}
          accessibilityLiveRegion="polite"
          style={styles.hint}
        >
          {t('lesson.dialogHint', { hint })}
        </Text>
      ) : null}
      <Animated.View style={animated}>
        {responseMode === 'speak' ? (
          speakButton
        ) : (
          <View style={styles.stack}>
            <View style={styles.options}>
              {options.map((option) => {
                const rejected = rejectedIds.includes(option.id);
                return (
                  <Chip
                    key={option.id}
                    label={option.es}
                    tone={rejected ? 'error' : 'neutral'}
                    disabled={rejected}
                    onPress={() => onChoose(option.id)}
                    style={styles.chip}
                  />
                );
              })}
            </View>
            {speakButton}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.md,
  },
  hint: {
    backgroundColor: colors.hint,
    borderRadius: radius.sm,
    overflow: 'hidden',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  stack: {
    gap: space.md,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    marginBottom: space.xs,
  },
});
