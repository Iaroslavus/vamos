import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAudioPreference } from '@/features/audio/preference';
import { reviewRepository } from '@/features/review/defaultRepository';
import { reviewDueQueryKey } from '@/features/review/hooks/useReviewDueCount';
import { reviewSnapshotKey } from '@/features/study/hooks/useReviewSnapshot';
import { colors } from '@/theme/tokens';

import { CustomWordSheet } from './components/CustomWordSheet';
import { DeleteCustomWordSheet } from './components/DeleteCustomWordSheet';
import { FolderContents } from './components/FolderContents';
import { FolderFormSheet } from './components/FolderFormSheet';
import {
  DeleteFolderSheet,
  FolderMenuButton,
  FolderMenuSheet,
} from './components/FolderManageSheets';
import { MoveItemSheet } from './components/MoveItemSheet';
import { PhraseSearchModal } from './components/PhraseSearchModal';
import { deleteCustomWord, saveCustomWord, updateCustomWord } from './customWord';
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
  const [composer, setComposer] = useState<
    null | { mode: 'create' } | { mode: 'edit'; id: string }
  >(null);
  const [deletingWordId, setDeletingWordId] = useState<string | null>(null);
  const queryClient = useQueryClient();

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
  const userItems = vocab.snapshot?.userItems ?? [];
  const editingWord = userItems.find(
    (item) => item.id === (composer?.mode === 'edit' ? composer.id : ''),
  );
  const deletingWord = userItems.find((item) => item.id === deletingWordId);

  const change = async (task: () => Promise<unknown>) => {
    await task();
    await vocab.refresh();
    if (vocab.userId) {
      await queryClient.invalidateQueries({ queryKey: reviewSnapshotKey(vocab.userId) });
      await queryClient.invalidateQueries({ queryKey: reviewDueQueryKey(vocab.userId) });
    }
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
        userItems={userItems}
        editable={editable}
        preference={preference}
        onRetry={() => {
          void vocab.refetch();
        }}
        onRemove={(itemId) => {
          const userId = vocab.userId;
          if (!userId || !folder) return;
          if (userItems.some((item) => item.id === itemId)) {
            setDeletingWordId(itemId);
            return;
          }
          void change(() => vocabRepository.removeItem(userId, folder.id, itemId));
        }}
        onEdit={(itemId) => setComposer({ mode: 'edit', id: itemId })}
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
          const owned = userItems.map((item) => item.id);
          await vocabRepository.deleteFolder(vocab.userId, folder.id);
          const after = await vocabRepository.read(vocab.userId);
          const removed = owned.filter((id) => !after.userItems.some((item) => item.id === id));
          if (removed.length > 0) {
            await reviewRepository.forgetItems(vocab.userId, removed);
          }
          await vocab.refresh();
        }}
        onDeleted={() => router.back()}
      />
      {searching ? (
        <PhraseSearchModal
          visible
          selectedIds={itemIds}
          onClose={() => setSearching(false)}
          onToggle={togglePhrase}
          onAddOwn={() => {
            setSearching(false);
            setComposer({ mode: 'create' });
          }}
        />
      ) : null}
      <CustomWordSheet
        visible={composer !== null}
        mode={composer?.mode ?? 'create'}
        editingId={composer?.mode === 'edit' ? composer.id : undefined}
        initial={
          editingWord
            ? { es: editingWord.es, tr: editingWord.tr, note: editingWord.note ?? '' }
            : undefined
        }
        existing={userItems}
        onClose={() => setComposer(null)}
        onSubmit={async (draft) => {
          if (!vocab.userId || !folder) throw new Error('Invalid user id');
          if (composer?.mode === 'edit') {
            await updateCustomWord(vocabRepository, vocab.userId, composer.id, draft, userItems);
          } else {
            await saveCustomWord(
              vocabRepository,
              reviewRepository,
              vocab.userId,
              folder.id,
              draft,
              userItems,
            );
          }
          await change(async () => undefined);
        }}
      />
      <DeleteCustomWordSheet
        visible={deletingWordId !== null}
        es={deletingWord?.es ?? ''}
        onClose={() => setDeletingWordId(null)}
        onConfirm={async () => {
          if (!vocab.userId || !deletingWordId) throw new Error('Invalid user id');
          await deleteCustomWord(vocabRepository, reviewRepository, vocab.userId, deletingWordId);
          await change(async () => undefined);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
});
