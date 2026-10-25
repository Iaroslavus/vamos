import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpeakPractice } from '@/features/speech/components/SpeakPractice';
import { space } from '@/theme/tokens';

type SpeakPart = { es: string; ru: string };

type SpeakRepeatStepProps = {
  promptEs: string;
  audio: string | null;
  sayRu?: string | null;
  parts?: readonly SpeakPart[];
  onSkip: () => void;
  onContinue: () => void;
};

export function SpeakRepeatStep({
  promptEs,
  audio,
  sayRu = null,
  parts = [],
  onSkip,
  onContinue,
}: SpeakRepeatStepProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
      <SpeakPractice
        mode="step"
        phrase={promptEs}
        audio={audio}
        sayRu={sayRu}
        parts={parts}
        onSkip={onSkip}
        onContinue={onContinue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },
});
