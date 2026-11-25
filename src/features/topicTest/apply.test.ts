import { createProgressRepository } from '@/features/progress/repository';
import type { KeyValueStorage, NetworkMonitor, ProgressRemote } from '@/features/progress/types';
import { createReviewRepository } from '@/features/review/repository';
import type { ReviewRemote } from '@/features/review/types';
import { createVocabRepository } from '@/features/vocab/repository';
import type { VocabRemote } from '@/features/vocab/types';

import { applyTopicTest } from './apply';
import { settleTopicTest, type TopicTestLessonRef } from './settle';

const USER = 'user-topic-test';
const AT = '2026-11-25T12:00:00.000Z';

const lessons: TopicTestLessonRef[] = [
  { id: 'l1', number: 1, itemIds: ['a', 'b'] },
  { id: 'l2', number: 2, itemIds: ['c'] },
];

function memoryStorage(): KeyValueStorage {
  const items = new Map<string, string>();
  return {
    async getItem(key) {
      return items.get(key) ?? null;
    },
    async setItem(key, value) {
      items.set(key, value);
    },
    async removeItem(key) {
      items.delete(key);
    },
  };
}

function offline(): NetworkMonitor {
  return {
    async isOnline() {
      return false;
    },
    subscribe() {
      return () => undefined;
    },
  };
}

function writers() {
  let id = 0;
  const storage = memoryStorage();
  const network = offline();
  const schedule = () => () => undefined;
  const createId = () => {
    id += 1;
    return `id-${id}`;
  };
  const progressRemote: ProgressRemote = {
    async fetchLessons() {
      return [];
    },
    async fetchXp() {
      return [];
    },
    async saveLesson(_userId, lesson) {
      return lesson;
    },
    async insertXp() {
      return undefined;
    },
  };
  const reviewRemote: ReviewRemote = {
    async fetchCards() {
      return [];
    },
    async fetchLogs() {
      return [];
    },
    async upsertCard(_userId, card) {
      return card;
    },
    async insertLog() {
      return undefined;
    },
    async deleteCards() {
      return undefined;
    },
  };
  const vocabRemote: VocabRemote = {
    async fetchFolders() {
      return [];
    },
    async fetchItems() {
      return [];
    },
    async fetchUserItems() {
      return [];
    },
    async upsertFolder(_userId, folder) {
      return folder;
    },
    async upsertUserItem(_userId, item) {
      return item;
    },
    async deleteUserItem() {
      return undefined;
    },
    async insertItem() {
      return undefined;
    },
    async deleteItem() {
      return undefined;
    },
    async deleteFolder() {
      return undefined;
    },
  };

  return {
    progress: createProgressRepository({
      storage,
      network,
      remote: progressRemote,
      now: () => AT,
      createId,
      schedule,
    }),
    review: createReviewRepository({
      storage,
      network,
      remote: reviewRemote,
      now: () => AT,
      createId,
      schedule,
    }),
    vocab: createVocabRepository({
      storage,
      network,
      remote: vocabRemote,
      now: () => AT,
      createId,
      schedule,
      readLegacyFavorites: async () => [],
    }),
  };
}

describe('applyTopicTest', () => {
  it('marks every lesson and rates known items Good, misses Again and difficult', async () => {
    const bank = writers();
    const settlement = settleTopicTest({
      lessons,
      answers: [
        ...Array.from({ length: 8 }, () => ({ itemId: 'a', correct: true })),
        { itemId: 'c', correct: false },
        { itemId: 'c', correct: false },
      ],
      itemIds: ['a', 'b', 'c'],
    });

    expect(settlement.passed).toBe(true);
    await applyTopicTest(bank, USER, 'a1.hola', settlement, AT);

    const progress = await bank.progress.readProgress(USER);
    expect(progress.lessons.map((lesson) => lesson.lessonId).sort()).toEqual(['l1', 'l2']);
    expect(progress.lessons.every((lesson) => lesson.status === 'completed')).toBe(true);

    const review = await bank.review.read(USER);
    const card = (itemId: string) =>
      review.cards.find((entry) => entry.itemId === itemId && entry.direction === 'es_to_ru');
    const known = card('a');
    const untouched = card('b');
    const missed = card('c');
    expect(review.logs.find((log) => log.itemId === 'a')?.rating).toBe('good');
    expect(review.logs.find((log) => log.itemId === 'b')?.rating).toBe('good');
    expect(review.logs.find((log) => log.itemId === 'c')?.rating).toBe('again');
    expect(known?.reps).toBeGreaterThan(0);
    expect(untouched?.reps).toBeGreaterThan(0);
    expect(missed && known && Date.parse(missed.due) < Date.parse(known.due)).toBe(true);

    const folders = await bank.vocab.read(USER);
    const difficult = folders.folders.find((folder) => folder.systemKey === 'difficult');
    const pinned = folders.items
      .filter((item) => item.folderId === difficult?.id)
      .map((item) => item.itemId);
    expect(pinned).toEqual(['c']);
  });

  it('marks only the clean lessons and leaves FSRS alone when the test is failed', async () => {
    const bank = writers();
    const settlement = settleTopicTest({
      lessons,
      answers: [
        { itemId: 'a', correct: true },
        { itemId: 'b', correct: true },
        { itemId: 'c', correct: false },
      ],
      itemIds: ['a', 'b', 'c'],
    });

    expect(settlement.passed).toBe(false);
    expect(settlement.lessonIds).toEqual(['l1']);
    await applyTopicTest(bank, USER, 'a1.hola', settlement, AT);

    const progress = await bank.progress.readProgress(USER);
    expect(progress.lessons.map((lesson) => lesson.lessonId)).toEqual(['l1']);
    const review = await bank.review.read(USER);
    expect(review.cards).toEqual([]);
    expect(review.logs).toEqual([]);
    const folders = await bank.vocab.read(USER);
    const difficult = folders.folders.find((folder) => folder.systemKey === 'difficult');
    expect(folders.items.filter((item) => item.folderId === difficult?.id)).toEqual([]);
  });
});
