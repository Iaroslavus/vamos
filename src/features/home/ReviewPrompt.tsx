import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { Appear } from '@/features/auth/components/Appear';
import { colors, radius, space } from '@/theme/tokens';

type ReviewPromptProps = {
  count: number;
  onPress: () => void;
};

/** Hidden when nothing is due. The button opens the study session. */
export function ReviewPrompt({ count, onPress }: ReviewPromptProps) {
  const { t } = useTranslation();
  if (count <= 0) return null;

  return (
    <Appear>
      <View style={styles.card}>
        <Text variant="h3">{t('learn.reviewDue', { count })}</Text>
        <Button title={t('learn.reviewCta')} onPress={onPress} />
      </View>
    </Appear>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
});
