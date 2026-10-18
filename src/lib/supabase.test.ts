import type { AppStateStatus } from 'react-native';

type SupabaseModule = typeof import('./supabase');

const mockCreateClient = jest.fn();
const mockStartAutoRefresh = jest.fn(() => Promise.resolve());
const mockStopAutoRefresh = jest.fn(() => Promise.resolve());
const mockAddEventListener = jest.fn(() => ({ remove: jest.fn() }));

jest.mock('@/lib/env', () => ({
  env: {
    EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_test',
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@supabase/supabase-js', () => ({
  processLock: 'process-lock',
  createClient: (...args: unknown[]) => {
    mockCreateClient(...args);
    return {
      auth: { startAutoRefresh: mockStartAutoRefresh, stopAutoRefresh: mockStopAutoRefresh },
    };
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: { addEventListener: mockAddEventListener },
}));

function loadSupabaseModule(): SupabaseModule {
  let loaded: SupabaseModule | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual<SupabaseModule>('./supabase');
  });
  if (!loaded) throw new Error('supabase module did not load');
  return loaded;
}

function capturedAppStateHandler(): (state: AppStateStatus) => void {
  const call = mockAddEventListener.mock.calls[0] as unknown as
    [string, (state: AppStateStatus) => void] | undefined;
  if (!call) throw new Error('AppState listener was not registered');
  return call[1];
}

describe('supabase client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the client with persisted session, auto refresh and AsyncStorage on native', () => {
    loadSupabaseModule();

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledWith('http://127.0.0.1:54321', 'sb_publishable_test', {
      auth: {
        // AsyncStorage (jest mock) — must expose the storage adapter API supabase-js expects.
        storage: expect.objectContaining({
          getItem: expect.any(Function),
          setItem: expect.any(Function),
          removeItem: expect.any(Function),
        }),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: 'process-lock',
      },
    });
  });

  it('starts auto refresh when the app becomes active and stops it otherwise', () => {
    loadSupabaseModule();

    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    const onChange = capturedAppStateHandler();

    onChange('active');
    expect(mockStartAutoRefresh).toHaveBeenCalledTimes(1);
    expect(mockStopAutoRefresh).not.toHaveBeenCalled();

    onChange('background');
    expect(mockStopAutoRefresh).toHaveBeenCalledTimes(1);

    onChange('inactive');
    expect(mockStopAutoRefresh).toHaveBeenCalledTimes(2);
    expect(mockStartAutoRefresh).toHaveBeenCalledTimes(1);
  });

  it('exposes handleAppStateChange for a custom client', () => {
    const { handleAppStateChange } = loadSupabaseModule();
    const start = jest.fn(() => Promise.resolve());
    const stop = jest.fn(() => Promise.resolve());
    const client = { auth: { startAutoRefresh: start, stopAutoRefresh: stop } };

    handleAppStateChange(client as never, 'active');
    handleAppStateChange(client as never, 'background');

    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
