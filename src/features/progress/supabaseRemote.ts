import type { TypedSupabaseClient } from '@/lib/supabase';

import type { LessonProgress, ProgressRemote, RemoteXp, XpAward } from './types';

type LessonRow = {
  lesson_id: string;
  status: 'in_progress' | 'completed';
  best_accuracy: number | string | null;
  completed_at: string | null;
};

type XpRow = {
  id: number;
  amount: number;
  client_id: string | null;
  ref_id: string | null;
  created_at: string;
};

export function createSupabaseProgressRemote(client: TypedSupabaseClient): ProgressRemote {
  return {
    async fetchLessons(userId) {
      const { data, error } = await client
        .from('lesson_progress')
        .select('lesson_id, status, best_accuracy, completed_at')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map(mapLesson);
    },

    async fetchXp(userId) {
      const { data, error } = await client
        .from('xp_events')
        .select('id, amount, client_id, ref_id, created_at')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map(mapXp);
    },

    async saveLesson(_userId, lesson) {
      if (lesson.bestAccuracy == null || lesson.completedAt == null) {
        throw new Error('Completed lesson is missing accuracy or completed_at');
      }
      const { data, error } = await client.rpc('save_lesson_progress', {
        p_lesson_id: lesson.lessonId,
        p_best_accuracy: lesson.bestAccuracy,
        p_completed_at: lesson.completedAt,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('save_lesson_progress returned no row');
      return mapLesson(row);
    },

    async insertXp(userId, award) {
      const { error } = await client.from('xp_events').upsert(xpPayload(userId, award), {
        onConflict: 'user_id,client_id',
        ignoreDuplicates: true,
      });
      if (error) throw error;
    },
  };
}

function xpPayload(userId: string, award: XpAward) {
  return {
    user_id: userId,
    amount: award.amount,
    source: award.source ?? 'lesson',
    ref_id: award.lessonId,
    client_id: award.clientId,
  };
}

function mapLesson(row: LessonRow): LessonProgress {
  return {
    lessonId: row.lesson_id,
    status: row.status,
    bestAccuracy: asAccuracy(row.best_accuracy),
    completedAt: row.completed_at,
  };
}

function mapXp(row: XpRow): RemoteXp {
  return {
    serverId: String(row.id),
    clientId: row.client_id,
    lessonId: row.ref_id,
    amount: row.amount,
    createdAt: row.created_at,
  };
}

function asAccuracy(value: number | string | null): number | null {
  if (value == null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
