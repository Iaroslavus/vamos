import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/features/auth/useSession';
import { contentLocale, textOf } from '@/features/content/text';
import type { Topic } from '@/features/content/schema';
import { FOLDER_NAME_MAX } from '@/features/vocab/model';
import { vocabRepository } from '@/features/vocab/defaultRepository';

export type CheatsheetToast = {
  message: string;
  undo: (() => Promise<void>) | null;
};

export function useSaveTopicPhrases(topic: Topic | null, itemIds: readonly string[]) {
  const { t, i18n } = useTranslation();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? null;
  const [toast, setToast] = useState<CheatsheetToast | null>(null);
  const [busy, setBusy] = useState(false);

  const dismiss = useCallback(() => setToast(null), []);

  const addAll = useCallback(async () => {
    if (!topic || !userId || busy || itemIds.length === 0) return;
    setBusy(true);
    try {
      const name = folderName(textOf(topic.title, contentLocale(i18n.language)), topic.id);
      const result = await vocabRepository.addTopicItems(userId, {
        topicId: topic.id,
        name,
        itemIds,
      });
      await queryClient.invalidateQueries({ queryKey: ['vocab'] });
      if (result.addedIds.length === 0) {
        setToast({ message: t('cheatsheet.already', { folder: result.name }), undo: null });
        return;
      }
      setToast({
        message: t('cheatsheet.added', { folder: result.name }),
        undo: async () => {
          await vocabRepository.undoTopicItems(userId, {
            folderId: result.folderId,
            itemIds: result.addedIds,
            dropFolder: result.created,
          });
          await queryClient.invalidateQueries({ queryKey: ['vocab'] });
        },
      });
    } catch {
      setToast({ message: t('cheatsheet.addFailed'), undo: null });
    } finally {
      setBusy(false);
    }
  }, [busy, i18n.language, itemIds, queryClient, t, topic, userId]);

  return { toast, dismiss, addAll, busy };
}

function folderName(title: string, fallback: string): string {
  const source = title.trim() || fallback.trim();
  if (source.length <= FOLDER_NAME_MAX) return source;
  return source.slice(0, FOLDER_NAME_MAX).trim();
}
