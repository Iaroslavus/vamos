import { Volume2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

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
  const [busy, setBusy] = useState(false);

  const play = useCallback(
    async (rate: number) => {
      if (disabled || busy) return;
      setBusy(true);
      try {
        await playLessonAudio({ audio, text, rate });
      } finally {
        setBusy(false);
      }
    },
    [audio, busy, disabled, text],
  );

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => {
          void play(NORMAL_RATE);
        }}
        disabled={disabled || busy}
        accessibilityRole="button"
        accessibilityLabel={t('lesson.playAudio')}
        style={({ pressed }) => [
          styles.btn,
          styles.primaryBtn,
          (disabled || busy) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Volume2 size={22} color={colors.inkOnDark} strokeWidth={2.2} />
        <Text variant="bodyBold" color={colors.inkOnDark}>
          {t('lesson.playAudio')}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          void play(SLOW_RATE);
        }}
        disabled={disabled || busy}
        accessibilityRole="button"
        accessibilityLabel={t('lesson.playSlow')}
        style={({ pressed }) => [
          styles.btn,
          styles.secondaryBtn,
          (disabled || busy) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text variant="bodyBold" color={colors.ink}>
          {t('lesson.playSlow')}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          void stopLessonAudio();
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={t('lesson.stopAudio')}
        hitSlop={8}
        style={styles.stopHit}
      >
        <Text variant="caption" color={colors.inkMuted}>
          {t('lesson.stopAudio')}
        </Text>
      </Pressable>
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
  btn: {
    minHeight: 44,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  primaryBtn: {
    backgroundColor: colors.blue,
  },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  stopHit: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
});
