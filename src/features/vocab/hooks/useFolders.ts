import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/features/auth/useSession';
import { getItem, listLessons, listTopics } from '@/features/content/loader';
import { contentLocale, textOf } from '@/features/content/text';
import { useProgress } from '@/features/progress/useProgress';
import { reviewRepository } from '@/features/review/defaultRepository';
import { selectDueCards } from '@/features/review/fsrs';
import { dueUnitCount, learnedUnitCount, nextDueInMs } from '@/features/review/units';

import { vocabRepository } from '../defaultRepository';
import { folderTitle } from '../display';
import {
  countMatchingUnits,
  difficultItemIds,
  folderCountNoun,
  sortFolders,
  topicSeeds,
} from '../model';
import type { CountNoun } from '../model';
import type { Folder } from '../types';

export type FolderRowModel = {
  folder: Folder;
  title: string;
  count: number;
  due: number;
  countNoun: CountNoun;
  icon?: string;
};

export function vocabQueryKey(userId: string, completedKey: string, language: string) {
  return ['vocab', userId, completedKey, language] as const;
}

export function useFolders() {
  const { t, i18n } = useTranslation();
  const language = contentLocale(i18n.language);
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
    queryKey: userId ? vocabQueryKey(userId, completedKey, language) : ['vocab', 'signed-out'],
    enabled: userId != null && progress.isSuccess,
    networkMode: 'offlineFirst',
    queryFn: async () => {
      const review = await reviewRepository.read(userId as string);
      const now = new Date();
      const snapshot = await vocabRepository.syncDerived(userId as string, {
        topics: topicSeeds(
          listTopics().map((topic) => ({
            id: topic.id,
            title: textOf(topic.title, language),
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
      const dueCards = selectDueCards(review.cards, now);
      return {
        snapshot,
        dueCards,
        learned: learnedUnitCount(review.cards),
        due: dueUnitCount(review.cards, now),
        nextInMs: nextDueInMs(review.cards, now),
      };
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
        due: countMatchingUnits(query.data?.dueCards ?? [], itemIds),
        countNoun: folderCountNoun(itemIds.map(itemType)),
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
    learnedTotal: query.data?.learned ?? 0,
    dueTotal: query.data?.due ?? 0,
    nextInMs: query.data?.nextInMs ?? null,
    userId,
    refresh,
    snapshot: query.data?.snapshot,
  };
}

function itemType(itemId: string): 'word' | 'phrase' | null {
  try {
    return getItem(itemId).type;
  } catch {
    return null;
  }
}
