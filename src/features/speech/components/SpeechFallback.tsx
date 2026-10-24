import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import type { SpeechAccess } from '@/features/speech/options';
import { colors, radius, space } from '@/theme/tokens';

type SpeechFallbackProps = {
  access: SpeechAccess;
  onAllow: () => void;
};

export function SpeechFallback({ access, onAllow }: SpeechFallbackProps) {
  const { t } = useTranslation();
  if (access !== 'denied' && access !== 'blocked' && access !== 'unavailable') return null;

  const unavailable = access === 'unavailable';
  const settings = access === 'blocked';

  return (
    <View style={styles.card}>
      <Text variant="bodyBold">
        {t(unavailable ? 'speech.unavailableTitle' : 'speech.permissionTitle')}
      </Text>
      <Text variant="body" color={colors.inkMuted}>
        {t(unavailable ? 'speech.unavailable' : 'speech.permissionBody')}
      </Text>
      {unavailable ? null : (
        <Button
          title={t(settings ? 'speech.permissionSettings' : 'speech.permissionAllow')}
          variant="secondary"
          onPress={settings ? () => void Linking.openSettings() : onAllow}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    backgroundColor: colors.hint,
    borderRadius: radius.lg,
    padding: space.lg,
  },
});
