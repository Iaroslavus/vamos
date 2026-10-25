/**
 * Synthesize normal-speed Spanish audio for units that do not have a clip yet,
 * upload it to the public Supabase Storage bucket `audio`, and store the object path.
 *
 * Keys stay in the environment and are never written to the repo:
 *   TTS_API_KEY, CONTENT_SUPABASE_URL, CONTENT_SUPABASE_KEY
 * Optional: TTS_API_URL, TTS_MODEL, TTS_VOICE
 *
 * Until a path is stored, the app speaks with the device TTS.
 */
import fs from 'fs';
import path from 'path';

import { z } from 'zod';

import { ItemSchema } from '../../src/features/content/schema';
import {
  DEFAULT_TTS_MODEL,
  DEFAULT_TTS_URL,
  DEFAULT_TTS_VOICE,
  applyAudioPaths,
  audioObjectPath,
  needsGeneratedAudio,
  speechRequest,
  storageUploadRequest,
} from '../../src/features/content/pipeline/tts';

async function main(): Promise<void> {
  const apiKey = requiredEnv('TTS_API_KEY');
  const supabaseUrl = requiredEnv('CONTENT_SUPABASE_URL');
  const storageKey = requiredEnv('CONTENT_SUPABASE_KEY');
  const apiUrl = process.env.TTS_API_URL?.trim() || DEFAULT_TTS_URL;
  const model = process.env.TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;
  const voice = process.env.TTS_VOICE?.trim() || DEFAULT_TTS_VOICE;

  const root = process.cwd();
  const files = walkItemFiles(path.join(root, 'content/items'));
  let written = 0;

  for (const file of files) {
    const raw: unknown = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    const items = z.array(ItemSchema).parse(raw);
    const updates = new Map<string, string>();

    for (const item of items) {
      if (!needsGeneratedAudio(item)) continue;
      const objectPath = audioObjectPath(item);
      const audio = await postBytes(
        speechRequest({ apiUrl, apiKey, model, voice, text: item.es }),
        apiKey,
      );
      const upload = storageUploadRequest({ supabaseUrl, apiKey: storageKey, objectPath });
      await putBytes(upload, audio, storageKey);
      updates.set(item.id, objectPath);
    }

    if (updates.size === 0) continue;
    fs.writeFileSync(file, `${JSON.stringify(applyAudioPaths(raw, updates), null, 2)}\n`);
    written += updates.size;
    console.log(`${path.relative(root, file)}: ${updates.size}`);
  }

  console.log(
    written === 0
      ? 'Нет единиц без аудио.'
      : `Записано путей: ${written}. Пока файла нет в Storage, приложение говорит TTS устройства.`,
  );
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim() ?? '';
  if (value) return value;
  throw new Error(`${name} не задан. Положите ключ в окружение, не в репозиторий и не в клиент.`);
}

async function postBytes(
  request: { url: string; headers: Record<string, string>; body?: string },
  secret: string,
): Promise<Uint8Array> {
  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: request.body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TTS API ${response.status}: ${redact(text, secret).slice(0, 300)}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function putBytes(
  request: { url: string; headers: Record<string, string> },
  body: Uint8Array,
  secret: string,
): Promise<void> {
  const payload = new ArrayBuffer(body.byteLength);
  new Uint8Array(payload).set(body);
  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: payload,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Storage ${response.status}: ${redact(text, secret).slice(0, 300)}`);
  }
}

function redact(text: string, secret: string): string {
  return secret ? text.split(secret).join('[redacted]') : text;
}

function walkItemFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkItemFiles(full));
    else if (entry.name.endsWith('.json')) found.push(full);
  }
  return found.sort();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'tts failed';
  console.error(message);
  process.exitCode = 1;
});
