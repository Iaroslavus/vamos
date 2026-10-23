import type { TypedSupabaseClient } from '@/lib/supabase';

import { createSupabaseReviewRemote } from './supabaseRemote';
import type { StoredCard } from './types';

const CARD: StoredCard = {
  id: 'card-1',
  itemId: 'hola',
  direction: 'es_to_ru',
  due: '2026-10-23T12:10:00.000Z',
  stability: 2.3,
  difficulty: 5,
  elapsedDays: 0,
  scheduledDays: 0,
  learningSteps: 1,
  reps: 1,
  lapses: 0,
  state: 1,
  lastReview: '2026-10-23T12:00:00.000Z',
};

function cardRow(overrides: Partial<StoredCard> = {}) {
  const card = { ...CARD, ...overrides };
  return {
    id: card.id,
    user_id: 'user-1',
    item_id: card.itemId,
    direction: card.direction,
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.lastReview,
    created_at: '2026-10-23T12:00:00.000Z',
    updated_at: '2026-10-23T12:00:00.000Z',
  };
}

function clientDouble(existing: ReturnType<typeof cardRow> | null) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: existing, error: null });
  const readChain = { eq: jest.fn(), maybeSingle };
  readChain.eq.mockReturnValue(readChain);
  const select = jest.fn(() => readChain);
  const single = jest.fn().mockResolvedValue({ data: existing ?? cardRow(), error: null });
  const upsertCard = jest.fn(() => ({ select: () => ({ single }) }));
  const upsertLog = jest.fn().mockResolvedValue({ error: null });
  const client = {
    from(table: string) {
      if (table === 'review_logs') return { upsert: upsertLog };
      return { select, upsert: upsertCard };
    },
  } as unknown as TypedSupabaseClient;
  return { client, upsertCard, upsertLog };
}

describe('createSupabaseReviewRemote', () => {
  it('upserts the card on user, item, and direction', async () => {
    const { client, upsertCard } = clientDouble(null);
    const remote = createSupabaseReviewRemote(client);

    const saved = await remote.upsertCard('user-1', CARD);

    expect(upsertCard).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        item_id: 'hola',
        direction: 'es_to_ru',
        id: 'card-1',
        reps: 1,
      }),
      { onConflict: 'user_id,item_id,direction' },
    );
    expect(saved.itemId).toBe('hola');
    expect(saved.reps).toBe(1);
  });

  it('keeps a newer card already stored for that item', async () => {
    const newer = cardRow({
      id: 'server-card',
      lastReview: '2026-10-24T12:00:00.000Z',
      reps: 4,
    });
    const { client, upsertCard } = clientDouble(newer);
    const remote = createSupabaseReviewRemote(client);

    const saved = await remote.upsertCard('user-1', CARD);

    expect(upsertCard).not.toHaveBeenCalled();
    expect(saved).toMatchObject({ id: 'server-card', reps: 4 });
  });

  it('upserts a review log on the client id so a retry does not create a second row', async () => {
    const { client, upsertLog } = clientDouble(null);
    const remote = createSupabaseReviewRemote(client);

    await remote.insertLog('user-1', {
      clientId: 'rev-1',
      cardId: 'card-1',
      rating: 'good',
      reviewedAt: '2026-10-23T12:00:00.000Z',
      elapsedDays: 0,
      scheduledDays: 0,
      state: 0,
    });

    expect(upsertLog).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        card_id: 'card-1',
        rating: 3,
        reviewed_at: '2026-10-23T12:00:00.000Z',
        elapsed_days: 0,
        scheduled_days: 0,
        state: 0,
        client_id: 'rev-1',
      },
      { onConflict: 'user_id,client_id', ignoreDuplicates: true },
    );
  });
});
