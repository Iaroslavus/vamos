import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import { MicButton } from './MicButton';
import { SoundWave } from './SoundWave';

type SpeakActionsProps = {
  listening: boolean;
  volume: number;
  micDisabled: boolean;
  passed: boolean;
  onMic: () => void;
  onSample: () => void;
  onSkip: () => void;
  onContinue: () => void;
};

export function SpeakActions({
  listening,
  volume,
  micDisabled,
  passed,
  onMic,
  onSample,
  onSkip,
  onContinue,
}: SpeakActionsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.actions}>
      <SoundWave active={listening} level={volume} />
      <MicButton
        listening={listening}
        disabled={micDisabled && !listening}
        accessibilityLabel={t(listening ? 'speech.micStop' : 'speech.micStart')}
        onPress={onMic}
      />
      <Button
        title={t('speech.listenSample')}
        variant="secondary"
        onPress={onSample}
        style={styles.wide}
      />
      {passed ? (
        <Button
          title={t('lesson.continue')}
          variant="primary"
          onPress={onContinue}
          style={styles.wide}
        />
      ) : (
        <Pressable accessibilityRole="button" onPress={onSkip} style={styles.skip}>
          <Text variant="bodyBold" color={colors.inkMuted}>
            {t('speech.skip')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: space.md,
  },
  wide: {
    alignSelf: 'stretch',
  },
  skip: {
    minHeight: 44,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
