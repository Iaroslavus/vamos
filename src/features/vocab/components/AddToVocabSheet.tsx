import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useSession } from '@/features/auth/useSession';
import { colors, radius, space } from '@/theme/tokens';

import { folderTitle } from '../display';
import { folderSwatch, folderTint } from '../folderColor';
import { folderHoldsAll, sortFolders } from '../model';
import { vocabRepository } from '../defaultRepository';
import type { FolderSnapshot } from '../types';
import { BottomSheet } from './BottomSheet';
import { FolderFormSheet } from './FolderFormSheet';

type AddToVocabSheetProps = {
  visible: boolean;
  itemIds: readonly string[];
  onClose: () => void;
  onChanged: () => void;
};

export function AddToVocabSheet({ visible, itemIds, onClose, onChanged }: AddToVocabSheetProps) {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [snapshot, setSnapshot] = useState<FolderSnapshot | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setFailed(false);
  }

  useEffect(() => {
    if (!visible || !userId) return;
    let cancelled = false;
    void vocabRepository
      .ensureBases(userId)
      .then((next) => {
        if (!cancelled) setSnapshot(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, visible]);

  const folders = sortFolders(snapshot?.folders ?? []).filter(
    (folder) => folder.systemKey !== 'difficult',
  );

  const toggle = (folderId: string) => {
    if (!userId || !snapshot || busyId) return;
    const held = folderHoldsAll(snapshot.items, folderId, itemIds);
    setBusyId(folderId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void (
      held
        ? removeItems(userId, folderId, itemIds)
        : vocabRepository.addItems(userId, folderId, itemIds)
    )
      .then((next) => {
        setSnapshot(next);
        onChanged();
      })
      .catch(() => setFailed(true))
      .finally(() => setBusyId(null));
  };

  return (
    <>
      <BottomSheet visible={visible && !creating} onClose={onClose}>
        <Text variant="h3" style={styles.center}>
          {t('vocab.addTitle')}
        </Text>
        {failed ? (
          <Text variant="caption" color={colors.errorInk} style={styles.center}>
            {t('vocab.saveError')}
          </Text>
        ) : null}
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {folders.map((folder) => {
            const title = folderTitle(folder, t);
            const held = snapshot ? folderHoldsAll(snapshot.items, folder.id, itemIds) : false;
            return (
              <Pressable
                key={folder.id}
                accessibilityRole="button"
                accessibilityState={{ selected: held, disabled: busyId !== null }}
                accessibilityLabel={
                  held
                    ? t('vocab.removeFromFolder', { name: title })
                    : t('vocab.addToFolder', { name: title })
                }
                disabled={busyId !== null}
                onPress={() => toggle(folder.id)}
                style={styles.row}
              >
                <View style={[styles.dot, { backgroundColor: folderTint(folder.color) }]}>
                  <View style={[styles.core, { backgroundColor: folderSwatch(folder.color) }]} />
                </View>
                <Text variant="bodyBold" style={styles.name}>
                  {title}
                </Text>
                <Text variant="caption" color={held ? colors.teal : colors.inkMuted}>
                  {held ? t('vocab.savedIn') : t('vocab.addShort')}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Button
          title={t('vocab.newFolder')}
          variant="secondary"
          onPress={() => setCreating(true)}
        />
        <Button title={t('vocab.done')} onPress={onClose} />
      </BottomSheet>
      <FolderFormSheet
        visible={visible && creating}
        title={t('vocab.createTitle')}
        onClose={() => setCreating(false)}
        onSubmit={async (input) => {
          if (!userId) throw new Error('Invalid user id');
          const next = await vocabRepository.createFolder(userId, input);
          setSnapshot(next);
          onChanged();
        }}
      />
    </>
  );
}

async function removeItems(
  userId: string,
  folderId: string,
  itemIds: readonly string[],
): Promise<FolderSnapshot> {
  let latest = await vocabRepository.read(userId);
  for (const itemId of itemIds) {
    const present = latest.items.some(
      (item) => item.folderId === folderId && item.itemId === itemId,
    );
    if (!present) continue;
    latest = await vocabRepository.removeItem(userId, folderId, itemId);
  }
  return latest;
}

const styles = StyleSheet.create({
  center: {
    textAlign: 'center',
  },
  list: {
    gap: space.sm,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
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
});
