import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import ProgressScreen from '../../../app/(tabs)/progress';
import { ProgressRepositoryContext } from '@/features/progress/context';
import type { ProgressRepository } from '@/features/progress/types';
import i18n from '@/i18n';

jest.mock('@/features/auth/useSession', () => ({
  useSession: () => ({
    status: 'ready',
    session: { user: { id: 'user-1', is_anonymous: true } },
  }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: {} },
}));

function repositoryReturning(
  data: Awaited<ReturnType<ProgressRepository['readProgress']>>,
): ProgressRepository {
  return {
    readProgress: jest.fn(async () => data),
    recordCompletion: jest.fn(),
    sync: jest.fn(),
    start: jest.fn(() => () => undefined),
    settled: jest.fn(async () => undefined),
  };
}

function renderScreen(repository: ProgressRepository) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <ProgressRepositoryContext.Provider value={repository}>
          <ProgressScreen />
        </ProgressRepositoryContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

async function flushQueryUpdates(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('ProgressScreen', () => {
  it('shows the stub before any lesson is stored', async () => {
    await renderScreen(repositoryReturning({ lessons: [], totalXp: 0, pending: 0 }));

    expect(
      await screen.findByText('Здесь появятся уровни A1–C2, навыки и тест в формате DELE.'),
    ).toBeTruthy();
    await flushQueryUpdates();
  });

  it('reads completed lessons, XP, and the pending queue', async () => {
    await renderScreen(
      repositoryReturning({
        lessons: [
          {
            lessonId: 'a1-u01-l01',
            status: 'completed',
            bestAccuracy: 80,
            completedAt: '2026-10-19T00:00:00.000Z',
          },
        ],
        totalXp: 30,
        pending: 2,
      }),
    );

    expect(await screen.findByText('Завершено уроков: 1. Опыт: 30.')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('Ждёт отправки: 2.')).toBeTruthy();
    });
    await flushQueryUpdates();
  });
});
