import { createReviewRepository } from '@/features/review/repository';
import type { KeyValueStorage, ReviewRemote } from '@/features/review/types';

import { difficultItemIds } from '@/features/vocab/model';

import {
  STUDY_FSRS,
  cardIsHard,
  masteryBand,
  masteryCounts,
  ratingForStudyGrade,
  recordStillLearning,
  recordStudyResult,
  settleStudyCheck,
  studyModeGrades,
} from './fsrs';
import { STUDY_MODES } from './types';

const USER = '11111111-1111-1111-1111-111111111111';

describe('STUDY_FSRS', () => {
  it('rates learn, test, and speak, and leaves cards and blitz alone', () => {
    expect(STUDY_FSRS).toEqual({
      learn: 'rating',
      test: 'rating',
      speak: 'rating',
      flashcards: 'none',
      blitz: 'none',
    });
    for (const mode of STUDY_MODES) {
      expect(studyModeGrades(mode)).toBe(STUDY_FSRS[mode] === 'rating');
    }
  });

  it('maps a pass, a retry, and a miss onto Good, Hard, and Again', () => {
    expect(ratingForStudyGrade('correct_first')).toBe('good');
    expect(ratingForStudyGrade('correct_after_error')).toBe('hard');
    expect(ratingForStudyGrade('incorrect')).toBe('again');
  });

  it('keeps the first miss open and finishes the second', () => {
    expect(settleStudyCheck([], 'wrong')).toEqual({ grades: ['wrong'], outcome: null });
    expect(settleStudyCheck(['wrong'], 'correct')).toEqual({
      grades: ['wrong', 'correct'],
      outcome: 'correct_after_error',
    });
    expect(settleStudyCheck([], 'almost')).toEqual({
      grades: ['almost'],
      outcome: 'correct_first',
    });
    expect(settleStudyCheck(['wrong'], 'wrong').outcome).toBe('incorrect');
  });
});

describe('recordStudyResult', () => {
  it('writes a rating through the repository and does not introduce a new unit', async () => {
    const repository = offlineRepository();
    await repository.introduceItems(USER, [{ id: 'hola' }]);

    const wrote = await recordStudyResult(repository, USER, {
      mode: 'learn',
      itemId: 'hola',
      direction: 'es_to_ru',
      grade: 'correct_first',
      clientId: 'learn-hola',
      reviewedAt: '2026-06-01T00:00:00.000Z',
    });
    const ignored = await recordStudyResult(repository, USER, {
      mode: 'flashcards',
      itemId: 'hola',
      direction: 'es_to_ru',
      grade: 'incorrect',
      clientId: 'cards-hola',
    });
    await recordStudyResult(repository, USER, {
      mode: 'speak',
      itemId: 'nunca',
      direction: 'es_to_ru',
      grade: 'incorrect',
      clientId: 'speak-nunca',
    });

    const snapshot = await repository.read(USER);
    expect(wrote).toBe(true);
    expect(ignored).toBe(false);
    expect(snapshot.logs.map((log) => log.rating)).toEqual(['good']);
    expect(new Set(snapshot.cards.map((card) => card.itemId))).toEqual(new Set(['hola']));
  });

  it('skips cards and blitz and records the grading modes', async () => {
    for (const mode of STUDY_MODES) {
      const repository = offlineRepository();
      await repository.introduceItems(USER, [{ id: 'hola' }]);
      const wrote = await recordStudyResult(repository, USER, {
        mode,
        itemId: 'hola',
        direction: 'es_to_ru',
        grade: 'incorrect',
        clientId: `${mode}-hola`,
      });
      const snapshot = await repository.read(USER);
      expect(wrote).toBe(studyModeGrades(mode));
      expect(snapshot.logs).toHaveLength(studyModeGrades(mode) ? 1 : 0);
    }
  });
});

describe('recordStillLearning', () => {
  it('writes Again so a second mark fills Difficult and the card is due soon', async () => {
    const repository = offlineRepository();
    await repository.introduceItems(USER, [{ id: 'hola' }]);
    await recordStillLearning(repository, USER, {
      itemId: 'hola',
      direction: 'es_to_ru',
      clientId: 'again-1',
      reviewedAt: '2026-06-01T00:00:00.000Z',
    });
    await recordStillLearning(repository, USER, {
      itemId: 'hola',
      direction: 'es_to_ru',
      clientId: 'again-2',
      reviewedAt: '2026-06-01T00:01:00.000Z',
    });

    const snapshot = await repository.read(USER);
    expect(snapshot.logs.map((log) => log.rating)).toEqual(['again', 'again']);
    const card = snapshot.cards.find((item) => item.itemId === 'hola');
    expect(card).toBeTruthy();
    if (!card) return;
    const dueIn = Date.parse(card.due) - Date.parse('2026-06-01T00:01:00.000Z');
    expect(dueIn).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    expect(cardIsHard(card) || dueIn <= 60 * 60 * 1000).toBe(true);
    expect(
      difficultItemIds(
        snapshot.logs.map((log) => ({
          itemId: log.itemId,
          rating: log.rating,
          reviewedAt: log.reviewedAt,
        })),
        new Date('2026-06-01T00:01:00.000Z'),
      ),
    ).toEqual(['hola']);
  });
});

describe('mastery', () => {
  it('sorts a folder into new, learning, and known', () => {
    expect(masteryBand({ introduced: false, state: null })).toBe('new');
    expect(masteryBand({ introduced: true, state: 0 })).toBe('new');
    expect(masteryBand({ introduced: true, state: 1 })).toBe('learning');
    expect(masteryBand({ introduced: true, state: 3 })).toBe('learning');
    expect(masteryBand({ introduced: true, state: 2 })).toBe('known');
    expect(
      masteryCounts([
        { introduced: false, state: null },
        { introduced: true, state: 1 },
        { introduced: true, state: 2 },
      ]),
    ).toEqual({ new: 1, learning: 1, known: 1 });
  });

  it('treats lapses, relearning, and a high difficulty as hard', () => {
    expect(cardIsHard({ difficulty: 0, lapses: 0, state: 0 })).toBe(false);
    expect(cardIsHard({ difficulty: 0, lapses: 1, state: 2 })).toBe(true);
    expect(cardIsHard({ difficulty: 1, lapses: 0, state: 3 })).toBe(true);
    expect(cardIsHard({ difficulty: 6, lapses: 0, state: 2 })).toBe(true);
  });
});

function offlineRepository() {
  return createReviewRepository({
    storage: memoryStorage(),
    network: {
      isOnline: async () => false,
      subscribe: () => () => undefined,
    },
    remote: silentRemote(),
    now: () => '2026-06-01T00:00:00.000Z',
    createId: sequence(),
  });
}

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

function silentRemote(): ReviewRemote {
  return {
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
}

function sequence(): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `id-${n}`;
  };
}
