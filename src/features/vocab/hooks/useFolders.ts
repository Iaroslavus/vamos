import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/features/auth/useSession';
import { listLessons, listTopics } from '@/features/content/loader';
import { deviceTimeZone } from '@/features/progress/study';
import { useProgress } from '@/features/progress/useProgress';
import { reviewRepository } from '@/features/review/defaultRepository';
import { buildReviewQueue } from '@/features/review/session';

import { folderTitle } from '../display';
import { countMatchingCards, difficultItemIds, sortFolders, topicSeeds } from '../model';
import { vocabRepository } from '../defaultRepository';
import type { Folder } from '../types';

export type FolderRowModel = {
  folder: Folder;
  title: string;
  count: number;
  due: number;
  icon?: string;
};

export function vocabQueryKey(userId: string, completedKey: string) {
  return ['vocab', userId, completedKey] as const;
}

export function useFolders() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const progress = useProgress();
  const queryClient = useQueryClient();
  const completedIds = useMemo(
    () =>
      (progress.data?.lessons ?? [])
        .filter((lesson) => lesson.status === 'completed')
        .map((lesson) => lesson.lessonId),
    [progress.data],
  );
  const completedKey = completedIds.join('|');

  const query = useQuery({
    queryKey: userId ? vocabQueryKey(userId, completedKey) : ['vocab', 'signed-out'],
    enabled: userId != null && progress.isSuccess,
    networkMode: 'offlineFirst',
    queryFn: async () => {
      const review = await reviewRepository.read(userId as string);
      const now = new Date();
      const snapshot = await vocabRepository.syncDerived(userId as string, {
        topics: topicSeeds(
          listTopics().map((topic) => ({
            id: topic.id,
            title: topic.title_ru,
            lessonIds: topic.lessons,
          })),
          listLessons().map((lesson) => ({
            id: lesson.id,
            topicId: lesson.topic,
            itemIds: lesson.items,
          })),
          completedIds,
        ),
        difficultItemIds: difficultItemIds(
          review.logs.map((log) => ({
            itemId: log.itemId,
            rating: log.rating,
            reviewedAt: log.reviewedAt,
          })),
          now,
        ),
      });
      const dueCards = buildReviewQueue({
        cards: review.cards,
        logs: review.logs,
        now,
        timeZone: deviceTimeZone(),
      }).cards;
      return { snapshot, dueCards };
    },
  });

  useEffect(() => {
    if (!userId) return;
    return vocabRepository.start(userId, () => {
      void queryClient.invalidateQueries({ queryKey: ['vocab', userId] });
    });
  }, [queryClient, userId]);

  const rows = useMemo<FolderRowModel[]>(() => {
    const snapshot = query.data?.snapshot;
    if (!snapshot) return [];
    const icons = new Map(listTopics().map((topic) => [topic.id, topic.icon]));
    return sortFolders(snapshot.folders).map((folder) => {
      const itemIds = snapshot.items
        .filter((item) => item.folderId === folder.id)
        .map((item) => item.itemId);
      return {
        folder,
        title: folderTitle(folder, t),
        count: itemIds.length,
        due: countMatchingCards(query.data?.dueCards ?? [], itemIds),
        ...(folder.topicId ? { icon: icons.get(folder.topicId) } : {}),
      };
    });
  }, [query.data, t]);

  const refresh = () => {
    if (!userId) return Promise.resolve();
    return queryClient.invalidateQueries({ queryKey: ['vocab', userId] });
  };

  return {
    ...query,
    rows,
    dueTotal: query.data?.dueCards.length ?? 0,
    userId,
    refresh,
    snapshot: query.data?.snapshot,
  };
}
