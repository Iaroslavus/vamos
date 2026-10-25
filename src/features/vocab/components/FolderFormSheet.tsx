import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, fonts, radius, space, type } from '@/theme/tokens';

import { folderSwatch } from '../folderColor';
import { FOLDER_COLORS, FOLDER_NAME_MAX, type FolderColor } from '../model';
import { BottomSheet } from './BottomSheet';

type FolderFormSheetProps = {
  visible: boolean;
  title: string;
  initialName?: string;
  initialColor?: FolderColor;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (input: { name: string; color: FolderColor }) => Promise<void>;
};

export function FolderFormSheet({ visible, onClose, ...fields }: FolderFormSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {visible ? (
        <FolderFormFields
          key={`${fields.initialName ?? ''}:${fields.initialColor ?? 'coral'}`}
          title={fields.title}
          initialName={fields.initialName}
          initialColor={fields.initialColor}
          submitLabel={fields.submitLabel}
          onClose={onClose}
          onSubmit={fields.onSubmit}
        />
      ) : null}
    </BottomSheet>
  );
}

function FolderFormFields({
  title,
  initialName = '',
  initialColor = 'coral',
  submitLabel,
  onClose,
  onSubmit,
}: Omit<FolderFormSheetProps, 'visible'>) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState<FolderColor>(initialColor);
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (busy) return;
    setBusy(true);
    setInvalid(false);
    void onSubmit({ name, color })
      .then(onClose)
      .catch(() => {
        setInvalid(true);
        setBusy(false);
      });
  };

  return (
    <>
      <Text variant="h3" style={styles.center}>
        {title}
      </Text>
      <Text variant="bodyBold">{t('vocab.nameLabel')}</Text>
      <TextInput
        accessibilityLabel={t('vocab.nameLabel')}
        value={name}
        onChangeText={setName}
        placeholder={t('vocab.namePlaceholder')}
        placeholderTextColor={colors.inkDisabled}
        autoCapitalize="sentences"
        autoCorrect={false}
        maxLength={FOLDER_NAME_MAX}
        style={styles.input}
      />
      <Text variant="bodyBold">{t('vocab.colorLabel')}</Text>
      <View style={styles.colors}>
        {FOLDER_COLORS.map((option) => {
          const selected = option === color;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={t(`vocab.colors.${option}`)}
              accessibilityState={{ selected }}
              onPress={() => setColor(option)}
              style={[
                styles.swatch,
                { backgroundColor: folderSwatch(option) },
                selected ? styles.swatchOn : null,
              ]}
            />
          );
        })}
      </View>
      {invalid ? (
        <Text variant="caption" color={colors.errorInk}>
          {t('vocab.nameInvalid')}
        </Text>
      ) : null}
      <Button title={submitLabel ?? t('vocab.create')} disabled={busy} onPress={submit} />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    textAlign: 'center',
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.ground,
    paddingHorizontal: space.lg,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: type.body.fontSize,
  },
  colors: {
    flexDirection: 'row',
    gap: space.md,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  swatchOn: {
    borderColor: colors.ink,
  },
});
