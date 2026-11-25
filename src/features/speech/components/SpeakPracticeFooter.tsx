import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

type SpeakPracticeFooterProps = {
  answered: boolean;
  againDisabled: boolean;
  onAgain: () => void;
  onNext: () => void;
  onSkip: () => void;
};

export function SpeakPracticeFooter({
  answered,
  againDisabled,
  onAgain,
  onNext,
  onSkip,
}: SpeakPracticeFooterProps) {
  const { t } = useTranslation();

  if (answered) {
    return (
      <View style={styles.row}>
        <Button
          title={t('speech.again')}
          variant="secondary"
          footer
          disabled={againDisabled}
          onPress={onAgain}
          style={styles.half}
        />
        <Button
          title={t('lesson.continue')}
          variant="primary"
          footer
          onPress={onNext}
          style={styles.half}
        />
      </View>
    );
  }

  return (
    <Pressable accessibilityRole="button" onPress={onSkip} style={styles.skip}>
      <Text variant="body" color={colors.inkMuted}>
        {t('speech.skip')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
  },
  half: {
    flex: 1,
  },
  skip: {
    minHeight: 44,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
