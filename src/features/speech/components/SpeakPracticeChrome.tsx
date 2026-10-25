import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import type { SpeakPracticeMode } from '../hooks/useSpeakPractice';
import { MicButton } from './MicButton';
import { SoundWave } from './SoundWave';

type SpeakPracticeHeadingProps = {
  mode: SpeakPracticeMode;
};

export function SpeakPracticeHeading({ mode }: SpeakPracticeHeadingProps) {
  const { t } = useTranslation();
  if (mode === 'dialog') {
    return (
      <View style={styles.copy}>
        <Text variant="label" color={colors.inkMuted}>
          {t('speech.title')}
        </Text>
        <Text variant="body" color={colors.inkMuted}>
          {t('speech.dialogPrompt')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.copy}>
      <Text variant="label" color={colors.inkMuted}>
        {t(mode === 'practice' ? 'speech.practiceTitle' : 'speech.title')}
      </Text>
      {mode === 'practice' ? (
        <Text variant="caption" color={colors.inkMuted}>
          {t('speech.practiceNote')}
        </Text>
      ) : null}
      <Text variant="caption" color={colors.inkMuted}>
        {t('speech.honesty')}
      </Text>
    </View>
  );
}

type SpeakPracticeControlsProps = {
  listening: boolean;
  volume: number;
  micDisabled: boolean;
  showSample: boolean;
  sampleTitle: string;
  closeTitle: string;
  closePrimary: boolean;
  onMic: () => void;
  onSample: () => void;
  onClose: () => void;
};

export function SpeakPracticeControls({
  listening,
  volume,
  micDisabled,
  showSample,
  sampleTitle,
  closeTitle,
  closePrimary,
  onMic,
  onSample,
  onClose,
}: SpeakPracticeControlsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.actions}>
      <SoundWave active={listening} level={volume} />
      <MicButton
        listening={listening}
        disabled={micDisabled}
        accessibilityLabel={t(listening ? 'speech.micStop' : 'speech.micStart')}
        onPress={onMic}
      />
      {showSample ? (
        <Button title={sampleTitle} variant="secondary" onPress={onSample} style={styles.wide} />
      ) : null}
      <Button
        title={closeTitle}
        variant={closePrimary ? 'primary' : 'secondary'}
        onPress={onClose}
        style={styles.wide}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    gap: space.sm,
  },
  actions: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: space.md,
  },
  wide: {
    alignSelf: 'stretch',
  },
});
