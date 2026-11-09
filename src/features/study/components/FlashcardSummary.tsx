import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

type FlashcardSummaryProps = {
  know: number;
  again: number;
  adding: boolean;
  added: boolean;
  addError: boolean;
  onRepeat: () => void;
  onAdd: () => void;
  onClose: () => void;
};

export function FlashcardSummary({
  know,
  again,
  adding,
  added,
  addError,
  onRepeat,
  onAdd,
  onClose,
}: FlashcardSummaryProps) {
  const { t } = useTranslation();
  const idle = again === 0;

  return (
    <View style={styles.root}>
      <Text variant="h2" style={styles.center}>
        {t('study.flash.summary', { know, again })}
      </Text>
      {addError ? (
        <Text variant="caption" color={colors.errorInk} style={styles.center}>
          {t('study.flash.addError')}
        </Text>
      ) : null}
      <Button
        title={t('study.flash.repeat')}
        variant="secondary"
        disabled={idle || adding}
        onPress={onRepeat}
      />
      <Button
        title={t(added ? 'study.flash.added' : 'study.flash.addDifficult')}
        variant="primary"
        disabled={idle || adding || added}
        onPress={onAdd}
      />
      <Button title={t('study.backToFolder')} variant="secondary" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
  center: {
    textAlign: 'center',
  },
});
