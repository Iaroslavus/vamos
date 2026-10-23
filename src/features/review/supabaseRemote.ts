import type { Tables, TablesInsert } from '@/lib/database.types';
import type { TypedSupabaseClient } from '@/lib/supabase';

import { ratingFromValue, ratingToValue } from './fsrs';
import type { ReviewLog, ReviewRemote, StoredCard } from './types';

type CardRow = Tables<'review_cards'>;
type LogRow = Pick<
  Tables<'review_logs'>,
  'client_id' | 'card_id' | 'rating' | 'reviewed_at' | 'elapsed_days' | 'scheduled_days' | 'state'
>;

export function createSupabaseReviewRemote(client: TypedSupabaseClient): ReviewRemote {
  return {
    async fetchCards(userId) {
      const { data, error } = await client.from('review_cards').select('*').eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map(mapCard);
    },

    async fetchLogs(userId) {
      const { data, error } = await client
        .from('review_logs')
        .select('client_id, card_id, rating, reviewed_at, elapsed_days, scheduled_days, state')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map(mapLog);
    },

    async upsertCard(userId, card) {
      const existing = await readCard(client, userId, card.itemId);
      if (existing && reviewTime(existing.last_review) > reviewTime(card.lastReview)) {
        return mapCard(existing);
      }

      const { data, error } = await client
        .from('review_cards')
        .upsert(cardPayload(userId, { ...card, id: existing?.id ?? card.id }), {
          onConflict: 'user_id,item_id',
        })
        .select('*')
        .single();
      if (error) throw error;
      return mapCard(data);
    },

    async insertLog(userId, log) {
      const { error } = await client.from('review_logs').upsert(logPayload(userId, log), {
        onConflict: 'user_id,client_id',
        ignoreDuplicates: true,
      });
      if (error) throw error;
    },
  };
}

async function readCard(
  client: TypedSupabaseClient,
  userId: string,
  itemId: string,
): Promise<CardRow | null> {
  const { data, error } = await client
    .from('review_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function cardPayload(userId: string, card: StoredCard): TablesInsert<'review_cards'> {
  return {
    id: card.id,
    user_id: userId,
    item_id: card.itemId,
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: asInt(card.elapsedDays),
    scheduled_days: asInt(card.scheduledDays),
    learning_steps: asInt(card.learningSteps),
    reps: asInt(card.reps),
    lapses: asInt(card.lapses),
    state: asInt(card.state),
    last_review: card.lastReview,
  };
}

function logPayload(userId: string, log: ReviewLog): TablesInsert<'review_logs'> {
  return {
    user_id: userId,
    card_id: log.cardId,
    rating: ratingToValue(log.rating),
    reviewed_at: log.reviewedAt,
    elapsed_days: asInt(log.elapsedDays),
    scheduled_days: asInt(log.scheduledDays),
    state: asInt(log.state),
    client_id: log.clientId,
  };
}

function mapCard(row: CardRow): StoredCard {
  return {
    id: row.id,
    itemId: row.item_id,
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
    learningSteps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    lastReview: row.last_review,
  };
}

function mapLog(row: LogRow): ReviewLog {
  return {
    clientId: row.client_id,
    cardId: row.card_id,
    rating: ratingFromValue(row.rating),
    reviewedAt: row.reviewed_at,
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
    state: row.state,
  };
}

function asInt(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new Error('Invalid review number');
  return Math.round(value);
}

function reviewTime(value: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}
