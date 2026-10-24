import * as Haptics from 'expo-haptics';
import { Turtle, Volume2, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/Text';
import { NORMAL_RATE, SLOW_RATE } from '@/features/audio/playback';
import { colors, radius, space } from '@/theme/tokens';

type IntroAudioButtonsProps = {
  onPlay: (rate: number) => void;
};

export function IntroAudioButtons({ onPlay }: IntroAudioButtonsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <AudioButton
        label={t('lesson.playAudio')}
        testID="intro-listen"
        faceStyle={styles.listen}
        iconColor={colors.inkOnDark}
        Icon={Volume2}
        onPress={() => onPlay(NORMAL_RATE)}
      />
      <AudioButton
        label={t('lesson.playSlow')}
        testID="intro-slow"
        faceStyle={styles.slow}
        iconColor={colors.ink}
        Icon={Turtle}
        onPress={() => onPlay(SLOW_RATE)}
      />
    </View>
  );
}

type AudioButtonProps = {
  label: string;
  testID: string;
  faceStyle: StyleProp<ViewStyle>;
  iconColor: string;
  Icon: LucideIcon;
  onPress: () => void;
};

function AudioButton({ label, testID, faceStyle, iconColor, Icon, onPress }: AudioButtonProps) {
  const press = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={press}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <View style={styles.hit}>
        <View testID={testID} style={[styles.face, faceStyle]}>
          <Icon size={22} color={iconColor} strokeWidth={2.2} />
        </View>
        <Text variant="caption" style={styles.caption} importantForAccessibility="no">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: space.xl,
  },
  hit: {
    alignItems: 'center',
    gap: space.xs,
    minWidth: 44,
    minHeight: 44,
  },
  face: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listen: {
    backgroundColor: colors.blue,
  },
  slow: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  pressed: {
    opacity: 0.85,
  },
  caption: {
    textAlign: 'center',
    color: colors.inkMuted,
  },
});
