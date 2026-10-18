import { z } from 'zod';

/**
 * Public runtime configuration (only `EXPO_PUBLIC_*` — these values are inlined into the app
 * bundle, so no secrets belong here).
 *
 * Expo replaces `process.env.EXPO_PUBLIC_*` at build time only when the key is a literal, so each
 * variable is listed explicitly instead of iterating over `process.env`.
 */

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

export const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.preprocess(
    emptyToUndefined,
    z.url({
      protocol: /^https?$/,
      error: 'ожидается http(s) URL, например http://127.0.0.1:54321',
    }),
  ),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(emptyToUndefined, z.string().trim().min(1)),
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: optionalString,
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: optionalString,
  EXPO_PUBLIC_POSTHOG_KEY: optionalString,
  EXPO_PUBLIC_SENTRY_DSN: optionalString,
});

export type Env = z.infer<typeof envSchema>;
export type RawEnv = Partial<Record<keyof Env, string | undefined>>;

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvError';
  }
}

function describeIssue(issue: z.core.$ZodIssue): string {
  const key = String(issue.path[0] ?? '?');
  const reason =
    issue.code === 'invalid_type' && issue.input === undefined ? 'не задана' : issue.message;
  return `  • ${key} — ${reason}`;
}

export function formatEnvError(error: z.ZodError): string {
  return [
    'Неверная конфигурация окружения (.env / .env.local):',
    ...error.issues.map(describeIssue),
    '',
    'Скопируйте .env.example в .env.local и заполните значения.',
    'Для локального Supabase: `supabase start`, затем `supabase status -o env`.',
    'Подробнее: README.md → «Локальный бэкенд».',
  ].join('\n');
}

export function parseEnv(raw: RawEnv): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new EnvError(formatEnvError(result.error));
  }
  return result.data;
}

export const env: Env = parseEnv({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
});
