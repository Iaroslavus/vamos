import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import { BottomSheet } from './BottomSheet';

type DeleteCustomWordSheetProps = {
  visible: boolean;
  es: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function DeleteCustomWordSheet({
  visible,
  es,
  onClose,
  onConfirm,
}: DeleteCustomWordSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {visible ? <DeleteBody es={es} onClose={onClose} onConfirm={onConfirm} /> : null}
    </BottomSheet>
  );
}

function DeleteBody({ es, onClose, onConfirm }: Omit<DeleteCustomWordSheetProps, 'visible'>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const confirm = () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    void onConfirm()
      .then(onClose)
      .catch(() => {
        setFailed(true);
        setBusy(false);
      });
  };

  return (
    <View style={styles.body}>
      <Text variant="h3" style={styles.center}>
        {t('customWords.deleteTitle')}
      </Text>
      <Text variant="body" color={colors.inkMuted} style={styles.center}>
        {t('customWords.deleteBody', { es })}
      </Text>
      {failed ? (
        <Text variant="caption" color={colors.errorInk} style={styles.center}>
          {t('customWords.saveError')}
        </Text>
      ) : null}
      <Button title={t('customWords.deleteConfirm')} disabled={busy} onPress={confirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: space.md,
  },
  center: {
    textAlign: 'center',
  },
});
