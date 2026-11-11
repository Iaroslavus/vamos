import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAudioPreference } from '@/features/audio/preference';
import { colors } from '@/theme/tokens';

import { FolderContents } from './components/FolderContents';
import { FolderFormSheet } from './components/FolderFormSheet';
import {
  DeleteFolderSheet,
  FolderMenuButton,
  FolderMenuSheet,
  SoonSheet,
} from './components/FolderManageSheets';
import { MoveItemSheet } from './components/MoveItemSheet';
import { PhraseSearchModal } from './components/PhraseSearchModal';
import { vocabRepository } from './defaultRepository';
import { folderTitle } from './display';
import { useFolders } from './hooks/useFolders';

export function FolderScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const folderId = typeof params.id === 'string' ? params.id : '';
  const vocab = useFolders();
  const preference = useAudioPreference();
  const [movingId, setMovingId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [searching, setSearching] = useState(false);
  const [soon, setSoon] = useState(false);

  const folder = vocab.snapshot?.folders.find((entry) => entry.id === folderId);
  const title = folder ? folderTitle(folder, t) : t('vocab.title');
  const editable = folder != null && folder.systemKey !== 'difficult';
  const custom = folder?.kind === 'custom';
  const itemIds = useMemo(
    () =>
      vocab.snapshot?.items
        .filter((item) => item.folderId === folderId)
        .map((item) => item.itemId) ?? [],
    [folderId, vocab.snapshot?.items],
  );

  const change = async (task: () => Promise<unknown>) => {
    await task();
    await vocab.refresh();
  };

  const togglePhrase = (itemId: string) => {
    if (!vocab.userId || !folder) return Promise.resolve();
    const present = itemIds.includes(itemId);
    const task = present
      ? vocabRepository.removeItem(vocab.userId, folder.id, itemId)
      : vocabRepository.addItems(vocab.userId, folder.id, [itemId]);
    return task.then(() => vocab.refresh());
  };

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title,
          headerRight: custom
            ? () => <FolderMenuButton onPress={() => setMenuOpen(true)} />
            : undefined,
        }}
      />
      <FolderContents
        isError={vocab.isError}
        isReady={vocab.isSuccess}
        folder={folder}
        userId={vocab.userId}
        itemIds={itemIds}
        editable={editable}
        preference={preference}
        onRetry={() => {
          void vocab.refetch();
        }}
        onRemove={(itemId) => {
          const userId = vocab.userId;
          if (!userId || !folder) return;
          void change(() => vocabRepository.removeItem(userId, folder.id, itemId));
        }}
        onMove={setMovingId}
        onAdd={() => setSearching(true)}
      />
      <MoveItemSheet
        visible={movingId !== null}
        folders={vocab.snapshot?.folders ?? []}
        fromId={folderId}
        onClose={() => setMovingId(null)}
        onMove={(toId) => {
          const userId = vocab.userId;
          if (!userId || !movingId) return;
          const itemId = movingId;
          setMovingId(null);
          void change(() => vocabRepository.moveItem(userId, { itemId, fromId: folderId, toId }));
        }}
      />
      {folder?.kind === 'custom' ? (
        <FolderFormSheet
          visible={editing}
          title={t('folder.edit')}
          submitLabel={t('vocab.save')}
          initialName={folder.name}
          initialColor={folder.color}
          onClose={() => setEditing(false)}
          onSubmit={async (input) => {
            if (!vocab.userId) throw new Error('Invalid user id');
            await vocabRepository.updateFolder(vocab.userId, folder.id, input);
            await vocab.refresh();
          }}
        />
      ) : null}
      <FolderMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onEdit={() => setEditing(true)}
        onDelete={() => setConfirmingDelete(true)}
      />
      <DeleteFolderSheet
        visible={confirmingDelete}
        name={folder?.name ?? ''}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={async () => {
          if (!vocab.userId || !folder) throw new Error('Invalid user id');
          await vocabRepository.deleteFolder(vocab.userId, folder.id);
          await vocab.refresh();
        }}
        onDeleted={() => router.back()}
      />
      {searching ? (
        <PhraseSearchModal
          visible
          selectedIds={itemIds}
          onClose={() => {
            setSearching(false);
            setSoon(false);
          }}
          onToggle={togglePhrase}
          onAddOwn={() => setSoon(true)}
        />
      ) : null}
      <SoonSheet visible={soon} onClose={() => setSoon(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
});
