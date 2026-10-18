import { Square, Turtle, Volume2 } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import { NORMAL_RATE, SLOW_RATE, playLessonAudio, stopLessonAudio } from './playback';

type AudioControlsProps = {
  text: string;
  audio?: string | null;
  disabled?: boolean;
};

export function AudioControls({ text, audio, disabled = false }: AudioControlsProps) {
  const { t } = useTranslation();

  const play = useCallback(
    (rate: number) => {
      if (disabled) return;
      // Always restart: playLessonAudio stops any current file/speech first.
      void playLessonAudio({ audio, text, rate });
    },
    [audio, disabled, text],
  );

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => play(NORMAL_RATE)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={t('lesson.playAudio')}
        style={({ pressed }) => [
          styles.primaryBtn,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <Volume2 size={22} color={colors.inkOnDark} strokeWidth={2.2} />
        <Text variant="bodyBold" color={colors.inkOnDark}>
          {t('lesson.playAudio')}
        </Text>
      </Pressable>

      <IconButton
        onPress={() => play(SLOW_RATE)}
        disabled={disabled}
        accessibilityLabel={t('lesson.playSlow')}
      >
        <Turtle size={20} color={colors.ink} strokeWidth={2.2} />
      </IconButton>

      <IconButton
        onPress={() => {
          void stopLessonAudio();
        }}
        disabled={disabled}
        accessibilityLabel={t('lesson.stopAudio')}
      >
        <Square size={20} color={colors.ink} strokeWidth={2.2} fill={colors.ink} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.blue,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
