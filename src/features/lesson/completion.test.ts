import type { ProgressSnapshot } from '@/features/progress/types';

import { saveLessonCompletion, toCompletionAccuracy, type CompletionWriter } from './completion';

const snapshot: ProgressSnapshot = {
  lessons: [
    {
      lessonId: 'a1-u01-l01',
      status: 'completed',
      bestAccuracy: 80,
      completedAt: '2026-10-19T00:00:00.000Z',
    },
  ],
  totalXp: 18,
  pending: 0,
};

function writer(): { repository: CompletionWriter; recordCompletion: jest.Mock } {
  const recordCompletion = jest.fn().mockResolvedValue(snapshot);
  return { repository: { recordCompletion }, recordCompletion };
}

describe('toCompletionAccuracy', () => {
  it('converts a 0–1 ratio to a 0–100 percent', () => {
    expect(toCompletionAccuracy(0)).toBe(0);
    expect(toCompletionAccuracy(1)).toBe(100);
    expect(toCompletionAccuracy(0.805)).toBe(80.5);
    expect(toCompletionAccuracy(2 / 3)).toBe(66.67);
  });

  it('clamps out-of-range and non-finite ratios', () => {
    expect(toCompletionAccuracy(1.4)).toBe(100);
    expect(toCompletionAccuracy(-0.2)).toBe(0);
    expect(toCompletionAccuracy(Number.NaN)).toBe(0);
  });
});

describe('saveLessonCompletion', () => {
  it('records a completed lesson through the progress repository', async () => {
    const { repository, recordCompletion } = writer();

    const saved = await saveLessonCompletion(repository, 'user-1', {
      status: 'completed',
      lessonId: 'a1-u01-l01',
      accuracy: 0.8,
      xpEarned: 18,
    });

    expect(saved).toBe(snapshot);
    expect(recordCompletion).toHaveBeenCalledWith('user-1', {
      lessonId: 'a1-u01-l01',
      accuracy: 80,
      xp: 18,
    });
  });

  it('does not record a failed or unfinished session', async () => {
    const { repository, recordCompletion } = writer();

    await expect(
      saveLessonCompletion(repository, 'user-1', {
        status: 'failed',
        lessonId: 'a1-u01-l01',
        accuracy: 0.2,
        xpEarned: 4,
      }),
    ).resolves.toBeNull();

    await expect(
      saveLessonCompletion(repository, 'user-1', {
        status: 'completed',
        lessonId: null,
        accuracy: 1,
        xpEarned: 10,
      }),
    ).resolves.toBeNull();

    expect(recordCompletion).not.toHaveBeenCalled();
  });
});
