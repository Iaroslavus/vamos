import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import { folderTitle } from '../display';
import { sortFolders } from '../model';
import type { Folder } from '../types';
import { BottomSheet } from './BottomSheet';

type MoveItemSheetProps = {
  visible: boolean;
  folders: readonly Folder[];
  fromId: string;
  onClose: () => void;
  onMove: (folderId: string) => void;
};

export function MoveItemSheet({ visible, folders, fromId, onClose, onMove }: MoveItemSheetProps) {
  const { t } = useTranslation();
  const targets = sortFolders(folders).filter(
    (folder) => folder.id !== fromId && folder.systemKey !== 'difficult',
  );

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text variant="h3" style={styles.center}>
        {t('vocab.moveTitle')}
      </Text>
      {targets.length === 0 ? (
        <Text variant="body" color={colors.inkMuted} style={styles.center}>
          {t('vocab.moveEmpty')}
        </Text>
      ) : (
        targets.map((folder) => {
          const title = folderTitle(folder, t);
          return (
            <Pressable
              key={folder.id}
              accessibilityRole="button"
              accessibilityLabel={t('vocab.moveTo', { name: title })}
              onPress={() => onMove(folder.id)}
              style={styles.row}
            >
              <Text variant="bodyBold">{title}</Text>
            </Pressable>
          );
        })
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  center: {
    textAlign: 'center',
  },
  row: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: space.sm,
  },
});
