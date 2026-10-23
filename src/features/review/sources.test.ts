import { createReviewRepository, reviewStorageKey } from './repository';
import {
  introduceCompletedLesson,
  itemsPracticed,
  recordKnownWordMistake,
  type VocabularyRef,
} from './sources';
import type { KeyValueStorage, NetworkMonitor, ReviewRemote, Scheduler, StoredCard } from './types';

const USER = '11111111-1111-1111-1111-111111111111';
const NOW = '2026-10-23T12:00:00.000Z';

const LEXICON: VocabularyRef[] = [
  { id: 'hola', es: 'hola', ru: 'привет' },
  { id: 'gracias', es: 'gracias', ru: 'спасибо' },
  { id: 'buenos-dias', es: 'buenos días', ru: 'доброе утро' },
];

type StoredLog = { itemId: string; direction: string; rating: string };

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

function setup() {
  const storage = memoryStorage();
  let online = false;
  const network: NetworkMonitor = {
    async isOnline() {
      return online;
    },
    subscribe() {
      return () => undefined;
    },
  };
  const remote: ReviewRemote = {
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
  };
  const schedule: Scheduler = () => () => undefined;
  let ids = 0;
  const repo = createReviewRepository({
    storage,
    network,
    remote,
    now: () => NOW,
    createId: () => `id-${(ids += 1)}`,
    schedule,
  });

  return {
    repo,
    storage,
    setOnline(next: boolean) {
      online = next;
    },
  };
}

async function logsOf(storage: KeyValueStorage): Promise<StoredLog[]> {
  const raw = await storage.getItem(reviewStorageKey(USER));
  if (!raw) return [];
  const parsed = JSON.parse(raw) as { logs: StoredLog[] };
  return parsed.logs;
}

function directions(cards: readonly StoredCard[]): string[] {
  return cards.map((card) => `${card.itemId}:${card.direction}`);
}

describe('new lesson words become recognition cards', () => {
  it('creates one recognition card per new word and no recall card yet', async () => {
    const { repo, storage } = setup();

    const snapshot = await introduceCompletedLesson(repo, USER, {
      status: 'completed',
      newItems: [{ id: 'hola' }, { id: 'hola' }, { id: 'gracias' }],
    });

    expect(directions(snapshot?.cards ?? [])).toEqual(['gracias:es_to_ru', 'hola:es_to_ru']);
    expect(snapshot?.cards.every((card) => card.reps === 0 && card.state === 0)).toBe(true);
    expect(snapshot?.dueCount).toBe(2);
    expect(await logsOf(storage)).toEqual([]);
  });

  it('does not duplicate or reset a card when the lesson is finished again', async () => {
    const { repo } = setup();
    await introduceCompletedLesson(repo, USER, {
      status: 'completed',
      newItems: [{ id: 'hola' }],
    });
    await repo.recordRating(USER, { itemId: 'hola', rating: 'good', clientId: 'rev-good' });
    const reviewed = await repo.read(USER);
    const recognition = reviewed.cards.find((card) => card.direction === 'es_to_ru');
    const recall = reviewed.cards.find((card) => card.direction === 'ru_to_es');

    await introduceCompletedLesson(repo, USER, {
      status: 'completed',
      newItems: [{ id: 'hola' }],
    });
    const again = await repo.read(USER);

    expect(again.cards.filter((card) => card.itemId === 'hola')).toHaveLength(2);
    expect(again.cards.find((card) => card.direction === 'es_to_ru')).toMatchObject({
      id: recognition?.id,
      reps: recognition?.reps,
      due: recognition?.due,
    });
    expect(again.cards.find((card) => card.direction === 'ru_to_es')).toMatchObject({
      id: recall?.id,
      reps: 0,
      due: recall?.due,
    });
  });

  it('does not create cards when the lesson fails or has no new words', async () => {
    const introduceItems = jest.fn();
    const repository = { introduceItems };

    await expect(
      introduceCompletedLesson(repository, USER, {
        status: 'failed',
        newItems: [{ id: 'hola' }],
      }),
    ).resolves.toBeNull();
    await expect(
      introduceCompletedLesson(repository, USER, { status: 'completed', newItems: [] }),
    ).resolves.toBeNull();

    expect(introduceItems).not.toHaveBeenCalled();
  });
});

describe('a mistake on a known word is Again', () => {
  it('rates the recognition card Again and does not open recall', async () => {
    const { repo, storage } = setup();
    await repo.introduceItems(USER, [{ id: 'hola' }]);

    await recordKnownWordMistake(
      repo,
      USER,
      'wrong',
      { type: 'select_translation', prompt: 'Hola', answer: 'привет' },
      LEXICON,
    );

    const snapshot = await repo.read(USER);
    expect(directions(snapshot.cards)).toEqual(['hola:es_to_ru']);
    expect(snapshot.cards[0]?.reps).toBe(1);
    expect(await logsOf(storage)).toEqual([
      expect.objectContaining({ itemId: 'hola', direction: 'es_to_ru', rating: 'again' }),
    ]);
  });

  it('does not create a card for a word the learner has not studied', async () => {
    const { repo, storage } = setup();

    await recordKnownWordMistake(
      repo,
      USER,
      'wrong',
      { type: 'select_translation', prompt: 'gracias', answer: 'спасибо' },
      LEXICON,
    );

    expect((await repo.read(USER)).cards).toEqual([]);
    expect(await logsOf(storage)).toEqual([]);
  });

  it('ignores a correct or almost-correct answer', async () => {
    const { repo, storage } = setup();
    await repo.introduceItems(USER, [{ id: 'hola' }]);
    const exercise = { type: 'select_translation', prompt: 'hola', answer: 'привет' };

    await recordKnownWordMistake(repo, USER, 'correct', exercise, LEXICON);
    await recordKnownWordMistake(repo, USER, 'almost', exercise, LEXICON);

    expect((await repo.read(USER)).cards[0]?.reps).toBe(0);
    expect(await logsOf(storage)).toEqual([]);
  });

  it('rates each known word in a matching exercise and skips the unknown one', async () => {
    const { repo, storage } = setup();
    await repo.introduceItems(USER, [{ id: 'hola' }]);

    await recordKnownWordMistake(
      repo,
      USER,
      'wrong',
      {
        type: 'match_pairs',
        answer: 'pairs',
        pairs: [
          { left: 'hola', right: 'привет' },
          { left: 'gracias', right: 'спасибо' },
        ],
      },
      LEXICON,
    );

    expect(directions((await repo.read(USER)).cards)).toEqual(['hola:es_to_ru']);
    expect(await logsOf(storage)).toEqual([
      expect.objectContaining({ itemId: 'hola', direction: 'es_to_ru', rating: 'again' }),
    ]);
  });

  it('applies a production mistake to recognition until recall is open', async () => {
    const { repo, storage } = setup();
    await repo.introduceItems(USER, [{ id: 'buenos-dias' }]);

    expect(itemsPracticed({ type: 'build_sentence', answer: 'Buenos días' }, LEXICON)).toEqual([
      { itemId: 'buenos-dias', direction: 'ru_to_es' },
    ]);

    await recordKnownWordMistake(
      repo,
      USER,
      'wrong',
      { type: 'build_sentence', answer: 'Buenos días' },
      LEXICON,
    );

    expect(directions((await repo.read(USER)).cards)).toEqual(['buenos-dias:es_to_ru']);
    expect(await logsOf(storage)).toEqual([
      expect.objectContaining({
        itemId: 'buenos-dias',
        direction: 'es_to_ru',
        rating: 'again',
      }),
    ]);
  });

  it('rates the recall card once that direction is open', async () => {
    const { repo, storage } = setup();
    await repo.introduceItems(USER, [{ id: 'gracias' }]);
    await repo.recordRating(USER, { itemId: 'gracias', rating: 'good', clientId: 'open-recall' });
    const before = await repo.read(USER);
    const recognition = before.cards.find((card) => card.direction === 'es_to_ru');

    await recordKnownWordMistake(
      repo,
      USER,
      'wrong',
      {
        type: 'type_translation',
        prompt: 'спасибо',
        answer: 'gracias',
        direction: 'ru_to_es',
      },
      LEXICON,
    );

    const after = await repo.read(USER);
    expect(after.cards.find((card) => card.direction === 'es_to_ru')).toMatchObject({
      reps: recognition?.reps,
      due: recognition?.due,
    });
    expect(after.cards.find((card) => card.direction === 'ru_to_es')?.reps).toBe(1);
    expect(await logsOf(storage)).toEqual([
      expect.objectContaining({ direction: 'es_to_ru', rating: 'good' }),
      expect.objectContaining({ direction: 'ru_to_es', rating: 'again' }),
    ]);
  });
});

describe('recall opens after the first successful recognition', () => {
  it('stays closed when recognition is rated Again', async () => {
    const { repo } = setup();
    await repo.introduceItems(USER, [{ id: 'hola' }]);

    await repo.recordRating(USER, { itemId: 'hola', rating: 'again', clientId: 'miss' });

    expect(directions((await repo.read(USER)).cards)).toEqual(['hola:es_to_ru']);
  });

  it.each(['hard', 'good', 'easy'] as const)(
    'opens one recall card after the first %s',
    async (rating) => {
      const { repo } = setup();
      await repo.introduceItems(USER, [{ id: 'hola' }]);

      await repo.recordRating(USER, { itemId: 'hola', rating, clientId: 'pass' });
      const opened = await repo.read(USER);
      expect(directions(opened.cards)).toEqual(['hola:es_to_ru', 'hola:ru_to_es']);
      expect(opened.cards.find((card) => card.direction === 'ru_to_es')).toMatchObject({
        reps: 0,
        state: 0,
        due: NOW,
      });

      await repo.recordRating(USER, { itemId: 'hola', rating: 'good', clientId: 'pass-again' });

      expect(directions((await repo.read(USER)).cards)).toEqual(['hola:es_to_ru', 'hola:ru_to_es']);
    },
  );

  it('does not reset recall when recognition succeeds again', async () => {
    const { repo } = setup();
    await repo.introduceItems(USER, [{ id: 'hola' }]);
    await repo.recordRating(USER, { itemId: 'hola', rating: 'good', clientId: 'open' });
    await repo.recordRating(USER, {
      itemId: 'hola',
      direction: 'ru_to_es',
      rating: 'good',
      clientId: 'recall-good',
    });
    const recall = (await repo.read(USER)).cards.find((card) => card.direction === 'ru_to_es');

    await repo.recordRating(USER, {
      itemId: 'hola',
      rating: 'easy',
      clientId: 'recognition-again',
    });
    const after = await repo.read(USER);

    expect(after.cards.filter((card) => card.direction === 'ru_to_es')).toHaveLength(1);
    expect(after.cards.find((card) => card.direction === 'ru_to_es')).toMatchObject({
      id: recall?.id,
      reps: recall?.reps,
      due: recall?.due,
    });
  });
});

describe('itemsPracticed', () => {
  it('tells recognition from recall and ignores a sentence that only contains the word', () => {
    expect(
      itemsPracticed({ type: 'select_translation', prompt: 'hola', answer: 'привет' }, LEXICON),
    ).toEqual([{ itemId: 'hola', direction: 'es_to_ru' }]);
    expect(
      itemsPracticed(
        {
          type: 'type_translation',
          prompt: 'спасибо',
          answer: 'gracias',
          direction: 'ru_to_es',
        },
        LEXICON,
      ),
    ).toEqual([{ itemId: 'gracias', direction: 'ru_to_es' }]);
    expect(itemsPracticed({ type: 'listen_select', answer: 'Hola' }, LEXICON)).toEqual([
      { itemId: 'hola', direction: 'es_to_ru' },
    ]);
    expect(
      itemsPracticed({ type: 'build_sentence', answer: 'Me llamo Ana' }, [
        { id: 'me-llamo', es: 'me llamo', ru: 'меня зовут' },
      ]),
    ).toEqual([]);
  });

  it('keeps the word when both sides agree and skips an ambiguous prompt', () => {
    const shared = [
      { id: 'hola', es: 'hola', ru: 'привет' },
      { id: 'hello', es: 'hello', ru: 'привет' },
    ];

    expect(
      itemsPracticed({ type: 'select_translation', prompt: 'привет', answer: 'hola' }, shared),
    ).toEqual([{ itemId: 'hola', direction: 'ru_to_es' }]);
    expect(
      itemsPracticed(
        { type: 'select_translation', prompt: 'привет', answer: 'неизвестно' },
        shared,
      ),
    ).toEqual([]);
  });

  it('reads a card that was stored before directions existed as recognition', async () => {
    const { repo, storage } = setup();
    await storage.setItem(
      reviewStorageKey(USER),
      JSON.stringify({
        version: 1,
        cards: {
          hola: {
            id: 'card-old',
            itemId: 'hola',
            due: NOW,
            stability: 1,
            difficulty: 5,
            elapsedDays: 0,
            scheduledDays: 0,
            learningSteps: 0,
            reps: 2,
            lapses: 0,
            state: 2,
            lastReview: '2026-10-20T12:00:00.000Z',
          },
        },
        logs: [],
        outbox: [],
      }),
    );

    const snapshot = await repo.read(USER);

    expect(snapshot.cards).toEqual([
      expect.objectContaining({ id: 'card-old', itemId: 'hola', direction: 'es_to_ru', reps: 2 }),
    ]);
    await repo.introduceItems(USER, [{ id: 'hola' }]);
    expect((await repo.read(USER)).cards).toHaveLength(1);
  });
});
