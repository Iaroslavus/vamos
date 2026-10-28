import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { RetryNote } from '@/components/RetryNote';
import { Text } from '@/components/Text';
import { playLessonAudio } from '@/features/audio/playback';
import { useAudioPreference } from '@/features/audio/preference';
import type { AudioPreference } from '@/features/audio/select';
import { contentLanguage, getItem } from '@/features/content/loader';
import { textOf } from '@/features/content/text';
import { itemAudioPath } from '@/features/lesson/intro';
import { colors, space } from '@/theme/tokens';

import { FolderFormSheet } from './components/FolderFormSheet';
import { FolderItemRow } from './components/FolderItemRow';
import { MoveItemSheet } from './components/MoveItemSheet';
import { folderTitle } from './display';
import { useFolders } from './hooks/useFolders';
import { vocabRepository } from './defaultRepository';

export function FolderScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const folderId = typeof params.id === 'string' ? params.id : '';
  const vocab = useFolders();
  const [movingId, setMovingId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const folder = vocab.snapshot?.folders.find((entry) => entry.id === folderId);
  const title = folder ? folderTitle(folder, t) : t('vocab.title');
  const editable = folder != null && folder.systemKey !== 'difficult';
  const itemIds =
    vocab.snapshot?.items.filter((item) => item.folderId === folderId).map((item) => item.itemId) ??
    [];
  const due = vocab.rows.find((row) => row.folder.id === folderId)?.due ?? 0;
  const preference = useAudioPreference();

  const change = async (task: () => Promise<unknown>) => {
    await task();
    await vocab.refresh();
  };

  let body = (
    <View style={styles.empty}>
      <Text variant="body" color={colors.inkMuted}>
        {t('vocab.loading')}
      </Text>
    </View>
  );

  if (vocab.isError) {
    body = (
      <RetryNote
        title={t('vocab.loadError')}
        action={t('common.retry')}
        onPress={() => {
          void vocab.refetch();
        }}
      />
    );
  } else if (vocab.isSuccess && !folder) {
    body = (
      <View style={styles.empty}>
        <Text variant="h3" style={styles.center}>
          {t('vocab.missing')}
        </Text>
      </View>
    );
  } else if (folder) {
    body = (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Button
          title={t('vocab.reviewFolder', { count: due })}
          disabled={due === 0}
          onPress={() => router.push({ pathname: '/review', params: { folder: folder.id } })}
        />
        {itemIds.length === 0 ? (
          <Text variant="body" color={colors.inkMuted} style={styles.center}>
            {t('vocab.emptyFolder')}
          </Text>
        ) : (
          itemIds.map((itemId) => {
            const word = lookup(itemId, preference);
            return (
              <FolderItemRow
                key={itemId}
                es={word.es}
                ru={word.ru}
                editable={editable}
                onPlay={() => {
                  void playLessonAudio({ text: word.es, audio: word.audio });
                }}
                onRemove={() => {
                  if (!vocab.userId) return;
                  void change(() =>
                    vocabRepository.removeItem(vocab.userId as string, folder.id, itemId),
                  );
                }}
                onMove={() => setMovingId(itemId)}
              />
            );
          })
        )}
        {folder.kind === 'custom' ? (
          <Button
            title={t('vocab.editFolder')}
            variant="secondary"
            onPress={() => setEditing(true)}
          />
        ) : null}
      </ScrollView>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title }} />
      {body}
      <MoveItemSheet
        visible={movingId !== null}
        folders={vocab.snapshot?.folders ?? []}
        fromId={folderId}
        onClose={() => setMovingId(null)}
        onMove={(toId) => {
          if (!vocab.userId || !movingId) return;
          const itemId = movingId;
          setMovingId(null);
          void change(() =>
            vocabRepository.moveItem(vocab.userId as string, { itemId, fromId: folderId, toId }),
          );
        }}
      />
      {folder?.kind === 'custom' ? (
        <FolderFormSheet
          visible={editing}
          title={t('vocab.editTitle')}
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
    </View>
  );
}

function lookup(
  itemId: string,
  preference: AudioPreference,
): { es: string; ru: string; audio: string | null } {
  try {
    const item = getItem(itemId);
    return {
      es: item.es,
      ru: textOf(item.tr, contentLanguage()),
      audio: itemAudioPath(item, preference),
    };
  } catch {
    return { es: itemId, ru: '', audio: null };
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  content: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.xxxl,
    gap: space.md,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  center: {
    textAlign: 'center',
  },
});
