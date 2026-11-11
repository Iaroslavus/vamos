import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

type AddWordsControlProps = {
  variant: 'button' | 'row';
  onPress: () => void;
};

export function AddWordsControl({ variant, onPress }: AddWordsControlProps) {
  const { t } = useTranslation();
  if (variant === 'button') {
    return <Button title={t('folder.addWords')} onPress={onPress} />;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('folder.addWords')}
      onPress={onPress}
      style={styles.row}
    >
      <Text variant="bodyBold" color={colors.coral}>
        {t('folder.addWords')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
