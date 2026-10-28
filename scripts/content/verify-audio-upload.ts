/**
 * Posts a tiny .m4a to the local audio bucket and expects Storage to accept audio/mp4.
 * The service role is read from `supabase status` and is never printed.
 */
import { execFileSync } from 'child_process';

import {
  audioUploadContentType,
  storageUploadRequest,
} from '../../src/features/content/pipeline/tts';

import { putStorageBytes } from './put-storage';

/** ftyp box, major brand M4A — the container neural TTS uploads after ffmpeg. */
const M4A = Uint8Array.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20, 0x00, 0x00, 0x00, 0x00,
  0x4d, 0x34, 0x41, 0x20, 0x6d, 0x70, 0x34, 0x32,
]);

async function main(): Promise<void> {
  const { url, key } = localApi();
  const objectPath = `items/_mime_probe/${Date.now()}.m4a`;
  const contentType = audioUploadContentType(objectPath);
  if (contentType !== 'audio/mp4') {
    throw new Error(`Для .m4a ожидался audio/mp4, получен ${contentType}.`);
  }

  const upload = storageUploadRequest({
    supabaseUrl: url,
    apiKey: key,
    objectPath,
  });
  if (upload.headers['Content-Type'] !== 'audio/mp4') {
    throw new Error(`Запрос ушёл с Content-Type ${upload.headers['Content-Type']}.`);
  }

  await putStorageBytes(upload, M4A, key);

  const remove = await fetch(upload.url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
  });
  if (!remove.ok) {
    const text = await remove.text();
    const safe = text.split(key).join('[redacted]');
    throw new Error(`Не удалось удалить пробу: ${remove.status} ${safe.slice(0, 200)}`);
  }
  console.log('local storage accepted .m4a as audio/mp4');
}

function localApi(): { url: string; key: string } {
  let output = '';
  try {
    output = execFileSync('supabase', ['status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'Не удалось прочитать supabase status. Запустите локальный стек: supabase start.',
    );
  }
  const env = parseEnv(output);
  const url = env.API_URL ?? '';
  const key = env.SERVICE_ROLE_KEY ?? '';
  if (!url || !key) {
    throw new Error(
      'Локальный supabase не отдал API_URL или ключ сервиса. Запустите supabase start.',
    );
  }
  return { url, key };
}

function parseEnv(output: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of output.split('\n')) {
    const trimmed = line.trim().replace(/^export\s+/, '');
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (/^[A-Z0-9_]+$/.test(name)) env[name] = value;
  }
  return env;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'audio upload check failed';
  console.error(message);
  process.exitCode = 1;
});
