import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { AudioControls } from '@/features/audio/AudioControls';
import { colors, space } from '@/theme/tokens';

type SpeakRepeatStepProps = {
  promptEs: string;
  audio: string | null;
  title: string;
};

/** Listen and repeat. Nothing is recorded or graded yet. */
export function SpeakRepeatStep({ promptEs, audio, title }: SpeakRepeatStepProps) {
  return (
    <View style={styles.root}>
      <Text variant="caption" color={colors.inkMuted}>
        {title}
      </Text>
      <Text variant="h1">{promptEs}</Text>
      <AudioControls text={promptEs} audio={audio} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.lg,
  },
});
