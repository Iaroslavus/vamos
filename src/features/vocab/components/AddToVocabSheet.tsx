import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, fonts, radius, space, type } from '@/theme/tokens';

import { folderTitle } from '../display';
import { folderSwatch, folderTint } from '../folderColor';
import { useAddToVocabSheet } from '../hooks/useAddToVocabSheet';
import { folderHoldsAll, FOLDER_NAME_MAX } from '../model';
import { BottomSheet } from './BottomSheet';
import { SaveToast } from './SaveToast';

type AddToVocabSheetProps = {
  visible: boolean;
  itemIds: readonly string[];
  onClose: () => void;
  onChanged: () => void;
};

export function AddToVocabSheet({ visible, itemIds, onClose, onChanged }: AddToVocabSheetProps) {
  const { t } = useTranslation();
  const sheet = useAddToVocabSheet({ visible, itemIds, onClose, onChanged });

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose}>
        <Text variant="h3" style={styles.center}>
          {t('vocab.addTitle')}
        </Text>
        {sheet.failed ? (
          <Text variant="caption" color={colors.errorInk} style={styles.center}>
            {t('vocab.saveError')}
          </Text>
        ) : null}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          contentContainerStyle={styles.listContent}
        >
          {sheet.folders.map((folder) => {
            const title = folderTitle(folder, t);
            const held = sheet.snapshot
              ? folderHoldsAll(sheet.snapshot.items, folder.id, itemIds)
              : false;
            const checked = sheet.checked.has(folder.id);
            return (
              <Pressable
                key={folder.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled: sheet.busy }}
                accessibilityLabel={
                  held
                    ? t('vocab.alreadyInFolder', { name: title })
                    : t('vocab.addToFolder', { name: title })
                }
                disabled={sheet.busy}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  sheet.toggle(folder.id);
                }}
                style={styles.row}
              >
                <View style={[styles.mark, checked ? styles.markOn : null]}>
                  {checked ? <Check size={16} color={colors.inkOnDark} strokeWidth={2.6} /> : null}
                </View>
                <View style={[styles.dot, { backgroundColor: folderTint(folder.color) }]}>
                  <View style={[styles.core, { backgroundColor: folderSwatch(folder.color) }]} />
                </View>
                <Text variant="bodyBold" style={styles.name}>
                  {title}
                </Text>
                {held ? (
                  <Text variant="caption" color={colors.teal}>
                    {t('vocab.alreadyIn')}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
        <Button
          title={t('vocab.newFolder')}
          variant="secondary"
          disabled={sheet.busy}
          onPress={() => sheet.setCreating((open) => !open)}
        />
        {sheet.creating ? (
          <TextInput
            accessibilityLabel={t('vocab.nameLabel')}
            value={sheet.draft}
            onChangeText={sheet.setDraft}
            placeholder={t('vocab.namePlaceholder')}
            placeholderTextColor={colors.inkDisabled}
            autoCapitalize="sentences"
            autoCorrect={false}
            autoFocus
            maxLength={FOLDER_NAME_MAX}
            style={styles.input}
          />
        ) : null}
        {sheet.invalid ? (
          <Text variant="caption" color={colors.errorInk}>
            {t('vocab.nameInvalid')}
          </Text>
        ) : null}
        <Button title={t('vocab.done')} disabled={sheet.busy} onPress={() => void sheet.save()} />
      </BottomSheet>
      <SaveToast message={sheet.toast} onHide={sheet.dismissToast} />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    textAlign: 'center',
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 320,
  },
  listContent: {
    gap: space.sm,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  mark: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  markOn: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  dot: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: 16,
    height: 16,
    borderRadius: radius.pill,
  },
  name: {
    flex: 1,
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
});
