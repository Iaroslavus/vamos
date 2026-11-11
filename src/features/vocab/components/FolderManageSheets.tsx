import { Ellipsis } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import { BottomSheet } from './BottomSheet';

type FolderMenuButtonProps = {
  onPress: () => void;
};

export function FolderMenuButton({ onPress }: FolderMenuButtonProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('folder.menu')}
      onPress={onPress}
      style={styles.hit}
    >
      <Ellipsis color={colors.ink} size={22} strokeWidth={2.2} />
    </Pressable>
  );
}

type FolderMenuSheetProps = {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function FolderMenuSheet({ visible, onClose, onEdit, onDelete }: FolderMenuSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Button
          title={t('folder.edit')}
          variant="secondary"
          onPress={() => {
            onClose();
            onEdit();
          }}
        />
        <Button
          title={t('folder.delete')}
          onPress={() => {
            onClose();
            onDelete();
          }}
        />
      </View>
    </BottomSheet>
  );
}

type DeleteFolderSheetProps = {
  visible: boolean;
  name: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onDeleted: () => void;
};

export function DeleteFolderSheet({
  visible,
  name,
  onClose,
  onConfirm,
  onDeleted,
}: DeleteFolderSheetProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const confirm = () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    void onConfirm()
      .then(() => {
        onClose();
        onDeleted();
      })
      .catch(() => {
        setFailed(true);
        setBusy(false);
      });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {visible ? (
        <View style={styles.body}>
          <Text variant="h3" style={styles.center}>
            {t('folder.deleteTitle')}
          </Text>
          <Text variant="body" color={colors.inkMuted} style={styles.center}>
            {t('folder.deleteBody', { name })}
          </Text>
          {failed ? (
            <Text variant="caption" color={colors.errorInk} style={styles.center}>
              {t('vocab.saveError')}
            </Text>
          ) : null}
          <Button title={t('folder.deleteConfirm')} disabled={busy} onPress={confirm} />
        </View>
      ) : null}
    </BottomSheet>
  );
}

type SoonSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function SoonSheet({ visible, onClose }: SoonSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Text variant="h3" style={styles.center}>
          {t('folder.addOwn')}
        </Text>
        <Text variant="body" color={colors.inkMuted} style={styles.center}>
          {t('folder.soon')}
        </Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: space.md,
  },
  center: {
    textAlign: 'center',
  },
});
