import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { space } from '@/theme/tokens';

import { BottomSheet } from './BottomSheet';

type FolderItemMenuProps = {
  es: string;
  own?: boolean;
  onClose: () => void;
  onMove: () => void;
  onRemove: () => void;
  onEdit?: () => void;
};

export function FolderItemMenu({
  es,
  own = false,
  onClose,
  onMove,
  onRemove,
  onEdit,
}: FolderItemMenuProps) {
  const { t } = useTranslation();
  const run = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.body}>
        <Text variant="h3">{es}</Text>
        {own ? (
          <Button
            title={t('customWords.edit')}
            variant="secondary"
            accessibilityLabel={t('customWords.editNamed', { es })}
            onPress={() => run(() => onEdit?.())}
          />
        ) : null}
        <Button
          title={t('vocab.moveTitle')}
          variant="secondary"
          accessibilityLabel={t('vocab.move', { es })}
          onPress={() => run(onMove)}
        />
        <Button
          title={own ? t('customWords.delete') : t('vocab.delete')}
          accessibilityLabel={
            own ? t('customWords.deleteNamed', { es }) : t('vocab.deleteNamed', { es })
          }
          onPress={() => run(onRemove)}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: space.md,
  },
});
