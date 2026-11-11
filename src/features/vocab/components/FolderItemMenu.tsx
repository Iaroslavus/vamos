import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { space } from '@/theme/tokens';

import { BottomSheet } from './BottomSheet';

type FolderItemMenuProps = {
  es: string;
  onClose: () => void;
  onMove: () => void;
  onRemove: () => void;
};

export function FolderItemMenu({ es, onClose, onMove, onRemove }: FolderItemMenuProps) {
  const { t } = useTranslation();

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.body}>
        <Text variant="h3">{es}</Text>
        <Button
          title={t('vocab.moveTitle')}
          variant="secondary"
          accessibilityLabel={t('vocab.move', { es })}
          onPress={() => {
            onClose();
            onMove();
          }}
        />
        <Button
          title={t('vocab.delete')}
          accessibilityLabel={t('vocab.deleteNamed', { es })}
          onPress={() => {
            onClose();
            onRemove();
          }}
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
