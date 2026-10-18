type EnvModule = typeof import('./env');

const VALID = {
  EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_test',
};

function loadEnvModule(): EnvModule {
  let loaded: EnvModule | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual<EnvModule>('./env');
  });
  if (!loaded) throw new Error('env module did not load');
  return loaded;
}

describe('parseEnv', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = VALID.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = VALID.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('accepts a minimal valid config and drops empty optional values', () => {
    const { parseEnv } = loadEnvModule();

    const env = parseEnv({
      ...VALID,
      EXPO_PUBLIC_POSTHOG_KEY: '   ',
      EXPO_PUBLIC_SENTRY_DSN: 'https://abc@o1.ingest.sentry.io/1',
    });

    expect(env.EXPO_PUBLIC_SUPABASE_URL).toBe(VALID.EXPO_PUBLIC_SUPABASE_URL);
    expect(env.EXPO_PUBLIC_POSTHOG_KEY).toBeUndefined();
    expect(env.EXPO_PUBLIC_SENTRY_DSN).toBe('https://abc@o1.ingest.sentry.io/1');
  });

  it('lists every missing required variable in one readable error', () => {
    const { parseEnv, EnvError } = loadEnvModule();

    expect(() => parseEnv({})).toThrow(EnvError);
    expect(() => parseEnv({})).toThrow(/EXPO_PUBLIC_SUPABASE_URL — не задана/);
    expect(() => parseEnv({})).toThrow(/EXPO_PUBLIC_SUPABASE_ANON_KEY — не задана/);
    expect(() => parseEnv({})).toThrow(/\.env\.example/);
  });

  it('treats an empty string as a missing value', () => {
    const { parseEnv } = loadEnvModule();

    expect(() => parseEnv({ ...VALID, EXPO_PUBLIC_SUPABASE_ANON_KEY: '' })).toThrow(
      /EXPO_PUBLIC_SUPABASE_ANON_KEY — не задана/,
    );
  });

  it('rejects a malformed Supabase URL with a hint', () => {
    const { parseEnv } = loadEnvModule();

    expect(() => parseEnv({ ...VALID, EXPO_PUBLIC_SUPABASE_URL: 'localhost:54321' })).toThrow(
      /EXPO_PUBLIC_SUPABASE_URL — ожидается http\(s\) URL/,
    );
  });
});

describe('env (module init)', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('reads EXPO_PUBLIC_* from process.env on import', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = VALID.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = VALID.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const { env } = loadEnvModule();

    expect(env.EXPO_PUBLIC_SUPABASE_ANON_KEY).toBe(VALID.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  });

  it('fails fast on import when required variables are absent', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => loadEnvModule()).toThrow(/Неверная конфигурация окружения/);
  });
});
