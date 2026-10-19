import type { TypedSupabaseClient } from '@/lib/supabase';

import { createSupabaseProgressRemote } from './supabaseRemote';

function clientDouble() {
  const upsert = jest.fn().mockResolvedValue({ error: null });
  const rpc = jest.fn().mockResolvedValue({
    data: {
      lesson_id: 'a1-u01-l01',
      status: 'completed',
      best_accuracy: 95,
      completed_at: '2026-02-01T00:00:00Z',
      user_id: 'user-1',
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    },
    error: null,
  });
  const client = { from: () => ({ upsert }), rpc } as unknown as TypedSupabaseClient;
  return { client, upsert, rpc };
}

describe('createSupabaseProgressRemote', () => {
  it('saves a lesson through the best-accuracy function', async () => {
    const { client, rpc } = clientDouble();
    const remote = createSupabaseProgressRemote(client);

    const saved = await remote.saveLesson('user-1', {
      lessonId: 'a1-u01-l01',
      status: 'completed',
      bestAccuracy: 95,
      completedAt: '2026-02-01T00:00:00Z',
    });

    expect(rpc).toHaveBeenCalledWith('save_lesson_progress', {
      p_lesson_id: 'a1-u01-l01',
      p_best_accuracy: 95,
      p_completed_at: '2026-02-01T00:00:00Z',
    });
    expect(saved.bestAccuracy).toBe(95);
  });

  it('upserts XP on the client id so a retry does not create a second row', async () => {
    const { client, upsert } = clientDouble();
    const remote = createSupabaseProgressRemote(client);

    await remote.insertXp('user-1', {
      clientId: 'xp-1',
      lessonId: 'a1-u01-l01',
      amount: 10,
      createdAt: '2026-02-01T00:00:00Z',
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        amount: 10,
        source: 'lesson',
        ref_id: 'a1-u01-l01',
        client_id: 'xp-1',
      },
      { onConflict: 'user_id,client_id', ignoreDuplicates: true },
    );
  });
});
